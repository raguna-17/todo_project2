# todo_project/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import views as auth_views

# static helpers
from django.conf import settings
from django.conf.urls.static import static

# your core urlpatterns (without static)
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('login/', auth_views.LoginView.as_view(template_name='todo_app/login.html'), name='login'),
    # put your app include last so static rules can be evaluated first (or below we modify order)
    path('', include('todo_app.urls')),  # フロントページルート
]

# --- IMPORTANT: ensure static patterns are checked BEFORE app catch-all routes ---
# Prepend static patterns so /static/... is served before any app URL that might catch-all
if settings.DEBUG:
    # pick a sensible document_root: prefer STATICFILES_DIRS[0] if present, else STATIC_ROOT
    if getattr(settings, "STATICFILES_DIRS", None):
        document_root = settings.STATICFILES_DIRS[0]
    else:
        document_root = getattr(settings, "STATIC_ROOT", None)

    if document_root:
        static_patterns = static(settings.STATIC_URL, document_root=document_root)
        # Prepend static URL patterns
        urlpatterns = list(static_patterns) + list(urlpatterns)

