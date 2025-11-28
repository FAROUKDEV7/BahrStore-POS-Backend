
//-------------------------------------------------------------
// Elements
//-------------------------------------------------------------
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const result = document.getElementById('result');
const input = document.getElementById('manualInput');

const invoiceItems = [];
const lastScanTimestamps = {};
const SCAN_DEBOUNCE_MS = 1200;
let allProducts = [];



// CSRF helper
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
const csrftoken = getCookie("csrftoken");



//-------------------------------------------------------------
// get API
//-------------------------------------------------------------
async function fetchProducts() {
  try {
    const res = await fetch("/api/products/");
    allProducts = await res.json();
  } catch (err) {
    result.innerText = "فشل جلب المنتجات من السيرفر: " + err.message;
  }
}

//-------------------------------------------------------------
// دوال مساعدة
//-------------------------------------------------------------
function extractId(raw) {
  if (!raw) return '';
  raw = String(raw).trim();
  if ((raw.startsWith('{') && raw.endsWith('}')) || raw.includes('"id"')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return String(parsed.id).trim();
    } catch (e) { }
  }
  raw = raw.replace(/^[\s"'\(\[\{<]+|[\s"'\)\]\}<>]+$/g, '');
  const idMatch = raw.match(/(?:id[:=\|]\s*)([A-Za-z0-9_\-]+)/i);
  if (idMatch && idMatch[1]) return idMatch[1];
  return raw.split(/\s+/)[0];
}

function findProductById(id) {
  return allProducts.find(p => String(p.id) === String(id));
}
function getUnitTotal(product) {
  const price = parseFloat(product.price || 0);
  const qty = parseInt(product.count || 1);
  return price; // subtotal يحسب في addOrIncrementItem مباشرة
}

function showToast(message) {
  let toast = document.getElementById("toast");
  toast.innerText = message;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3000);
}

//-------------------------------------------------------------
// تحديث المخزون في API
//-------------------------------------------------------------
async function updateProductCountAPI(id, newCount) {
  try {
    const res = await fetch(`/api/products/${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
        "X-Requested-With": "XMLHttpRequest"
      },
      credentials: "same-origin",
      body: JSON.stringify({ count: newCount })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
    }

    
    const updated = await res.json().catch(() => null);
    const idx = allProducts.findIndex(p => String(p.id) === String(id));
    if (idx > -1) {
      allProducts[idx].count = newCount;
      if (updated && updated.count !== undefined) allProducts[idx].count = updated.count;
    }

    return updated;
  } catch (err) {
    console.error("فشل تحديث المنتج:", id, err);
    showToast("⚠️ حدث خطأ أثناء تحديث المخزون في الـ API");
    throw err;
  }
}


//-------------------------------------------------------------
// add product or increase count
//-------------------------------------------------------------
async function addOrIncrementItem(product) {
  const price = Number(product.price || 0);
  const existing = invoiceItems.find(x => String(x.id) === String(product.id));
  const targetIndex = allProducts.findIndex(p => String(p.id) === String(product.id));
  const target = allProducts[targetIndex];

  if (!target) {
    showToast(`❌ المنتج "${product.title}" غير موجود في المخزون.`);
    return;
  }

  if (Number(target.count) <= 0) {
    showToast(`⚠️ لا توجد كمية كافية من "${product.title}" في المخزون.`);
    return;
  }

  if (existing) {
    existing.qty += 1;
    existing.subtotal = existing.qty * price;
  } else {
    invoiceItems.push({ id: product.id, title: product.title, price: price, qty: 1, subtotal: price });
  }

  showToast(`✅ تم إضافة "${product.title}" للفاتورة.`);
  renderStatus();
}

//-------------------------------------------------------------
// delete last element
//-------------------------------------------------------------
async function removeLastAdded() {
  if (invoiceItems.length === 0) return;
  const last = invoiceItems.pop();
  showToast(`🟡 تم حذف "${last.title}" من الفاتورة.`);
  renderStatus();
}

//-------------------------------------------------------------
// total
//-------------------------------------------------------------
function calcTotal() {
  const subtotal = invoiceItems.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
  const discountValue = Number(document.getElementById('discountInput')?.value || 0);
  return Math.max(0, subtotal - discountValue);
}

//-------------------------------------------------------------
// عرض حالة الفاتورة
//-------------------------------------------------------------
function renderStatus() {
  if (invoiceItems.length === 0) {
    result.innerText = 'Waiting for scan...';
    return;
  }

  const lines = invoiceItems.map(i => `${i.title} ×${i.qty} = ${i.subtotal}`).join(' | ');
  const discountValue = Number(document.getElementById('discountInput')?.value || 0);
  const totalBefore = invoiceItems.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
  const totalAfter = calcTotal();

  result.innerHTML = `
    <h3 style="background-color: #0174a5; padding: 5px; border-radius: 40px; margin:20px 0;">
      المنتجات: ${lines}<br>
      الإجمالي قبل الخصم: ${totalBefore} جنيه<br>
      الخصم: ${discountValue} جنيه<br>
      <strong>الإجمالي بعد الخصم: ${totalAfter} جنيه</strong>
    </h3>
  `;
}

document.getElementById('discountInput')?.addEventListener('input', renderStatus);

//-------------------------------------------------------------
//  QR
//-------------------------------------------------------------
function handleScannedRaw(rawData) {
  const id = extractId(rawData);
  if (!id) { result.innerText = '❌ لم يتم استخراج id صالح من الكود'; return; }
  input.value = id;
  const now = Date.now();
  const lastTs = lastScanTimestamps[id] || 0;
  if (now - lastTs < SCAN_DEBOUNCE_MS) {
    result.innerText = `⏱️ تم قراءة ${id} مؤخراً، تجاهل القراءة المكررة`;
    return;
  }
  lastScanTimestamps[id] = now;
  const product = findProductById(id);
  if (!product) { result.innerText = `❌ المنتج غير موجود: ${id}`; return; }
  addOrIncrementItem(product);
}

//-------------------------------------------------------------
// open camera
//-------------------------------------------------------------
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  .then(stream => { video.srcObject = stream; video.play(); requestAnimationFrame(tick); })
  .catch(err => { result.innerText = 'Camera not available: ' + err.message; });

function tick() {
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
      if (code?.data) handleScannedRaw(code.data);
    } catch (e) {}
  }
  requestAnimationFrame(tick);
}

//-------------------------------------------------------------
// زر الماسح اليدوي
//-------------------------------------------------------------
document.getElementById('manualBtn')?.addEventListener('click', () => {
  const raw = input.value.trim();
  if (!raw) { alert('Enter scanned id'); return; }
  handleScannedRaw(raw);
  input.value = '';
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('manualBtn')?.click();
  }
});

//-------------------------------------------------------------
// فتح الفاتورة للطباعة
//-------------------------------------------------------------
function openInvoiceWindow(items, discountValue) {
  const customerName = document.getElementById('customerName')?.value.trim() || 'عميل غير محدد';
  const customerPhone = document.getElementById('customerPhone')?.value.trim() || 'غير محدد';
  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString();
  let totalBefore = items.reduce((s, it) => s + Number(it.subtotal), 0);
  const totalAfter = calcTotal();

  let footerContent = discountValue > 0
    ? `الإجمالي قبل الخصم: ${totalBefore} جنيه<br>الخصم: ${discountValue} جنيه<br>الإجمالي بعد الخصم: ${totalAfter} جنيه`
    : `الإجمالي: ${totalBefore} جنيه`;

  let rows = items.map(it => `<tr>
    <td>${it.title}</td>
    <td>${it.price}</td>
    <td>${it.qty}</td>
    <td>${it.subtotal}</td>
  </tr>`).join('');

  const w = window.open('', '_blank', 'width=600,height=800');
  w.document.write(`
    <html lang="ar" dir="rtl">
    <head>
    <meta charset="utf-8">
    <title>فاتورة بيع - Bahr Store</title>
    <style>

    @media print {
      @page {
        size: 72.1mm 297mm; /* الريسيت الحقيقي */
        margin: 0;          /* بدون مارجن */
      }
      body {
        width: 72.1mm;
        margin: 0;
        padding: 0;
      }
      button { display: none !important; }
    }

    /* شاشة فقط */
    body {
      font-family: 'Cairo', sans-serif;
      background: #fff;
      width: 72.1mm;
      margin: 0;
      padding: 0;
      color: #000;
      line-height: 1.4;
    }

    /* بدون أي مسافات زيادة */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* رأس الفاتورة */
    .header {
      text-align: center;
      margin: 5px 0;
    }

    .header img {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }

    .store-name {
      font-size: 16px;
      font-weight: bold;
      color: #000;
      margin-top: 3px;
    }

    /* عنوان الفاتورة */
    h2 {
      text-align: center;
      background: #000;
      color: #fff;
      padding: 4px 0;
      font-size: 14px;
    }

    /* جدول */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }

    th, td {
      border: 1px solid #000;
      padding: 4px;
      font-size: 11px;
      text-align: center;
    }

    th {
      background: #000;
      color: #fff;
    }

    /* الفوتر */
    .footer {
      text-align: center;
      font-weight: bold;
      font-size: 13px;
      margin: 8px 0;
    }

    button {
        background-color:black;
        border-radius:8px;
        color: white;
        outline:none;
        border:none;
        padding:10px;
        cursor:pointer;

        /* توسيط كامل */
        display: block;
        margin: 10px auto;
        position: static;
    }

    button:hover{
        background-color : #636363;
    }

    </style>
    </head>

    <body>

    <div class="header">
      <img src="/static/images/logo.png" alt="Logo">
      <div class="store-name">Bahr Store</div>
    </div>

    <h2>فاتورة بيع</h2>

    <div style="text-align:center; font-size:11px; margin-top:4px;">
      <strong>اسم العميل:</strong> ${customerName}<br>
      <strong>رقم العميل:</strong> ${customerPhone}<br>
      <strong>التاريخ:</strong> ${date} — <strong>الوقت:</strong> ${time}
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
`);

  w.document.close();
}

//-------------------------------------------------------------
// إنهاء الفاتورة + تحديث الـ API فعليًا
//-------------------------------------------------------------
document.getElementById('finishBtn')?.addEventListener('click', async () => {
  if (invoiceItems.length === 0) { alert('لم يتم مسح أي منتجات'); return; }

  const discountValue = Number(document.getElementById('discountInput')?.value || 0);

  // فتح الفاتورة للطباعة
  openInvoiceWindow(invoiceItems, discountValue);

  // تسجيل الفاتورة في API
  try {
    const saleData = {
      customer_name: document.getElementById("customerName").value || "عميل غير محدد",
      customer_phone: document.getElementById("customerPhone").value || "غير محدد",
      items: invoiceItems.map(it => ({
        product_id: it.id,
        title: it.title,
        price: it.price,
        qty: it.qty,
        subtotal: it.subtotal
      })),
      total_before_discount: invoiceItems.reduce((s, i) => s + i.subtotal, 0),
      discount: discountValue,
      total_after_discount: calcTotal(),
      date: new Date().toISOString()
    };

    const res = await fetch("/api/sales/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken
      },
      body: JSON.stringify(saleData)
    });

    if (!res.ok) throw new Error(`فشل تسجيل الفاتورة (${res.status})`);
    showToast("🧾 تم حفظ الفاتورة في النظام بنجاح");
  } catch (err) {
    console.error("فشل حفظ الفاتورة في API:", err);
    showToast("⚠️ فشل حفظ الفاتورة في السيرفر");
  }

  // تحديث المخزون لكل منتج
  for (const it of invoiceItems) {
    const product = findProductById(it.id);
    if (!product) continue;

    const newCount = Math.max(0, Number(product.count) - it.qty);

    if (newCount > 0) {
      await updateProductCountAPI(it.id, newCount);
    } else {
      try {
        const res = await fetch(`/api/products/${it.id}/`, {
          method: "DELETE",
          headers: { "X-CSRFToken": csrftoken }
        });
        if (res.ok) {
          allProducts = allProducts.filter(p => String(p.id) !== String(it.id));
          showToast(`🗑️ تم حذف المنتج "${it.title}" من المخزون لأنه وصل 0`);
        }
      } catch (err) {
        console.error("خطأ أثناء حذف المنتج:", err);
      }
    }
  }

  showToast("✅ تم حفظ الفاتورة وتحديث المخزون بنجاح");

  // تصفير الصفحة
  invoiceItems.length = 0;
  renderStatus();
  document.getElementById("customerName").value = "";
  document.getElementById("customerPhone").value = "";
  document.getElementById("discountInput").value = 0;
});


//-------------------------------------------------------------
// undo
//-------------------------------------------------------------
document.getElementById('undoBtn')?.addEventListener('click', removeLastAdded);

//-------------------------------------------------------------
// menu navbar 
//-------------------------------------------------------------
function toggleMenu() { document.querySelector('.navbar .links ul')?.classList.toggle('active'); }



// btn scroll
let btnScroll = document.getElementById("btnScroll");
onscroll = function () {
  btnScroll.style.display = scrollY >= 400 ? "block" : "none";
};
btnScroll.onclick = function () {
  scroll({ top: 0, behavior: "smooth" });
};

//-------------------------------------------------------------
// تحميل أولي
//-------------------------------------------------------------
fetchProducts().then(() => renderStatus());

