from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    IngredientViewSet, RecipeViewSet, IngredientCategoryViewSet,
    MenuViewSet, MenuItemViewSet, BuyListViewSet, PublicMenuView,
)

router = DefaultRouter()
router.register(r'ingredients', IngredientViewSet, basename='ingredient')
router.register(r'recipes', RecipeViewSet, basename='recipe')
router.register(r'categories', IngredientCategoryViewSet, basename='category')
router.register(r'menus', MenuViewSet, basename='menu')
router.register(r'menu-items', MenuItemViewSet, basename='menuitem')
router.register(r'buy-list', BuyListViewSet, basename='buylist')

urlpatterns = [
    path('', include(router.urls)),
    path('public/menu/<uuid:share_token>/', PublicMenuView.as_view(), name='public-menu'),
]
