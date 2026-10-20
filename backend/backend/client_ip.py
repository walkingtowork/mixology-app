"""Which IP address a request came from, for rate limiting and login lockout (15.6).

Every request reaches Django through proxies (browser -> Vercel rewrite -> Railway edge ->
gunicorn), so REMOTE_ADDR is the last proxy's address and is the same for everyone. The
client is somewhere in X-Forwarded-For, which each proxy appends to. Counting
TRUSTED_PROXY_COUNT entries in from the right finds the address the first trusted proxy
saw. Entries to the left of that are whatever the client sent and can be forged.

DRF throttling and django-axes both resolve the IP through `client_ip()` below, which
calls DRF's own lookup (`NUM_PROXIES`), so the two can never disagree about who a client is.
"""

from django.core.exceptions import ImproperlyConfigured


def parse_trusted_proxy_count(value, default=2):
    """TRUSTED_PROXY_COUNT from the environment: a whole number, 0 or more.

    Unset or blank means `default`. Anything else that isn't a non-negative integer stops
    the app from starting: a typo here silently changes who every client appears to be.
    """
    if value is None or not str(value).strip():
        return default
    try:
        count = int(str(value).strip())
    except ValueError:
        count = -1
    if count < 0:
        raise ImproperlyConfigured(
            f"TRUSTED_PROXY_COUNT must be a whole number, 0 or more (got {value!r})."
        )
    return count


def client_ip(request):
    """The client's IP address, as DRF throttling computes it. Also axes's AXES_CLIENT_IP_CALLABLE.

    Works on a Django HttpRequest or a DRF Request (both have .META). Imported lazily so
    settings.py can import this module before DRF is configured.
    """
    from rest_framework.throttling import BaseThrottle

    return BaseThrottle().get_ident(request)
