from django.urls import path
from . import views


urlpatterns = [
    path("", views.index , name="index"),
    path("login/", views.login, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("products/", views.products , name="products"),
    path("sales/", views.sales , name="sales"),
    path("scan/", views.scan , name="scan"),
    path("stores/", views.stores , name="stores"),
    path("traderBills/", views.traderBills , name="traderBills"),
    path('api/sales/<int:sale_id>/remove-item/<int:item_id>/', views.remove_sale_item, name='remove-sale-item'),


]
