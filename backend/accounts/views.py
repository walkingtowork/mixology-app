from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


def user_payload(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'fullname': user.fullname,
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
