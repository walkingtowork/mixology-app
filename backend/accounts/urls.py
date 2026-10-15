from django.urls import path
from .diagnostics import ClientIPView
from .views import (
    SessionView, LoginView, LogoutView, InviteListView, InviteDetailView, InviteSignupView,
    PasswordResetRequestView, PasswordResetConfirmView, ProfileView, PasswordChangeView,
)

urlpatterns = [
    path('auth/session/', SessionView.as_view(), name='auth-session'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/profile/', ProfileView.as_view(), name='auth-profile'),
    path('auth/password/', PasswordChangeView.as_view(), name='auth-password-change'),
    path('auth/invites/', InviteListView.as_view(), name='auth-invites'),
    path('auth/invites/<int:pk>/', InviteDetailView.as_view(), name='auth-invite'),
    path('auth/signup/<str:token>/', InviteSignupView.as_view(), name='auth-signup'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='auth-password-reset'),
    path(
        'auth/password-reset/<str:uidb64>/<str:token>/',
        PasswordResetConfirmView.as_view(), name='auth-password-reset-confirm',
    ),
    # Temporary, superusers only: delete once TRUSTED_PROXY_COUNT is verified (15.6).
    path('auth/client-ip/', ClientIPView.as_view(), name='auth-client-ip'),
]
