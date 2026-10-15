import logging
import unittest

from django.core.cache import cache
from django.test.runner import DiscoverRunner


class CacheClearingResult(unittest.TextTestResult):
    def startTest(self, test):
        # Throttle counts are kept in the cache, which the test database's rollback does not
        # touch. Without this, one test's requests would count against the next one's limit.
        cache.clear()
        super().startTest(test)


class CacheClearingTestRunner(DiscoverRunner):
    """Django's test runner, with an empty cache at the start of every test.

    Rate limits stay switched on in tests, at their real values, rather than being turned
    off in a test-only settings file that would hide how they behave.
    """

    def setup_test_environment(self, **kwargs):
        super().setup_test_environment(**kwargs)
        # Axes logs every failed sign-in at WARNING, which is useful in Railway's logs and
        # only noise across a test run that fails sign-ins on purpose.
        logging.getLogger('axes').setLevel(logging.ERROR + 10)

    def get_resultclass(self):
        # Django picks a special result class only for --debug-sql or --pdb; keep those.
        return super().get_resultclass() or CacheClearingResult
