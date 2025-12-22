from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from .models import Ingredient, Recipe, IngredientCategory, RecipeIngredient
from .serializers import IngredientSerializer, RecipeSerializer, IngredientCategorySerializer


class IngredientViewSet(viewsets.ModelViewSet):
    """ViewSet for Ingredient model."""
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']


class RecipeViewSet(viewsets.ModelViewSet):
    """ViewSet for Recipe model with filtering by ingredient and category."""
    queryset = Recipe.objects.prefetch_related('recipe_ingredients__ingredient').all()
    serializer_class = RecipeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'notes', 'garnish']
    ordering_fields = ['name']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter recipes by ingredient or category if query parameters are provided."""
        queryset = super().get_queryset()
        ingredient_id = self.request.query_params.get('ingredient', None)
        category_id = self.request.query_params.get('category', None)
        
        if ingredient_id:
            queryset = queryset.filter(ingredients__id=ingredient_id).distinct()
        
        if category_id:
            # Get all ingredients in this category
            category_ingredients = Ingredient.objects.filter(category_id=category_id)
            queryset = queryset.filter(ingredients__in=category_ingredients).distinct()
        
        return queryset


class IngredientCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for IngredientCategory model."""
    queryset = IngredientCategory.objects.prefetch_related('ingredients').all()
    serializer_class = IngredientCategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'notes']
    ordering_fields = ['name']
    ordering = ['name']
    
    def create(self, request, *args, **kwargs):
        """Create a category and optionally auto-create a generic ingredient."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get the create_generic_ingredient flag (default True)
        create_generic = request.data.get('create_generic_ingredient', True)
        
        # Create the category
        category = serializer.save()
        
        # Auto-create generic ingredient if requested
        if create_generic:
            # Check if an ingredient with the same name already exists
            existing_ingredient = Ingredient.objects.filter(name=category.name).first()
            
            if existing_ingredient:
                # Link existing ingredient to category and mark as generic
                if existing_ingredient.category is None:
                    existing_ingredient.category = category
                    existing_ingredient.is_generic = True
                    existing_ingredient.save()
            else:
                # Create new generic ingredient
                Ingredient.objects.create(
                    name=category.name,
                    category=category,
                    is_generic=True
                )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Update a category and update the generic ingredient name if it exists."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Get old name before saving
        old_name = instance.name
        
        # Update the category
        self.perform_update(serializer)
        
        # Update generic ingredient name if it exists
        if 'name' in request.data:
            new_name = request.data['name']
            generic_ingredient = Ingredient.objects.filter(
                category=instance,
                is_generic=True
            ).first()
            
            if generic_ingredient:
                generic_ingredient.name = new_name
                generic_ingredient.save()
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def ingredients(self, request, pk=None):
        """Get all ingredients in a category."""
        category = self.get_object()
        ingredients = Ingredient.objects.filter(category=category)
        serializer = IngredientSerializer(ingredients, many=True)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to prevent deletion if recipes use category ingredients."""
        instance = self.get_object()
        
        # Check if any recipes use ingredients from this category
        ingredients_in_category = Ingredient.objects.filter(category=instance)
        recipes_using_category = RecipeIngredient.objects.filter(
            ingredient__in=ingredients_in_category
        ).exists()
        
        if recipes_using_category:
            return Response(
                {
                    'detail': f"Cannot delete category '{instance.name}' because it is used in one or more recipes. "
                             "Please remove all recipes using ingredients from this category before deleting."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)
