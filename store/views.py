from django.shortcuts import render , redirect
from rest_framework import viewsets , status
from .models import Product, Sale, TraderBill ,SaleItem
from .serializers import ProductSerializer, SaleSerializer, TraderBillSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view



class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('-id')
    serializer_class = ProductSerializer



class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all().order_by('-id')
    serializer_class = SaleSerializer

    #  تعديل الفاتورة (PATCH)
    def partial_update(self, request, *args, **kwargs):
        sale = self.get_object()
        items_data = request.data.get('items', [])

        # حذف العناصر القديمة من الفاتورة
        sale.items.all().delete()

        total = 0
        for item in items_data:
            product_id = item.get('product')
            price = float(item.get('price', 0))
            qty = int(item.get('qty', 1))
            total += price * qty

            SaleItem.objects.create(
                sale=sale,
                product_id=product_id,
                price=price,
                qty=qty,
                product_title=Product.objects.get(id=product_id).title
            )

        sale.customer_name = request.data.get('customer_name', sale.customer_name)
        sale.customer_phone = request.data.get('customer_phone', sale.customer_phone)
        sale.total = total
        sale.save()

        serializer = SaleSerializer(sale)
        return Response(serializer.data, status=status.HTTP_200_OK)

    #  حذف الكل
    @action(detail=False, methods=['delete'])
    def clear(self, request):
        Sale.objects.all().delete()
        return Response({'detail': 'تم حذف كل المبيعات بنجاح ✅'}, status=status.HTTP_204_NO_CONTENT)

    #  عند حذف فاتورة واحدة، ترجع كميات المنتجات
    def destroy(self, request, *args, **kwargs):
        sale = self.get_object()
        for item in sale.items.all():
            product = item.product
            product.count += item.qty
            product.save()
        sale.delete()
        return Response({'detail': 'تم حذف الفاتورة ✅'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['DELETE'])
def remove_sale_item(request, sale_id, item_id):
    try:
        item = SaleItem.objects.get(id=item_id, sale_id=sale_id)
        product = item.product
        product.count += item.qty
        product.save()
        item.delete()
        return Response({'detail': 'تم حذف المنتج ✅'}, status=status.HTTP_204_NO_CONTENT)
    except SaleItem.DoesNotExist:
        return Response({'detail': 'العنصر غير موجود'}, status=status.HTTP_404_NOT_FOUND)



class TraderBillViewSet(viewsets.ModelViewSet):
    queryset = TraderBill.objects.all().order_by('-id')
    serializer_class = TraderBillSerializer




    
# pages
@login_required(login_url='/login/')
def index(request):
    return render(request , "pages/index.html")


def login(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            auth_login(request, user)
            return redirect("index")
        else:
            return render(request, "pages/login.html", {"error": "اسم المستخدم أو كلمة المرور غير صحيحة"})
    return render(request, "pages/login.html")



def logout_view(request):
    auth_logout(request)
    return redirect("login")

@login_required(login_url='/login/')
def products(request):
    return render(request , "pages/products.html")

@login_required(login_url='/login/')
def sales(request):
    return render(request , "pages/sales.html")

@login_required(login_url='/login/')
def scan(request):
    return render(request , "pages/scan.html")

@login_required(login_url='/login/')
def stores(request):
    return render(request , "pages/stores.html")

@login_required(login_url='/login/')
def traderBills(request):
    return render(request , "pages/traderBills.html")



