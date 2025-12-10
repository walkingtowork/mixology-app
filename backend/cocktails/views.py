from rest_framework import viewsets, filters
from .models import Ingredient, Recipe
from .serializers import IngredientSerializer, RecipeSerializer


class IngredientViewSet(viewsets.ModelViewSet):
    """ViewSet for Ingredient model."""
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']


class RecipeViewSet(viewsets.ModelViewSet):
    """ViewSet for Recipe model with filtering by ingredient."""
    queryset = Recipe.objects.prefetch_related('recipe_ingredients__ingredient').all()
    serializer_class = RecipeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'notes', 'garnish']
    ordering_fields = ['name']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter recipes by ingredient if ingredient query parameter is provided."""
        queryset = super().get_queryset()
        ingredient_id = self.request.query_params.get('ingredient', None)
        
        if ingredient_id:
            queryset = queryset.filter(ingredients__id=ingredient_id).distinct()
        
        return queryset
