from django.urls import path

from . import views

app_name = "authentication"

urlpatterns = [
    # Core auth
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("verify/", views.VerifyTokenView.as_view(), name="verify"),
    path("refresh/", views.RefreshTokenView.as_view(), name="refresh"),
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("change-password/", views.PasswordChangeView.as_view(), name="change-password"),
    # 2FA — paths match frontend /api/auth/2fa/*
    path("2fa/setup/", views.MfaSetupView.as_view(), name="2fa-setup"),
    path("2fa/verify/", views.MfaVerifyView.as_view(), name="2fa-verify"),
    path("2fa/enable/", views.Enable2FAView.as_view(), name="2fa-enable"),
    path("2fa/disable/", views.Disable2FAView.as_view(), name="2fa-disable"),
]
