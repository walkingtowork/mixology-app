from django.urls import path
from .views import (
    SessionView, LoginView, LogoutView, InviteListView, InviteDetailView, InviteSignupView,
)

urlpatterns = [
    path('auth/session/', SessionView.as_view(), name='auth-session'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/invites/', InviteListView.as_view(), name='auth-invites'),
    path('auth/invites/<int:pk>/', InviteDetailView.as_view(), name='auth-invite'),
    path('auth/signup/<str:token>/', InviteSignupView.as_view(), name='auth-signup'),
]
