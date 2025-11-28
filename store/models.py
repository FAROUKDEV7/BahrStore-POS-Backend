from django.db import models



CATEGORY_CHOICES = [
    ('هودى','هودى'),('تيشرتات','تيشرتات'),('كوتشيات','كوتشيات'),('سليبر','سليبر'),
    ('بوكليت','بوكليت'),('قمصان','قمصان'),('جواكيت','جواكيت'),('كروكسات','كروكسات'),
    ('كابات','كابات'),('بناطيل جينز','بناطيل جينز'),('بناطيل ميلتون','بناطيل ميلتون'),
    ('شربات','شربات'),('ترنجات','ترنجات'),('ملابس داخليه','ملابس داخليه'),
]

class Product(models.Model):
    title = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    taxes = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ads = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    count = models.IntegerField(default=1)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.id} - {self.title}"

class Sale(models.Model):
    customer_name = models.CharField(max_length=255, blank=True)
    customer_phone = models.CharField(max_length=50, blank=True)
    date = models.DateField(auto_now_add=True)
    time = models.TimeField(auto_now_add=True)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty = models.IntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

class TraderBill(models.Model):
    trader_name = models.CharField(max_length=255)
    products = models.TextField(blank=True)  
    delivery_date = models.DateField(null=True, blank=True)
    receive_date = models.DateField(null=True, blank=True)
    invoice_image = models.ImageField(upload_to='invoices/', null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    @property
    def remaining(self):
        return float(self.total_amount) - float(self.paid_amount)
