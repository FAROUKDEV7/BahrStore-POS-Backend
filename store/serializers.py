from rest_framework import serializers
from .models import Product, Sale, SaleItem, TraderBill

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class SaleItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = SaleItem
        fields = ['id','product','product_id','qty','price']

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    total_after_discount = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = ['id','customer_name','customer_phone','date','time','discount','total','total_after_discount','items']

    def get_total_after_discount(self, obj):
        return obj.total - (obj.discount or 0)

    def get_time(self, obj):
        if obj.time:  
            return obj.time.strftime("%H:%M")
        return ""


    def create(self, validated_data):
        items_data = validated_data.pop('items')
        sale = Sale.objects.create(**validated_data)
        for item in items_data:
            prod = Product.objects.get(id=item['product_id'])
            SaleItem.objects.create(
                sale=sale,
                product=prod,
                qty=item['qty'],
                price=item['price']
            )
            # تقليل المخزون
            prod.count = max(0, prod.count - item['qty'])
            prod.save()
        return sale

class TraderBillSerializer(serializers.ModelSerializer):
    class Meta:
        model = TraderBill
        fields = '__all__'

