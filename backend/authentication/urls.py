from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import SeededPersonasListView, SwitchPersonaView, CurrentUserView

urlpatterns = [
    path('personas/', SeededPersonasListView.as_view(), name='seeded_personas'),
    path('switch-persona/', SwitchPersonaView.as_view(), name='switch_persona'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
