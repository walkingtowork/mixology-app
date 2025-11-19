# Product Requirements Document: User Model and Django Admin Setup

## Introduction/Overview

This PRD outlines the requirements for adding user management capabilities to the Django backend. The feature will implement a custom User model with username-based authentication, a fullname field, and admin access configuration. This setup will enable user management through Django's admin interface and provide a foundation for future authentication features.

The primary goal is to establish a working user model and admin interface for development and testing purposes, allowing administrators to view, create, and edit users through the Django admin panel.

## Goals

1. Create a custom User model that extends Django's AbstractUser with username-based authentication
2. Add a `fullname` field to store the user's full name as a single field
3. Set up and configure Django admin interface for user management
4. Create a superuser account with credentials "admin"/"admin" for development/testing
5. Enable viewing, adding, and editing users through the Django admin interface
6. Document superuser creation process in the README

## User Stories

1. **As a developer**, I want to access the Django admin interface so that I can manage users during development.

2. **As an administrator**, I want to log into Django admin with username and password so that I can access the admin panel.

3. **As an administrator**, I want to view a list of all users in the Django admin so that I can see all registered users.

4. **As an administrator**, I want to create new users through the Django admin so that I can add users without using the command line.

5. **As an administrator**, I want to edit existing users through the Django admin so that I can update user information.

6. **As a developer**, I want a superuser account with simple credentials (admin/admin) so that I can quickly access the admin interface during development.

## Functional Requirements

1. The system must include a custom User model that extends Django's `AbstractUser` class.

2. The custom User model must include a `fullname` field to store the user's complete name as a single string field.

3. The custom User model must use username as the primary identifier for authentication (inherited from AbstractUser).

4. The custom User model must store user email addresses (inherited from AbstractUser).

5. The custom User model must store user passwords (hashed and secured using Django's password hashing, inherited from AbstractUser).

6. The custom User model must include an `is_staff` field to determine admin access to Django admin interface (inherited from AbstractUser).

7. The custom User model must include an `is_superuser` field to determine superuser privileges (inherited from AbstractUser).

8. The system must configure Django settings to use the custom User model as the AUTH_USER_MODEL.

9. The Django admin interface must be enabled and accessible at `/admin/`.

10. The Django admin interface must display the custom User model with all relevant fields (username, email, fullname, password, is_staff, is_superuser).

11. The Django admin interface must allow administrators to view a list of all users.

12. The Django admin interface must allow administrators to create new users.

13. The Django admin interface must allow administrators to edit existing users.

14. The system must include a superuser account with username "admin" and password "admin" for development/testing purposes.

15. The system must run database migrations to create the User table in the database.

16. The custom User model must be registered with Django admin so it appears in the admin interface.

17. The README must include documentation on how to create a superuser account.

18. The system must include unit tests for the custom User model to verify its functionality.

## Non-Goals (Out of Scope)

1. **User Registration API**: Public-facing user registration endpoints are not included in this feature.

2. **User Authentication API**: Login/logout API endpoints for the React frontend are not included.

3. **Password Reset Functionality**: Password reset or recovery features are not included.

4. **Email Verification**: Email verification or confirmation is not included.

5. **User Profile Pages**: User profile viewing or editing pages in the React frontend are not included.

6. **Advanced Permissions**: Role-based access control or custom permissions beyond is_staff and is_superuser are not included.

7. **User Search/Filtering**: Advanced search or filtering capabilities in the admin interface are not required (basic Django admin filtering is acceptable).

8. **Production Security Hardening**: Security best practices for production (strong passwords, rate limiting, etc.) are not included as this is for development/testing.

9. **User Avatar/Profile Pictures**: Profile picture uploads or avatars are not included.

10. **User Activity Logging**: User activity tracking or logging is not included.

11. **Comprehensive Test Suite**: While unit tests for the User model are included, a full test suite covering all edge cases, integration tests, and admin interface tests are not required.

## Design Considerations

1. **Admin Interface**: The Django admin interface should display user information in a clear, readable format.

2. **User List Display**: The admin user list should show key information (username, email, fullname, is_staff status) for easy identification.

3. **User Form**: The admin user creation/editing form should present fields in a logical order (username, email, fullname, password, permissions).

4. **Password Handling**: Passwords should be displayed as password fields (not plain text) and use Django's password hashing.

## Technical Considerations

1. **Custom User Model**: Create a custom User model in a new Django app (e.g., `accounts` or `users`) that extends `AbstractUser`.

2. **AUTH_USER_MODEL Setting**: Set `AUTH_USER_MODEL` in Django settings to point to the custom User model (e.g., `'accounts.User'`).

3. **Username Authentication**: The custom User model will use Django's default username-based authentication (inherited from AbstractUser). No custom authentication backend is needed.

4. **Database Migrations**: 
   - Create initial migration for the custom User model
   - Since this is a new project, we can set AUTH_USER_MODEL before running initial migrations to avoid migration conflicts
   - Run `python manage.py makemigrations` and `python manage.py migrate`

5. **Admin Registration**: Register the custom User model with Django admin using `admin.site.register(User)` or a custom `UserAdmin` class.

6. **Superuser Creation**: Create the superuser using Django's `createsuperuser` management command. Document the process in the README with instructions to create a superuser with username "admin" and password "admin".

7. **Username Field**: The `username` field is inherited from AbstractUser and will be used as the primary authentication identifier.

8. **Fullname Field**: Add a `CharField` for `fullname` with appropriate max_length (e.g., 150 characters) to store the user's full name.

9. **Inherited Fields**: The custom User model automatically inherits from AbstractUser: `username`, `email`, `password`, `first_name`, `last_name`, `is_staff`, `is_superuser`, `is_active`, `date_joined`, and other standard Django user fields. We only need to add the `fullname` field.

10. **Django Admin Configuration**: Ensure Django admin is properly configured in `INSTALLED_APPS` (it's included by default) and URL routing includes admin URLs.

11. **Model String Representation**: Override `__str__` method in the User model to display meaningful user information (e.g., username, email, or fullname).

12. **Unit Testing**: Create unit tests for the User model to verify:
    - User creation with required fields (username, email, password)
    - User creation with optional fullname field
    - User string representation
    - User inherits all AbstractUser fields and methods
    - Superuser creation works correctly

## Success Metrics

1. **Functional Success**:
   - Custom User model is created and extends AbstractUser
   - Username can be used to log into Django admin
   - Superuser account with "admin"/"admin" credentials exists and works
   - Django admin interface is accessible at `/admin/`
   - Users can be viewed, created, and edited through Django admin
   - Database migrations run successfully
   - README includes superuser creation instructions
   - Unit tests for User model pass successfully

2. **Setup Success**:
   - A developer can follow setup instructions and access Django admin within 5 minutes
   - No errors when creating or editing users through admin interface
   - User model displays correctly in admin list and detail views

3. **Code Quality**:
   - Custom User model follows Django best practices
   - Code is well-documented and clear
   - No migration conflicts or database errors

## Resolved Decisions

1. **User Model Structure**: Custom User model extending AbstractUser with a single `fullname` field.

2. **Authentication Method**: Username-based authentication (username as primary login identifier, inherited from AbstractUser).

3. **Purpose**: Development/testing only - simple credentials (admin/admin) are acceptable.

4. **Model Extension**: Custom User model extending AbstractUser for maximum flexibility. Inherits `is_staff` and `is_superuser` fields from AbstractUser.

5. **Admin Interface**: Full Django admin setup with user management capabilities.

6. **Documentation**: Superuser creation process will be documented in the README.

## Resolved Decisions (Additional)

7. **Django App**: Create a separate Django app named `accounts` to house the custom User model.

8. **Field Validation**: No additional validation is needed for the `fullname` field beyond Django's default CharField validation.

9. **Superuser Creation**: Superuser creation will be documented in the README as a manual step using Django's `createsuperuser` management command.

