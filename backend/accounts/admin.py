from datetime import timedelta

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone
from django.utils.html import format_html
from .models import Invite, User

# Invites made here are usually texted, so they last longer than the app's QR invites.
INVITE_ADMIN_LIFETIME = timedelta(days=7)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for the custom User model."""
    list_display = ('username', 'email', 'fullname', 'is_staff', 'is_superuser', 'is_active', 'date_joined')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'date_joined')
    search_fields = ('username', 'email', 'fullname')
    ordering = ('username',)
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('fullname',)}),
    )
    
    # Email is required, so the "add user" form has to ask for it.
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {'fields': ('email', 'fullname')}),
    )


@admin.register(Invite)
class InviteAdmin(admin.ModelAdmin):
    """Make an invite, then copy its link from the saved page and text it over."""
    list_display = ('__str__', 'status', 'created_by', 'created_at', 'expires_at', 'used_by')
    list_filter = ('created_at',)
    search_fields = ('note', 'used_by__username', 'used_by__email')
    fields = ('note', 'expires_at', 'link', 'created_by', 'created_at', 'used_by', 'used_at')
    readonly_fields = ('link', 'created_by', 'created_at', 'used_by', 'used_at')

    def get_changeform_initial_data(self, request):
        return {'expires_at': timezone.now() + INVITE_ADMIN_LIFETIME}

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    @admin.display(description='Invite link')
    def link(self, obj):
        if not obj.pk:
            return 'Save to get the link.'
        return format_html(
            '<input type="text" value="{}" readonly size="80" onclick="this.select()">', obj.url,
        )

    @admin.display(description='Status')
    def status(self, obj):
        return obj.unusable_reason() or 'Unused'
