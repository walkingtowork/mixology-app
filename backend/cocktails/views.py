from rest_framework import viewsets, filters, generics, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Count, Max, Min
from django.utils.cache import patch_cache_control


class PublicCacheMixin:
    """Mark successful reads as publicly cacheable for a short time.

    Only for anonymous responses keyed by an unguessable URL. Once the proxy puts a CDN in
    front of the API, `public` on anything per-user is how one user gets served another's
    data, so this must never go back on the recipe, ingredient or category viewsets.

    No stale-while-revalidate: a last-minute fix to a party menu should reach guests'
    phones within seconds, not after a stale copy has been served for minutes.
    """
    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if request.method in ('GET', 'HEAD') and response.status_code == 200:
            patch_cache_control(response, max_age=30, public=True)
        return response

from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Ingredient, Recipe, IngredientCategory, RecipeIngredient, Menu, MenuItem, BuyListItem, Order
from .serializers import (
    IngredientSerializer, RecipeSerializer, IngredientCategorySerializer,
    MenuSerializer, MenuListSerializer, MenuItemSerializer,
    BuyListItemSerializer, OrderSerializer, GuestOrderSerializer,
)


class OwnerScopedMixin:
    """Every row a viewset can see or create belongs to the signed-in user.

    Scoping `get_queryset` makes another user's object a 404 for read, update and delete
    alike, since `get_object` looks it up in the same queryset. It does NOT cover ids that
    arrive in a request body: those are checked by `OwnedPrimaryKeyRelatedField` in the
    serializers.
    """

    def get_queryset(self):
        return super().get_queryset().filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class IngredientViewSet(OwnerScopedMixin, viewsets.ModelViewSet):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']

    @action(detail=True, methods=['get'], url_path='recipes')
    def recipes(self, request, pk=None):
        ingredient = self.get_object()
        recipes = Recipe.objects.filter(owner=request.user, ingredients=ingredient).prefetch_related('recipe_ingredients__ingredient')
        serializer = RecipeSerializer(recipes, many=True)
        return Response(serializer.data)


class RecipeViewSet(OwnerScopedMixin, viewsets.ModelViewSet):
    queryset = Recipe.objects.prefetch_related('recipe_ingredients__ingredient').all()
    serializer_class = RecipeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'notes', 'garnish']
    ordering_fields = ['name']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        ingredient_id = self.request.query_params.get('ingredient')
        category_id = self.request.query_params.get('category')
        # Both ids are looked up among the requester's own rows, so someone else's id
        # matches nothing rather than filtering by an ingredient the requester cannot see.
        owned_ingredients = Ingredient.objects.filter(owner=self.request.user)
        if ingredient_id:
            queryset = queryset.filter(
                ingredients__in=owned_ingredients.filter(id=ingredient_id)
            ).distinct()
        if category_id:
            category_ingredients = owned_ingredients.filter(category_id=category_id)
            queryset = queryset.filter(ingredients__in=category_ingredients).distinct()
        return queryset


class IngredientCategoryViewSet(OwnerScopedMixin, viewsets.ModelViewSet):
    queryset = IngredientCategory.objects.prefetch_related('ingredients').all()
    serializer_class = IngredientCategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'notes']
    ordering_fields = ['name']
    ordering = ['name']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        create_generic = request.data.get('create_generic_ingredient', True)
        category = serializer.save(owner=request.user)
        if create_generic:
            existing = Ingredient.objects.filter(owner=request.user, name=category.name).first()
            if existing:
                if existing.category is None:
                    existing.category = category
                    existing.is_generic = True
                    existing.save()
            else:
                Ingredient.objects.create(
                    owner=request.user, name=category.name, category=category, is_generic=True,
                )
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if 'name' in request.data:
            generic = Ingredient.objects.filter(
                owner=request.user, category=instance, is_generic=True,
            ).first()
            if generic:
                generic.name = request.data['name']
                generic.save()
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def ingredients(self, request, pk=None):
        category = self.get_object()
        serializer = IngredientSerializer(
            Ingredient.objects.filter(owner=request.user, category=category), many=True,
        )
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        ingredients_in_category = Ingredient.objects.filter(category=instance)
        if RecipeIngredient.objects.filter(ingredient__in=ingredients_in_category).exists():
            return Response(
                {'detail': f"Cannot delete category '{instance.name}' because it is used in one or more recipes."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class MenuViewSet(OwnerScopedMixin, viewsets.ModelViewSet):
    queryset = Menu.objects.prefetch_related('items__recipe__recipe_ingredients__ingredient').all()

    def get_serializer_class(self):
        if self.action == 'list':
            return MenuListSerializer
        return MenuSerializer

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        menu = self.get_object()
        menu.is_active = True
        menu.is_published = True
        menu.save()
        return Response(MenuSerializer(menu).data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """All-time order counts for one menu.

        Starts from the menu's own items so drinks nobody ordered still appear —
        aggregating over Order alone can only ever return drinks somebody ordered.
        Orders also outlive menu membership: pull a drink off a menu after a party
        and its orders still exist and still point here, so those are folded back in
        flagged `on_menu: False`, otherwise the totals wouldn't reconcile.

        Guest names are self-entered and grouped exactly as typed, so two guests who
        both type "Sam" count as one.
        """
        menu = self.get_object()
        orders = Order.objects.filter(menu=menu)

        counts = {
            row['recipe_id']: row['count']
            for row in orders.values('recipe_id').annotate(count=Count('id'))
        }

        names = {}
        drinks = []
        for item in menu.items.select_related('recipe'):
            names[item.recipe_id] = item.recipe.name
            drinks.append({
                'recipe_id': item.recipe_id,
                'name': item.recipe.name,
                'count': counts.get(item.recipe_id, 0),
                'on_menu': True,
            })

        for recipe in Recipe.objects.filter(owner=request.user, id__in=set(counts) - set(names)):
            names[recipe.id] = recipe.name
            drinks.append({
                'recipe_id': recipe.id,
                'name': recipe.name,
                'count': counts[recipe.id],
                'on_menu': False,
            })

        # Count descending, then alphabetical so ties don't reshuffle between loads
        drinks.sort(key=lambda d: (-d['count'], d['name']))

        by_guest = {}
        for row in orders.values('guest_name', 'recipe_id').annotate(count=Count('id')):
            guest = by_guest.setdefault(
                row['guest_name'],
                {'name': row['guest_name'], 'count': 0, 'drinks': []},
            )
            guest['count'] += row['count']
            guest['drinks'].append({
                'name': names.get(row['recipe_id'], 'Unknown'),
                'count': row['count'],
            })

        guests = sorted(by_guest.values(), key=lambda g: (-g['count'], g['name']))
        for guest in guests:
            guest['drinks'].sort(key=lambda d: (-d['count'], d['name']))

        span = orders.aggregate(first=Min('created_at'), last=Max('created_at'))

        return Response({
            'menu_id': menu.id,
            'menu_name': menu.name,
            'total_orders': sum(counts.values()),
            'unique_guests': len(by_guest),
            'first_order_at': span['first'],
            'last_order_at': span['last'],
            'drinks': drinks,
            'guests': guests,
        })

    @action(detail=True, methods=['post'], url_path='add-item')
    def add_item(self, request, pk=None):
        menu = self.get_object()
        serializer = MenuItemSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        max_order = menu.items.aggregate(Max('order'))['order__max'] or 0
        try:
            serializer.save(menu=menu, order=max_order + 1)
        except Exception:
            return Response(
                {'detail': 'This recipe is already on the menu.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Re-fetch to get fresh prefetch cache including the new item
        menu = self.get_object()
        return Response(MenuSerializer(menu).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='reorder-items')
    def reorder_items(self, request, pk=None):
        menu = self.get_object()
        for item_data in request.data:
            menu.items.filter(pk=item_data['id']).update(order=item_data['order'])
        return Response(MenuSerializer(menu).data)


class MenuItemViewSet(viewsets.GenericViewSet):
    queryset = MenuItem.objects.all()
    serializer_class = MenuItemSerializer

    def get_queryset(self):
        # A menu item has no owner of its own; it belongs to whoever owns its menu.
        return super().get_queryset().filter(menu__owner=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicMenuView(PublicCacheMixin, generics.RetrieveAPIView):
    queryset = Menu.objects.prefetch_related('items__recipe__recipe_ingredients__ingredient').all()
    serializer_class = MenuSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    lookup_field = 'share_token'


class OrderViewSet(viewsets.ModelViewSet):
    """The bartender's side of ordering: the signed-in owner's orders, to fulfil or cancel.

    Guests never come here -- they place and cancel orders through the share-token URLs
    below. There is no POST: an order only ever starts from a shared menu.
    """
    queryset = Order.objects.select_related('recipe').prefetch_related(
        'recipe__recipe_ingredients__ingredient'
    ).all()
    serializer_class = OrderSerializer
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        # An order has no owner of its own; it belongs to whoever owns its menu.
        queryset = super().get_queryset().filter(menu__owner=self.request.user)
        today = self.request.query_params.get('today')
        fulfilled = self.request.query_params.get('fulfilled')
        if today == 'true':
            queryset = queryset.filter(created_at__date=timezone.now().date())
        if fulfilled is not None:
            queryset = queryset.filter(is_fulfilled=fulfilled.lower() == 'true')
        return queryset


class GuestOrderMixin:
    """Guest ordering, authorised by the menu's share token in the URL rather than a session.

    A guest is only a self-typed name, so "your own orders" means "orders on this menu under
    the name you sent". That keeps a guest from walking order ids, not from impersonating
    another guest whose name they know -- accepted for a party.

    Never add PublicCacheMixin here: these responses are per-guest.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = GuestOrderSerializer

    def get_menu(self):
        if not hasattr(self, '_menu'):
            self._menu = get_object_or_404(Menu, share_token=self.kwargs['share_token'])
        return self._menu

    def get_queryset(self):
        return Order.objects.select_related('recipe').prefetch_related(
            'recipe__recipe_ingredients__ingredient'
        ).filter(
            menu=self.get_menu(),
            guest_name=self.request.query_params.get('guest_name', ''),
        )

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'menu': self.get_menu()}


class GuestOrderListView(GuestOrderMixin, generics.ListCreateAPIView):
    def perform_create(self, serializer):
        menu = self.get_menu()
        # Any menu can be previewed by its share link; only the active one takes orders.
        if not menu.is_active:
            raise PermissionDenied("This menu isn't taking orders right now.")
        serializer.save(menu=menu)


class GuestOrderDetailView(GuestOrderMixin, generics.DestroyAPIView):
    def perform_destroy(self, instance):
        if instance.is_fulfilled:
            raise PermissionDenied('This drink has already been served.')
        instance.delete()


class BuyListViewSet(OwnerScopedMixin, viewsets.ModelViewSet):
    queryset = BuyListItem.objects.select_related('ingredient__category').all()
    serializer_class = BuyListItemSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def create(self, request, *args, **kwargs):
        ingredient_id = request.data.get('ingredient_id')
        existing = self.get_queryset().filter(ingredient_id=ingredient_id).first()
        if existing:
            return Response(BuyListItemSerializer(existing).data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)
