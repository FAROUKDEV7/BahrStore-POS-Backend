from rest_framework import routers
from django.urls import path, include
from .views import ProductViewSet, SaleViewSet, TraderBillViewSet

router = routers.DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'sales', SaleViewSet)
router.register(r'traderbills', TraderBillViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
]
