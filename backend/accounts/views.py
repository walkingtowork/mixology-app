from datetime import timedelta

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Invite, User, username_validator

# An invite made from the app is shown as a QR code to someone standing in front of you, so it
# is short-lived. Invites made in Django admin default to INVITE_ADMIN_LIFETIME (admin.py).
INVITE_QR_LIFETIME = timedelta(hours=24)


def user_payload(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'fullname': user.fullname,
        'can_invite': user.has_perm('accounts.add_invite'),
    }


class SessionView(APIView):
    """Who am I? `{"user": null}` when signed out -- a 200, not a 401.

    The frontend asks this on load to decide between the app and the login page, so being
    signed out is an ordinary answer rather than an error. It also hands the browser its
    csrftoken cookie, which the login POST below needs before any session exists.
    """
    permission_classes = [AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        user = request.user if request.user.is_authenticated else None
        return Response({'user': user_payload(user) if user else None})


class LoginView(APIView):
    """Start a session from an email or username and a password.

    DRF only enforces CSRF for requests that already carry a session, which a login by
    definition does not, so it is enforced here explicitly. Without it another site could
    sign a visitor in to an attacker's account.

    A failure is a 400 with one message for every cause -- unknown account, wrong password,
    deactivated user -- so the response never says which accounts exist.
    """
    permission_classes = [AllowAny]

    @method_decorator(csrf_protect)
    def post(self, request):
        identifier = request.data.get('identifier')
        password = request.data.get('password')
        user = None
        if isinstance(identifier, str) and isinstance(password, str):
            user = authenticate(request, username=identifier, password=password)
        if user is None:
            return Response(
                {'detail': 'Incorrect email, username or password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        login(request, user)
        return Response({'user': user_payload(user)})


class LogoutView(APIView):
    """End the session. Signing out while already signed out is not an error."""
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CanInvite(BasePermission):
    """Only accounts granted "Can add invite" in Django admin may invite people."""

    def has_permission(self, request, view):
        return request.user.has_perm('accounts.add_invite')


def invite_payload(invite):
    return {
        'id': invite.id,
        'url': invite.url,
        'expires_at': invite.expires_at,
        'used_by': invite.used_by.username if invite.used_by else None,
    }


class InviteListView(APIView):
    """Make a fresh single-use invite, for the QR code in the account menu."""
    permission_classes = [CanInvite]

    def post(self, request):
        invite = Invite.objects.create(
            created_by=request.user, expires_at=timezone.now() + INVITE_QR_LIFETIME,
        )
        return Response(invite_payload(invite), status=status.HTTP_201_CREATED)


class InviteDetailView(APIView):
    """One of your own invites. The QR screen polls this to see when someone has joined."""
    permission_classes = [CanInvite]

    def get(self, request, pk):
        invite = get_object_or_404(
            Invite.objects.select_related('used_by'), pk=pk, created_by=request.user,
        )
        return Response(invite_payload(invite))


class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, validators=[username_validator])
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(trim_whitespace=False)

    # Uniqueness ignores case, matching the database constraints, so "Sam" is taken once "sam" is.
    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('That username is taken.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with that email already exists.')
        return value

    def validate(self, attrs):
        candidate = User(username=attrs['username'], email=attrs['email'])
        try:
            validate_password(attrs['password'], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return attrs


class InviteSignupView(APIView):
    """Check an invite (GET) or use it to create an account and sign in (POST).

    No session is needed or read: the token in the URL is the credential, as with a shared
    menu. CSRF is enforced on the POST explicitly, for the same reason as LoginView. An
    invite that exists but can't be used is a 410 saying why; an unknown token is a 404.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def unusable(self, invite):
        if invite is None:
            return Response({'detail': "This invite link isn't valid."}, status=status.HTTP_404_NOT_FOUND)
        reason = invite.unusable_reason()
        if reason:
            return Response({'detail': reason}, status=status.HTTP_410_GONE)
        return None

    @method_decorator(ensure_csrf_cookie)
    def get(self, request, token):
        refusal = self.unusable(Invite.objects.filter(token=token).first())
        return refusal or Response({'valid': True})

    @method_decorator(csrf_protect)
    def post(self, request, token):
        with transaction.atomic():
            # Locked, so two people submitting the same link at once can't both get in.
            invite = Invite.objects.select_for_update().filter(token=token).first()
            refusal = self.unusable(invite)
            if refusal:
                return refusal
            serializer = SignupSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            user = User.objects.create_user(
                username=data['username'], email=data['email'], password=data['password'],
            )
            invite.used_at = timezone.now()
            invite.used_by = user
            invite.save(update_fields=['used_at', 'used_by'])
        login(request, user, backend='accounts.backends.EmailOrUsernameBackend')
        return Response({'user': user_payload(user)}, status=status.HTTP_201_CREATED)
