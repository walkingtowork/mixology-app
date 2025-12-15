from rest_framework import serializers
from .models import Ingredient, Recipe, RecipeIngredient, IngredientCategory


class IngredientCategorySerializer(serializers.ModelSerializer):
    """Serializer for IngredientCategory model."""
    ingredients = serializers.SerializerMethodField()
    generic_ingredient = serializers.SerializerMethodField()
    
    class Meta:
        model = IngredientCategory
        fields = ['id', 'name', 'notes', 'ingredients', 'generic_ingredient']
    
    def get_ingredients(self, obj):
        """Return all ingredients in this category."""
        ingredients = Ingredient.objects.filter(category=obj)
        # Use a simple serializer to avoid circular reference
        return [
            {
                'id': ing.id,
                'name': ing.name,
                'is_generic': ing.is_generic,
            }
            for ing in ingredients
        ]
    
    def get_generic_ingredient(self, obj):
        """Return the generic ingredient for this category if it exists."""
        generic = Ingredient.objects.filter(category=obj, is_generic=True).first()
        if generic:
            return {
                'id': generic.id,
                'name': generic.name,
                'is_generic': generic.is_generic,
            }
        return None


class IngredientCategorySimpleSerializer(serializers.ModelSerializer):
    """Simple serializer for IngredientCategory to avoid circular references."""
    class Meta:
        model = IngredientCategory
        fields = ['id', 'name', 'notes']


class IngredientSerializer(serializers.ModelSerializer):
    """Serializer for Ingredient model."""
    category = IngredientCategorySimpleSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=IngredientCategory.objects.all(),
        source='category',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Ingredient
        fields = ['id', 'name', 'category', 'category_id', 'is_generic']


class RecipeIngredientSerializer(serializers.ModelSerializer):
    """Serializer for RecipeIngredient through model."""
    ingredient = IngredientSerializer(read_only=True)
    ingredient_id = serializers.PrimaryKeyRelatedField(
        queryset=Ingredient.objects.all(),
        source='ingredient',
        write_only=True
    )
    
    class Meta:
        model = RecipeIngredient
        fields = ['id', 'ingredient', 'ingredient_id', 'amount', 'unit']


class RecipeSerializer(serializers.ModelSerializer):
    """Serializer for Recipe model with nested ingredients."""
    ingredients = RecipeIngredientSerializer(many=True, read_only=False, source='recipe_ingredients')
    
    class Meta:
        model = Recipe
        fields = ['id', 'name', 'notes', 'garnish', 'source_url', 'ingredients']
    
    def create(self, validated_data):
        """Create a recipe with its ingredients."""
        ingredients_data = validated_data.pop('recipe_ingredients', [])
        recipe = Recipe.objects.create(**validated_data)
        
        for ingredient_data in ingredients_data:
            # ingredient_data will have 'ingredient' after validation due to source='ingredient' mapping
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=ingredient_data['ingredient'],
                amount=ingredient_data['amount'],
                unit=ingredient_data['unit']
            )
        
        return recipe
    
    def update(self, instance, validated_data):
        """Update a recipe and its ingredients."""
        ingredients_data = validated_data.pop('recipe_ingredients', None)
        
        # Update recipe fields
        instance.name = validated_data.get('name', instance.name)
        instance.notes = validated_data.get('notes', instance.notes)
        instance.garnish = validated_data.get('garnish', instance.garnish)
        instance.source_url = validated_data.get('source_url', instance.source_url)
        instance.save()
        
        # Update ingredients if provided
        if ingredients_data is not None:
            # Delete existing recipe ingredients
            instance.recipe_ingredients.all().delete()
            
            # Create new recipe ingredients
            for ingredient_data in ingredients_data:
                # ingredient_data will have 'ingredient' after validation due to source='ingredient' mapping
                RecipeIngredient.objects.create(
                    recipe=instance,
                    ingredient=ingredient_data['ingredient'],
                    amount=ingredient_data['amount'],
                    unit=ingredient_data['unit']
                )
        
        return instance

