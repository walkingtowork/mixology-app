from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class UserModelTests(TestCase):
    """Test cases for the custom User model."""

    def test_user_creation_with_required_fields(self):
        """Test that a user can be created with required fields (username, email, password)."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(user.check_password('testpass123'))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_user_creation_with_fullname(self):
        """Test that a user can be created with the optional fullname field."""
        user = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123',
            fullname='Test User Full Name'
        )
        self.assertEqual(user.fullname, 'Test User Full Name')
        self.assertEqual(user.username, 'testuser2')

    def test_user_creation_without_fullname(self):
        """Test that a user can be created without the fullname field (it's optional)."""
        user = User.objects.create_user(
            username='testuser3',
            email='test3@example.com',
            password='testpass123'
        )
        self.assertEqual(user.fullname, '')
        self.assertTrue(user.fullname == '' or user.fullname is None)

    def test_user_string_representation(self):
        """Test that the __str__ method returns the username."""
        user = User.objects.create_user(
            username='testuser4',
            email='test4@example.com',
            password='testpass123'
        )
        self.assertEqual(str(user), 'testuser4')

    def test_user_inherits_abstractuser_fields(self):
        """Test that User model inherits all AbstractUser fields and methods."""
        user = User.objects.create_user(
            username='testuser5',
            email='test5@example.com',
            password='testpass123'
        )
        # Verify inherited fields exist
        self.assertIsNotNone(user.username)
        self.assertIsNotNone(user.email)
        self.assertIsNotNone(user.password)
        self.assertIsNotNone(user.is_staff)
        self.assertIsNotNone(user.is_superuser)
        self.assertIsNotNone(user.is_active)
        self.assertIsNotNone(user.date_joined)
        # Verify inherited methods work
        self.assertTrue(hasattr(user, 'get_full_name'))
        self.assertTrue(hasattr(user, 'get_short_name'))
        self.assertTrue(hasattr(user, 'check_password'))

    def test_superuser_creation(self):
        """Test that a superuser can be created with correct permissions."""
        superuser = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin123'
        )
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.is_active)
        self.assertTrue(superuser.check_password('admin123'))

    def test_superuser_must_have_is_staff_true(self):
        """Test that create_superuser sets is_staff to True."""
        superuser = User.objects.create_superuser(
            username='admin2',
            email='admin2@example.com',
            password='admin123'
        )
        self.assertTrue(superuser.is_staff)

    def test_superuser_must_have_is_superuser_true(self):
        """Test that create_superuser sets is_superuser to True."""
        superuser = User.objects.create_superuser(
            username='admin3',
            email='admin3@example.com',
            password='admin123'
        )
        self.assertTrue(superuser.is_superuser)

    def test_user_fullname_field_exists(self):
        """Test that the fullname field exists on the User model."""
        user = User.objects.create_user(
            username='testuser6',
            email='test6@example.com',
            password='testpass123',
            fullname='John Doe'
        )
        self.assertTrue(hasattr(user, 'fullname'))
        self.assertEqual(user.fullname, 'John Doe')

    def test_user_fullname_can_be_blank(self):
        """Test that fullname field can be left blank."""
        user = User.objects.create_user(
            username='testuser7',
            email='test7@example.com',
            password='testpass123'
        )
        # fullname should be blank/empty, not raise an error
        self.assertEqual(user.fullname, '')
