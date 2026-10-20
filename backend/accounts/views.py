import logging
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
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from backend.throttling import LockedOut, PasswordResetAccountThrottle, PasswordResetIPThrottle

from .models import Invite, User, username_validator
from .password_reset import can_reset, emails_are_delivered, send_reset_email, user_for_link

logger = logging.getLogger(__name__)

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
    deactivated user -- so the response never says which accounts exist. Five failures for
    one username from one IP lock it for 30 minutes (django-axes, settings.py); that is the
    same for names that match no account.
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
            # django-axes flags the request when this username + IP is locked out, whether
            # this attempt was the fifth failure or came in during the 30 minutes after.
            # It is checked here because axes's middleware only sees Django's own request
            # object, not DRF's. Locked out is a 429 with its own message; a correct
            # password does not get in until the lock expires.
            if getattr(request, 'axes_locked_out', False):
                raise LockedOut()
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


def validated_new_password(data, user):
    """The new password from a request body, or raise a 400 listing what is wrong with it."""
    password = data.get('password')
    if not isinstance(password, str) or not password:
        raise serializers.ValidationError({'password': ['Choose a new password.']})
    try:
        validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({'password': list(exc.messages)})
    return password


class PasswordResetRequestView(APIView):
    """"I forgot my password": email a reset link to the account's address.

    The response is the same whether or not an account matched, so this never says which
    emails or usernames exist. It does say whether email is switched on at all, which is
    true or false for everyone: while it is off, the page tells people to ask for a link.
    CSRF is enforced explicitly, for the same reason as LoginView.

    Every request can send an email, so it is limited per IP (a 429) and per account (no
    email, same answer; see PasswordResetAccountThrottle).
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle, PasswordResetIPThrottle]

    @method_decorator(csrf_protect)
    def post(self, request):
        identifier = request.data.get('identifier')
        if not isinstance(identifier, str) or not identifier.strip():
            return Response(
                {'identifier': ['Enter your email or username.']}, status=status.HTTP_400_BAD_REQUEST,
            )
        identifier = identifier.strip()
        lookup = 'email__iexact' if '@' in identifier else 'username__iexact'
        user = User.objects.filter(**{lookup: identifier}).first()
        if user and can_reset(user) and PasswordResetAccountThrottle(user).allow_request(request, self):
            try:
                send_reset_email(user)
            except Exception:
                # A mail failure must look like any other answer, or it gives the account away.
                logger.exception('Could not send a password reset email to user %s', user.pk)
        return Response({'emailed': emails_are_delivered()})


class PasswordResetConfirmView(APIView):
    """Check a reset link (GET) or use it to set a new password and sign in (POST).

    The link is the credential, as with an invite. Used, expired and made-up links all get
    the same 404: the token cannot tell them apart, and the advice is the same either way.
    Changing the password signs out every other session, since Django ties each session to
    the password hash.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def invalid(self):
        return Response(
            {'detail': "This reset link has expired or has already been used."},
            status=status.HTTP_404_NOT_FOUND,
        )

    @method_decorator(ensure_csrf_cookie)
    def get(self, request, uidb64, token):
        return Response({'valid': True}) if user_for_link(uidb64, token) else self.invalid()

    @method_decorator(csrf_protect)
    def post(self, request, uidb64, token):
        user = user_for_link(uidb64, token)
        if user is None:
            return self.invalid()
        user.set_password(validated_new_password(request.data, user))
        user.save(update_fields=['password'])
        login(request, user, backend='accounts.backends.EmailOrUsernameBackend')
        return Response({'user': user_payload(user)})
