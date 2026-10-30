from rest_framework import serializers
from .models import Ingredient, Recipe, RecipeIngredient, IngredientCategory, Menu, MenuItem, BuyListItem, Order


class OwnedPrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """An id in a request body that must name one of the requester's own rows.

    Scoping a viewset's queryset only guards the object in the URL. Without this, user A
    could put user B's recipe on their menu, or B's ingredient in their recipe, by id.
    Someone else's id fails validation exactly as a nonexistent one does.

    Reads `request` from the serializer context and raises without it, so a serializer
    built with no context cannot quietly fall back to every user's rows.
    """

    def get_queryset(self):
        return super().get_queryset().filter(owner=self.context['request'].user)


class UniqueNamePerOwnerMixin:
    """Reject a name the requester already uses, with a 400 rather than a database error.

    The model's constraint is on (owner, name), and `owner` is never a serializer field,
    so DRF cannot build this check itself. Other users' names are deliberately not looked
    at: the same name in someone else's account is neither a conflict nor any of the
    requester's business.
    """

    def validate_name(self, value):
        model = self.Meta.model
        taken = model.objects.filter(owner=self.context['request'].user, name=value)
        if self.instance is not None:
            taken = taken.exclude(pk=self.instance.pk)
        if taken.exists():
            raise serializers.ValidationError(
                f'{model._meta.verbose_name} with this name already exists.'
            )
        return value


class IngredientCategorySerializer(UniqueNamePerOwnerMixin, serializers.ModelSerializer):
    ingredients = serializers.SerializerMethodField()
    generic_ingredient = serializers.SerializerMethodField()

    class Meta:
        model = IngredientCategory
        fields = ['id', 'name', 'notes', 'ingredients', 'generic_ingredient']

    def get_ingredients(self, obj):
        return [
            {'id': ing.id, 'name': ing.name, 'is_generic': ing.is_generic}
            for ing in Ingredient.objects.filter(category=obj)
        ]

    def get_generic_ingredient(self, obj):
        generic = Ingredient.objects.filter(category=obj, is_generic=True).first()
        if generic:
            return {'id': generic.id, 'name': generic.name, 'is_generic': generic.is_generic}
        return None


class IngredientCategorySimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = IngredientCategory
        fields = ['id', 'name', 'notes']


class IngredientSerializer(UniqueNamePerOwnerMixin, serializers.ModelSerializer):
    category = IngredientCategorySimpleSerializer(read_only=True)
    category_id = OwnedPrimaryKeyRelatedField(
        queryset=IngredientCategory.objects.all(),
        source='category',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Ingredient
        fields = ['id', 'name', 'category', 'category_id', 'is_generic', 'stock_level']


class RecipeIngredientSerializer(serializers.ModelSerializer):
    ingredient = IngredientSerializer(read_only=True)
    ingredient_id = OwnedPrimaryKeyRelatedField(
        queryset=Ingredient.objects.all(),
        source='ingredient',
        write_only=True,
    )

    class Meta:
        model = RecipeIngredient
        fields = ['id', 'ingredient', 'ingredient_id', 'amount', 'unit']


class RecipeSerializer(serializers.ModelSerializer):
    ingredients = RecipeIngredientSerializer(many=True, read_only=False, source='recipe_ingredients')

    class Meta:
        model = Recipe
        fields = ['id', 'name', 'description', 'notes', 'garnish', 'glass', 'source_url', 'ingredients']

    def create(self, validated_data):
        ingredients_data = validated_data.pop('recipe_ingredients', [])
        recipe = Recipe.objects.create(**validated_data)
        for ing in ingredients_data:
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=ing['ingredient'],
                amount=ing['amount'],
                unit=ing['unit'],
            )
        return recipe

    def update(self, instance, validated_data):
        ingredients_data = validated_data.pop('recipe_ingredients', None)
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.notes = validated_data.get('notes', instance.notes)
        instance.garnish = validated_data.get('garnish', instance.garnish)
        instance.glass = validated_data.get('glass', instance.glass)
        instance.source_url = validated_data.get('source_url', instance.source_url)
        instance.save()
        if ingredients_data is not None:
            instance.recipe_ingredients.all().delete()
            for ing in ingredients_data:
                RecipeIngredient.objects.create(
                    recipe=instance,
                    ingredient=ing['ingredient'],
                    amount=ing['amount'],
                    unit=ing['unit'],
                )
        return instance


class MenuItemSerializer(serializers.ModelSerializer):
    recipe = RecipeSerializer(read_only=True)
    recipe_id = OwnedPrimaryKeyRelatedField(
        queryset=Recipe.objects.all(),
        source='recipe',
        write_only=True,
    )

    class Meta:
        model = MenuItem
        fields = ['id', 'recipe', 'recipe_id', 'order']


class MenuSerializer(serializers.ModelSerializer):
    items = MenuItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Menu
        fields = [
            'id', 'name', 'is_active', 'is_published', 'share_token',
            'theme_notes', 'notes', 'top_decoration', 'bottom_decoration',
            'created_at', 'updated_at', 'items', 'item_count',
        ]
        read_only_fields = ['share_token', 'created_at', 'updated_at', 'is_active']

    def get_item_count(self, obj):
        return obj.items.count()


class MenuListSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Menu
        fields = [
            'id', 'name', 'is_active', 'is_published', 'share_token',
            'top_decoration', 'bottom_decoration',
            'created_at', 'updated_at', 'item_count',
        ]
        read_only_fields = ['share_token', 'created_at', 'updated_at']

    def get_item_count(self, obj):
        return obj.items.count()


class OrderSerializer(serializers.ModelSerializer):
    """An order as its menu's owner sees it. Fulfilling it is the only thing they can change.

    The recipe and menu are read-only on purpose: a writable id here would let a PATCH move
    an order onto somebody else's menu, or read their recipe back through the nested one.
    """
    recipe = RecipeSerializer(read_only=True)
    menu_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'recipe', 'menu_id', 'guest_name', 'is_fulfilled', 'created_at']
        read_only_fields = ['id', 'guest_name', 'created_at']


class GuestOrderSerializer(OrderSerializer):
    """An order placed from a shared menu. The view supplies the menu from the share token.

    The recipe is looked up among that menu's own items, so a drink that is not on the menu
    fails validation exactly as a nonexistent one does. Needs `menu` in the context.
    """
    recipe_id = serializers.PrimaryKeyRelatedField(
        queryset=Recipe.objects.none(),
        source='recipe',
        write_only=True,
    )

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ['recipe_id']
        read_only_fields = ['id', 'is_fulfilled', 'created_at']

    def get_fields(self):
        fields = super().get_fields()
        fields['recipe_id'].queryset = Recipe.objects.filter(menu_items__menu=self.context['menu'])
        return fields


class BuyListItemSerializer(serializers.ModelSerializer):
    ingredient = IngredientSerializer(read_only=True)
    ingredient_id = OwnedPrimaryKeyRelatedField(
        queryset=Ingredient.objects.all(),
        source='ingredient',
        write_only=True,
    )

    class Meta:
        model = BuyListItem
        fields = ['id', 'ingredient', 'ingredient_id', 'notes', 'added_at']
        read_only_fields = ['added_at']
