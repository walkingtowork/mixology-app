from rest_framework import serializers
from .models import Ingredient, Recipe, RecipeIngredient, IngredientCategory, Menu, MenuItem, BuyListItem


class IngredientCategorySerializer(serializers.ModelSerializer):
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


class IngredientSerializer(serializers.ModelSerializer):
    category = IngredientCategorySimpleSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
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
    ingredient_id = serializers.PrimaryKeyRelatedField(
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
    recipe_id = serializers.PrimaryKeyRelatedField(
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
            'theme_notes', 'created_at', 'updated_at', 'items', 'item_count',
        ]
        read_only_fields = ['share_token', 'created_at', 'updated_at', 'is_active']

    def get_item_count(self, obj):
        return obj.items.count()


class MenuListSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Menu
        fields = ['id', 'name', 'is_active', 'is_published', 'share_token', 'created_at', 'updated_at', 'item_count']
        read_only_fields = ['share_token', 'created_at', 'updated_at']

    def get_item_count(self, obj):
        return obj.items.count()


class BuyListItemSerializer(serializers.ModelSerializer):
    ingredient = IngredientSerializer(read_only=True)
    ingredient_id = serializers.PrimaryKeyRelatedField(
        queryset=Ingredient.objects.all(),
        source='ingredient',
        write_only=True,
    )

    class Meta:
        model = BuyListItem
        fields = ['id', 'ingredient', 'ingredient_id', 'notes', 'added_at']
        read_only_fields = ['added_at']
