document.addEventListener('DOMContentLoaded', () => {

  const tbody = document.querySelector('#salesTable tbody');
  const totalSalesBox = document.getElementById('totalSales');
  const searchInput = document.getElementById('searchInput');
  const clearSalesBtn = document.getElementById('clearSalesBtn');

  const predefinedDateFilter = document.getElementById('predefinedDateFilter');
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');
  const applyDateFilter = document.getElementById('applyDateFilter');
  const clearDateFilter = document.getElementById('clearDateFilter');

  let salesList = [];
  let currentFilterText = '';
  let currentDateFilter = null;

  // ---------------- CSRF Token ----------------
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
  const csrftoken = getCookie('csrftoken');

  // ---------------- Load Sales ----------------
  async function loadSales(filter = '') {
    currentFilterText = filter;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">جار التحميل...</td></tr>`;
    try {
      const res = await fetch('/api/sales/');
      if (!res.ok) throw new Error('فشل في تحميل المبيعات');
      const data = await res.json();
      salesList = data;

      tbody.innerHTML = '';
      let grand = 0;

      data.forEach((sale) => {
        const matchText = `${sale.customer_name || ''} ${sale.customer_phone || ''} ${sale.items.map(x => x.product?.title || x.product_title).join(' ')}`.toLowerCase();
        if (filter && !matchText.includes(filter.toLowerCase())) return;

        if (currentDateFilter) {
          const saleDate = new Date(sale.date);
          if (currentDateFilter.from && saleDate < currentDateFilter.from) return;
          if (currentDateFilter.to && saleDate > currentDateFilter.to) return;
        }

        const discount = Number(sale.discount || 0);
        const productsHtml = sale.items.map(it => {
          const title = it.product?.title || it.product_title || 'Unknown';
          const price = Number(it.price || 0);
          const qty = Number(it.qty || 0);
          const subtotal = price * qty;
          return `${title} ×${qty} = ${subtotal}`;
        }).join('<br>');

        const totalBeforeDiscount = sale.items.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.qty || 0)), 0);
        const saleTotal = totalBeforeDiscount - discount;
        grand += saleTotal;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${sale.customer_name || ''}</td>
          <td>${sale.customer_phone || ''}</td>
          <td>${sale.date || ''}</td>
          <td>${sale.time || ''}</td>
          <td class="product-list">${productsHtml}</td>
          <td>${discount > 0 ? discount + ' جنيه' : '—'}</td>
          <td>${saleTotal} جنيه</td>
          <td>
            <button class="printBtn btn btn-print" data-id="${sale.id}">طباعة</button>
            <button class="editBtn btn btn-edit" data-id="${sale.id}">تعديل</button>
            <button class="deleteBtn btn btn-del" data-id="${sale.id}">حذف</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      totalSalesBox.textContent = `إجمالي المبيعات: ${grand} جنيه`;

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;">${err.message}</td></tr>`;
    }
  }

  // ---------------- Search ----------------
  searchInput.oninput = (e) => {
    loadSales(e.target.value);
  };

  // ---------------- Date Filters ----------------
  predefinedDateFilter.onchange = () => {
    const val = predefinedDateFilter.value;
    if (!val) {
      currentDateFilter = null;
      loadSales(currentFilterText);
      return;
    }

    let from = new Date();
    const to = new Date();
    if (val.endsWith('d')) from.setDate(from.getDate() - parseInt(val));
    else if (val.endsWith('m')) from.setMonth(from.getMonth() - parseInt(val));
    else if (val.endsWith('y')) from.setFullYear(from.getFullYear() - parseInt(val));

    currentDateFilter = { from, to };
    loadSales(currentFilterText);
  };

  applyDateFilter.onclick = () => {
    const fromVal = dateFrom.value ? new Date(dateFrom.value) : null;
    const toVal = dateTo.value ? new Date(dateTo.value) : null;
    if (!fromVal && !toVal) return;
    currentDateFilter = { from: fromVal, to: toVal };
    loadSales(currentFilterText);
  };

  clearDateFilter.onclick = () => {
    predefinedDateFilter.value = '';
    dateFrom.value = '';
    dateTo.value = '';
    currentDateFilter = null;
    loadSales(currentFilterText);
  };

  // ---------------- Modal Edit ----------------
  function openEditModal(id) {
    const sale = salesList.find(s => String(s.id) === String(id));
    if (!sale) return alert("الفاتورة غير موجودة");

    let modal = document.getElementById("editModal");
    if (!modal) {
      modal = document.createElement('div');
      modal.id = "editModal";
      modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);justify-content:center;align-items:center;display:flex;z-index:10000;";
      modal.innerHTML = `
        <div style="background:white;padding:20px;border-radius:8px;width:90%;max-width:600px;max-height:80%;overflow:auto;">
          <h3>تعديل الفاتورة</h3>
          <div id="editItemsList"></div>
          <button id="closeModal" style="margin-top:10px;padding:6px 12px;">إغلاق</button>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById("closeModal").onclick = () => { modal.style.display = "none"; };
    }

    const list = document.getElementById("editItemsList");
    list.innerHTML = sale.items.map(it => {
      const title = it.product?.title || it.product_title;
      return `
        <div style="display:flex;justify-content:space-between;padding:6px;border-bottom:1px solid #ddd;">
          <div style = "color:black;">${title} — ${it.price} × ${it.qty}</div>
          <button class="removeItemBtn" data-sale="${sale.id}" data-item="${it.id}" style="background:red;color:white;border:none;padding:4px 8px;border-radius:5px;">حذف</button>
        </div>
      `;
    }).join('');

    modal.style.display = "flex";
  }

  document.body.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("removeItemBtn")) return;

    const saleId = e.target.dataset.sale;
    const itemId = e.target.dataset.item;

    if (!confirm("هل تريد حذف هذا المنتج؟")) return;

    const res = await fetch(`/api/sales/${saleId}/remove-item/${itemId}/`, {
      method: "DELETE",
      headers: { "X-CSRFToken": csrftoken },
    });

    if (!res.ok) return alert("فشل حذف المنتج!");
    alert("تم حذف المنتج ورجوعه للمخزن");
    document.getElementById("editModal").style.display = "none";
    loadSales(currentFilterText);
  });

  // ---------------- Table Actions ----------------
  tbody.addEventListener('click', async (e) => {
    const el = e.target;
    const id = el.dataset.id;
    if (!id) return;

    if (el.classList.contains('printBtn')) printInvoice(id);
    else if (el.classList.contains('editBtn')) openEditModal(id);
    else if (el.classList.contains('deleteBtn')) {
      if (!confirm('هل تريد حذف الفاتورة بالكامل؟')) return;

      const res = await fetch(`/api/sales/${id}/`, {
        method: "DELETE",
        headers: { "X-CSRFToken": csrftoken }
      });

      if (!res.ok) return alert("فشل حذف الفاتورة!");
      alert("تم حذف الفاتورة بالكامل ورجوع المنتجات للمخزن");
      loadSales(currentFilterText);
    }
  });

  // ---------------- Print Invoice ----------------
function printInvoice(id) {
  const sale = salesList.find(s => String(s.id) === String(id));
  if (!sale) return alert('الفاتورة غير موجودة');

  const discount = Number(sale.discount || 0);
  const totalBefore = sale.items.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.qty || 0)), 0);
  const totalAfter = totalBefore - discount;

  const rows = sale.items.map(i => `
    <tr>
      <td>${i.product?.title || i.product_title}</td>
      <td>${i.price}</td>
      <td>${i.qty}</td>
      <td>${i.price * i.qty}</td>
    </tr>
  `).join('');

  const footerContent = discount > 0 
    ? `الإجمالي قبل الخصم: ${totalBefore} جنيه<br>الخصم: ${discount} جنيه<br>الإجمالي الكلي: ${totalAfter} جنيه` 
    : `الإجمالي الكلي: ${totalAfter} جنيه`;

  const doc = `
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>فاتورة بيع - Bahr Store</title>
      <style>
        @media print {
          @page { size: 72.1mm 297mm; margin: 0; }
          body { width: 72.1mm; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
          button { display: none !important; }
        }
        body { font-family: 'Cairo', sans-serif; color:#000; line-height:1.4; margin:0; padding:0; }
        * { margin:0; padding:0; box-sizing:border-box; }
        .header { text-align:center; margin:5px 0; }
        .header img { width:60px; height:60px; object-fit:contain; }
        .store-name { font-size:16px; font-weight:bold; margin-top:3px; }
        h2 { text-align:center; background:#000; color:#fff; padding:4px 0; font-size:14px; }
        table { width:100%; border-collapse:collapse; margin-top:6px; }
        th, td { border:1px solid #000; padding:4px; font-size:11px; text-align:center; }
        th { background:#000; color:#fff; }
        .footer { text-align:center; font-weight:bold; font-size:13px; margin:8px 0; }
        button { background:black; color:white; border:none; border-radius:8px; padding:10px; cursor:pointer; display:block; margin:10px auto; }
        button:hover { background:#636363; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="/static/images/logo.png" alt="Logo">
        <div class="store-name">Bahr Store</div>
      </div>
      <h2>فاتورة بيع</h2>
      <div style="text-align:center; font-size:11px; margin-top:4px;">
        <strong>اسم العميل:</strong> ${sale.customer_name}<br>
        <strong>رقم العميل:</strong> ${sale.customer_phone}<br>
        <strong>التاريخ:</strong> ${sale.date} — <strong>الوقت:</strong> ${sale.time}
      </div>
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th>السعر</th>
            <th>الكمية</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">${footerContent}</div>
      <button onclick="window.print()">🧾 طباعة</button>
    </body>
    </html>
  `;

  const w = window.open('', '_blank', 'width=400,height=600');
  w.document.write(doc);
  w.document.close();
  w.focus();
}



  // ---------------- Delete All ----------------
  clearSalesBtn.onclick = async () => {
    if (!confirm('هل أنت متأكد من حذف كل المبيعات؟')) return;
    const res = await fetch('/api/sales/clear/', { method: 'DELETE', headers: { 'X-CSRFToken': csrftoken } });
    if (!res.ok) return alert('فشل مسح السجل');
    alert('تم مسح جميع الفواتير ✅');
    loadSales(currentFilterText);
  };

  // ---------------- Load Initial ----------------
  loadSales();
});


// Scroll Button
let btnScroll = document.getElementById("btnScroll");
onscroll = () => {
  btnScroll.style.display = scrollY >= 400 ? "block" : "none";
};
btnScroll.onclick = () => { scroll({ left: 0, top: 0, behavior: "smooth" }); };
