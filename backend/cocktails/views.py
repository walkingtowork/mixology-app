from rest_framework import viewsets, filters, generics, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Max
from django.utils.cache import patch_cache_control


class CacheReadsMixin:
    """Add browser cache headers to safe (read-only) responses."""
    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if request.method in ('GET', 'HEAD') and response.status_code == 200:
            patch_cache_control(response, max_age=60, stale_while_revalidate=300, public=True)
        return response

from .models import Ingredient, Recipe, IngredientCategory, RecipeIngredient, Menu, MenuItem, BuyListItem
from .serializers import (
    IngredientSerializer, RecipeSerializer, IngredientCategorySerializer,
    MenuSerializer, MenuListSerializer, MenuItemSerializer,
    BuyListItemSerializer,
)


class IngredientViewSet(CacheReadsMixin, viewsets.ModelViewSet):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']

    @action(detail=True, methods=['get'], url_path='recipes')
    def recipes(self, request, pk=None):
        ingredient = self.get_object()
        recipes = Recipe.objects.filter(ingredients=ingredient).prefetch_related('recipe_ingredients__ingredient')
        serializer = RecipeSerializer(recipes, many=True)
        return Response(serializer.data)


class RecipeViewSet(CacheReadsMixin, viewsets.ModelViewSet):
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
        if ingredient_id:
            queryset = queryset.filter(ingredients__id=ingredient_id).distinct()
        if category_id:
            category_ingredients = Ingredient.objects.filter(category_id=category_id)
            queryset = queryset.filter(ingredients__in=category_ingredients).distinct()
        return queryset


class IngredientCategoryViewSet(CacheReadsMixin, viewsets.ModelViewSet):
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
        category = serializer.save()
        if create_generic:
            existing = Ingredient.objects.filter(name=category.name).first()
            if existing:
                if existing.category is None:
                    existing.category = category
                    existing.is_generic = True
                    existing.save()
            else:
                Ingredient.objects.create(name=category.name, category=category, is_generic=True)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if 'name' in request.data:
            generic = Ingredient.objects.filter(category=instance, is_generic=True).first()
            if generic:
                generic.name = request.data['name']
                generic.save()
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def ingredients(self, request, pk=None):
        category = self.get_object()
        serializer = IngredientSerializer(Ingredient.objects.filter(category=category), many=True)
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


class MenuViewSet(viewsets.ModelViewSet):
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

    @action(detail=True, methods=['post'], url_path='add-item')
    def add_item(self, request, pk=None):
        menu = self.get_object()
        serializer = MenuItemSerializer(data=request.data)
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

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicMenuView(generics.RetrieveAPIView):
    queryset = Menu.objects.prefetch_related('items__recipe__recipe_ingredients__ingredient').all()
    serializer_class = MenuSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    lookup_field = 'share_token'


class BuyListViewSet(viewsets.ModelViewSet):
    queryset = BuyListItem.objects.select_related('ingredient__category').all()
    serializer_class = BuyListItemSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def create(self, request, *args, **kwargs):
        ingredient_id = request.data.get('ingredient_id')
        existing = BuyListItem.objects.filter(ingredient_id=ingredient_id).first()
        if existing:
            return Response(BuyListItemSerializer(existing).data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)
