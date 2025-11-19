# Task List: User Model and Django Admin Setup

## Relevant Files

- `backend/accounts/models.py` - Custom User model extending AbstractUser
- `backend/accounts/admin.py` - Django admin registration for User model
- `backend/accounts/apps.py` - Django app configuration for accounts app
- `backend/accounts/tests.py` - Unit tests for the User model
- `backend/backend/settings.py` - Django settings including AUTH_USER_MODEL configuration
- `backend/backend/urls.py` - URL configuration (verify admin URLs are included)
- `README.md` - Documentation including superuser creation instructions

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/user-model-and-admin`)

- [x] 1.0 Create Django app for User model
  - [x] 1.1 Create `accounts` Django app using `python manage.py startapp accounts` in the backend directory
  - [x] 1.2 Add `accounts` to `INSTALLED_APPS` in `backend/backend/settings.py`

- [x] 2.0 Create custom User model extending AbstractUser
  - [x] 2.1 Open `backend/accounts/models.py` and import `AbstractUser` from `django.contrib.auth.models`
  - [x] 2.2 Create `User` class that extends `AbstractUser`
  - [x] 2.3 Add `fullname` field as a `CharField` with `max_length=150` and `blank=True` (optional field)
  - [x] 2.4 Override `__str__` method to return a meaningful representation (e.g., return `self.username` or `self.fullname` if available)
  - [x] 2.5 Add a Meta class with `verbose_name` and `verbose_name_plural` if desired

- [x] 3.0 Configure Django settings for custom User model
  - [x] 3.1 Set `AUTH_USER_MODEL = 'accounts.User'` in `backend/backend/settings.py` (add it after the INSTALLED_APPS section)
  - [x] 3.2 Verify `django.contrib.admin` is in `INSTALLED_APPS` (should be included by default)
  - [x] 3.3 Verify admin URLs are included in `backend/backend/urls.py` (should have `path('admin/', admin.site.urls)` by default)

- [x] 4.0 Create and run database migrations
  - [x] 4.1 Run `python manage.py makemigrations` to create migration files for the accounts app
  - [x] 4.2 Verify that migrations were created in `backend/accounts/migrations/` directory
  - [x] 4.3 Run `python manage.py migrate` to apply migrations to the database
  - [x] 4.4 Verify migration completed successfully with no errors

- [x] 5.0 Register User model with Django admin
  - [x] 5.1 Open `backend/accounts/admin.py` and import the `User` model
  - [x] 5.2 Import `admin` from `django.contrib`
  - [x] 5.3 Register the User model using `admin.site.register(User)` or create a custom `UserAdmin` class for better admin interface customization
  - [x] 5.4 (Optional) Configure admin display options: `list_display`, `list_filter`, `search_fields` to show username, email, fullname, is_staff, is_superuser

- [x] 6.0 Create superuser and update documentation
  - [x] 6.1 Create superuser using `python manage.py createsuperuser` with username "admin" and password "admin"
  - [x] 6.2 Test Django admin access by starting server and logging in at `http://localhost:8000/admin/` with admin/admin credentials
  - [x] 6.3 Verify that users can be viewed, created, and edited in Django admin
  - [x] 6.4 Update `README.md` with a new section documenting how to create a superuser account, including the command and example credentials for development

- [x] 7.0 Create unit tests for User model
  - [x] 7.1 Open `backend/accounts/tests.py` and set up test class for User model
  - [x] 7.2 Create test for user creation with required fields (username, email, password)
  - [x] 7.3 Create test for user creation with optional fullname field
  - [x] 7.4 Create test for user string representation (__str__ method)
  - [x] 7.5 Create test to verify User inherits AbstractUser fields (is_staff, is_superuser, etc.)
  - [x] 7.6 Create test for superuser creation
  - [x] 7.7 Run tests using `python manage.py test` and verify all tests pass

