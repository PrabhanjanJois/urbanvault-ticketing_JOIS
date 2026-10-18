from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TicketViewSet, AuxiliaryDataView

router = DefaultRouter()
router.register(r'tickets', TicketViewSet, basename='ticket')

urlpatterns = [
    path('auxiliary-data/', AuxiliaryDataView.as_view(), name='auxiliary_data'),
    path('', include(router.urls)),
]
