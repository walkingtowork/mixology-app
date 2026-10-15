from axes.helpers import get_client_ip_address
from django.http import Http404
from django.utils.cache import add_never_cache_headers
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView


class ClientIPView(APIView):
    """What the proxies tell Django about the caller, to set TRUSTED_PROXY_COUNT (15.6).

    Temporary: delete it once the count is verified in production. Superusers only.
    Signed out is a 401 like everywhere else; signed in as anyone else it does not exist (404).
    `is_superuser` rather than IsAdminUser, because staff accounts would pass that. It shows
    the caller only their own request's headers, but those can include proxy internals.

    How to use it: from a phone on mobile data (not the home Wi-Fi), sign in as a superuser and
    open https://thebarcart.vercel.app/api/auth/client-ip/. `drf_throttle_ip` and `axes_ip`
    should both be that phone's public IP (compare with any "what is my IP" site). If not,
    count the entries in `x_forwarded_for` from the right to the phone's address, set
    TRUSTED_PROXY_COUNT in Railway to that number and check again.
    """

    def get(self, request):
        if not request.user.is_superuser:
            raise Http404
        meta = request.META
        response = Response({
            'remote_addr': meta.get('REMOTE_ADDR'),
            'x_forwarded_for': meta.get('HTTP_X_FORWARDED_FOR'),
            'x_real_ip': meta.get('HTTP_X_REAL_IP'),
            'x_vercel_forwarded_for': meta.get('HTTP_X_VERCEL_FORWARDED_FOR'),
            'trusted_proxy_count': api_settings.NUM_PROXIES,
            'drf_throttle_ip': AnonRateThrottle().get_ident(request),
            'axes_ip': get_client_ip_address(request),
        })
        add_never_cache_headers(response)
        return response
