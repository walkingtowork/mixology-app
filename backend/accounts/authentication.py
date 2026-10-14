from rest_framework import authentication


class SessionAuthentication(authentication.SessionAuthentication):
    """DRF's session authentication, answering 401 rather than 403 when nobody is signed in.

    DRF picks between the two by asking the first authentication class for a
    WWW-Authenticate value, and the stock class offers none, so "you are not signed in" and
    "you may not do that" both come back as 403. The frontend needs to tell them apart: a 401
    sends the user to the login page, a 403 (a CSRF failure, say) must not.

    "Session" is not a scheme browsers know, so it never triggers a password prompt.
    """

    def authenticate_header(self, request):
        return 'Session'
