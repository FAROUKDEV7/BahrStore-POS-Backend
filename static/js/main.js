// Elements
let title = document.getElementById("title");
let price = document.getElementById("price");
let taxes = document.getElementById("taxes");
let ads = document.getElementById("ads");
let discount = document.getElementById("discount");
let total = document.getElementById("total");
let count = document.getElementById("count");
let category = document.getElementById("category");
let btnCreate = document.getElementById("btnCreate");
let tbody = document.getElementById("tbody");

let mood = "create";
let temp;
let allProducts = [];



// csrf token
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
// API
//-------------------------------------------------------------
const API_URL = "/api/products/";

async function fetchProducts() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Failed to fetch products");
    const data = await res.json();
    allProducts = data;
    showData();
  } catch (err) {
    console.error(err);
    showToast("خطأ في جلب المنتجات من السيرفر ❌");
  }
}

async function createProduct(prod) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken
      },
      body: JSON.stringify(prod)
    });
    if (!res.ok) throw new Error("Failed to create product");
    return await res.json();
  } catch (err) {
    console.error(err);
    showToast("خطأ في إنشاء المنتج ❌");
  }
}

async function updateProduct(id, prod) {
  try {
    const res = await fetch(`${API_URL}${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken
      },
      body: JSON.stringify(prod)
    });
    if (!res.ok) throw new Error("Failed to update product");
    return await res.json();
  } catch (err) {
    console.error(err);
    showToast("خطأ في تعديل المنتج ❌");
  }
}

async function deleteProductAPI(id) {
  try {
    const res = await fetch(`${API_URL}${id}/`, {
      method: "DELETE",
      headers: {
        "X-CSRFToken": csrftoken
      }
    });
    if (!res.ok) throw new Error("Failed to delete product");
  } catch (err) {
    console.error(err);
    showToast("خطأ في حذف المنتج ❌");
  }
}

//-------------------------------------------------------------
// total
//-------------------------------------------------------------
function getTotal() {
  if (price.value != "") {
    let result =
      Number(price.value) + Number(taxes.value) + Number(ads.value) - Number(discount.value);
    total.innerHTML = result;
    total.style.backgroundColor = "rgba(3, 161, 3, 1)";
  } else {
    total.innerHTML = "0";
    total.style.backgroundColor = "rgb(196, 7, 7)";
  }
}

//-------------------------------------------------------------
// create and aupdate product
//-------------------------------------------------------------
btnCreate.onclick = async function () {
  if (title.value == "" || price.value == "" || category.value == "") {
    alert("يجــب كتــابة اســم المنتــج والسعـــر والتصنـــيف");
    return;
  }

  const newProduct = {
    title: title.value.toLowerCase(),
    price: price.value,
    taxes: taxes.value || 0,
    ads: ads.value || 0,
    discount: discount.value || 0,
    total: total.innerHTML || 0,
    count: count.value || 1,
    category: category.value.toLowerCase()
  };

  if (mood === "create") {
    await createProduct(newProduct);
    showToast("تــم انـشــاء المنتــج بنجــاح ✅");
  } else {
    const id = allProducts[temp].id;
    await updateProduct(id, newProduct);
    showToast("تــم تعــديل المنتــج بنجــاح ✅");
    mood = "create";
    btnCreate.innerHTML = "<h3>انشـــاء المنتــــج</h3>";
    count.style.display = "block";
  }

  clearData();
  await fetchProducts();
};

//-------------------------------------------------------------
// empty inputs
//-------------------------------------------------------------
function clearData() {
  title.value = "";
  price.value = "";
  taxes.value = "";
  ads.value = "";
  discount.value = "";
  total.innerHTML = "0";
  count.value = "";
  category.value = "";
  total.style.backgroundColor = "rgb(196, 7, 7)";
}

//-------------------------------------------------------------
// show data in the table
//-------------------------------------------------------------
function showData() {
  let table = "";
  allProducts.forEach((p, i) => {
    table += `
      <tr>
        <td>${i + 1}</td>
        <td>${p.title}</td>
        <td>${p.count}</td>
        <td>${p.price}</td>
        <td>${p.taxes}</td>
        <td>${p.ads}</td>
        <td>${p.discount}</td>
        <td>${p.total}</td>
        <td>${p.category}</td>
        <td><button onclick="openQR('${p.id}')">QR</button></td>
        <td><button onclick="updateData(${i})" id="update"><h3>تعــديـل</h3></button></td>
        <td><button onclick="deleteProduct(${i})" id="delete"><h3>حـــذف</h3></button></td>
      </tr>
    `;
  });
  tbody.innerHTML = table;

  let btnDelete = document.getElementById("btnDelete");
  if (allProducts.length > 0) {
    btnDelete.innerHTML = `<button onclick="deleteAll()"><h3>حــذف جميــع المنتجات (${allProducts.length})</h3></button>`;
  } else {
    btnDelete.innerHTML = "";
  }
}

//-------------------------------------------------------------
// delete one product
//-------------------------------------------------------------
async function deleteProduct(i) {
  const confirmDelete = confirm("هل أنت متأكد أنك تريد حذف هذا المنتج؟");
  if (!confirmDelete) return showToast("تــم إلغــاء عمليــة الحــذف ❌");

  const id = allProducts[i].id;
  await deleteProductAPI(id);
  showToast("تــم حــذف المــنتج بنجــاح 🗑️");
  await fetchProducts();
}

//-------------------------------------------------------------
// delete all product
//-------------------------------------------------------------
async function deleteAll() {
  const confirmDelete = confirm("هل أنت متأكد من حذف كل المنتجات؟");
  if (!confirmDelete) return showToast("تــم الغاء الحذف ❎");

  for (let p of allProducts) {
    await deleteProductAPI(p.id);
  }
  showToast("تــم حذف جميع المنتجات بنجاح 🧹");
  await fetchProducts();
  scroll({ top: 0, behavior: "smooth" });
}

//-------------------------------------------------------------
// update product
//-------------------------------------------------------------
function updateData(i) {
  const p = allProducts[i];
  title.value = p.title;
  count.value = p.count;
  price.value = p.price;
  taxes.value = p.taxes;
  ads.value = p.ads;
  discount.value = p.discount;
  category.value = p.category;
  getTotal();

  mood = "update";
  temp = i;
  btnCreate.innerHTML = "<h3>تــعــديــل المـنتــج</h3>";

  scroll({ top: 0, behavior: "smooth" });
}

//-------------------------------------------------------------
// البحث
//-------------------------------------------------------------
let searchMood = "title";

function getSearchMood(id) {
  let search = document.getElementById("search");
  if (id == "searchTitle") {
    searchMood = "title";
    search.placeholder = "أبــحـث عــن طــريـق أســـم المنتــــج";
  } else {
    searchMood = "category";
    search.placeholder = "أبــحـث عــن طــريـق التصــــنيــف";
  }
  search.focus();
  search.value = "";
  showData();
}

function searchData(value) {
  value = value.toLowerCase();
  let filtered = allProducts.filter((p) =>
    searchMood === "title"
      ? p.title.includes(value)
      : p.category.includes(value)
  );

  let table = "";
  filtered.forEach((p, i) => {
    table += `
      <tr>
        <td>${i + 1}</td>
        <td>${p.title}</td>
        <td>${p.count}</td>
        <td>${p.price}</td>
        <td>${p.taxes}</td>
        <td>${p.ads}</td>
        <td>${p.discount}</td>
        <td>${p.total}</td>
        <td>${p.category}</td>
        <td><button onclick="openQR('${p.id}')">QR</button></td>
        <td><button onclick="updateData(${i})" id="update"><h3>تعــديـل</h3></button></td>
        <td><button onclick="deleteProduct(${i})" id="delete"><h3>حـــذف</h3></button></td>
      </tr>
    `;
  });
  tbody.innerHTML = table;
}

//-------------------------------------------------------------
// QR
//-------------------------------------------------------------


function openQR(prodId) {
  const p = allProducts.find((x) => x.id == prodId);
  const w = window.open("", "_blank", "width=300,height=200"); // نافذة صغيرة مناسبة للملصق
  w.document.write(`
  <html dir="rtl" lang="ar">
  <head>
    <title>Barcode - ${p.title}</title>
    <style>
      @media print {
        @page {
          size: 38mm 25mm; /* حجم الملصق الحقيقي */
          margin: 0;       /* بدون أي هوامش */
        }
        body { margin:0; padding:0; }
        #printBtn { display: none; }
      }

      body {
        font-family: 'Cairo', sans-serif;
        text-align: center;
        background: #fff;
        color: #000;
        margin: 0;
        padding: 0;
        width: 38mm;
        height: 25mm;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }

      h2, h3 {
        margin: 0;
        font-size: 6pt;
        color: #000;
        line-height: 1;
      }

      #barcode {
        width: 90%;
        height: 12mm; /* ارتفاع مناسب للملصق */
        margin: 1mm 0;
      }

      .priceBox {
        font-size: 6pt;
        font-weight: bold;
        background: #000;
        color: #fff;
        padding: 0.5mm 1mm;
        border-radius: 1mm;
      }

      #printBtn {
        margin-top: 0.5mm;
        padding: 1mm 2mm;
        border: none;
        background: #000;
        color: #fff;
        font-size: 5pt;
        border-radius: 1mm;
        cursor: pointer;
      }
      #printBtn:hover { background: #333; }

    </style>
  </head>
  <body>
    <h2>BAHR STORE</h2>
    <h3>${p.title}</h3>
    <svg id="barcode"></svg>
    <div class="priceBox">السعر: ${p.total} ج.م</div>
    <button id="printBtn">طباعة</button>

    <script src="/static/js/JsBarcode.all.min.js"></script>
    <script>
      JsBarcode("#barcode", "${p.id}", {
        format: "CODE128",
        width: 1.5,       // عرض الخط للباصكود
        height: 12,       // ارتفاع الباركود بالمليمتر
        displayValue: true,
        fontSize: 6,
        margin: 0,
        textMargin: 1,
        lineColor: "#000"
      });

      document.getElementById('printBtn').onclick = () => window.print();
    <\/script>
  </body>
  </html>
  `);
  w.document.close();
}









//-------------------------------------------------------------
// Toast
//-------------------------------------------------------------
function showToast(message) {
  let toast = document.getElementById("toast");
  toast.innerText = message;
  toast.style.display = "block";
  setTimeout(() => (toast.style.display = "none"), 3000);
}

//-------------------------------------------------------------
// Scroll btn
//-------------------------------------------------------------
let btnScroll = document.getElementById("btnScroll");
onscroll = function () {
  btnScroll.style.display = scrollY >= 400 ? "block" : "none";
};
btnScroll.onclick = function () {
  scroll({ top: 0, behavior: "smooth" });
};

//-------------------------------------------------------------
// Menu navbar
//-------------------------------------------------------------
function toggleMenu() {
  const links = document.querySelector(".navbar .links ul");
  links.classList.toggle("active");
}




//-------------------------------------------------------------
// تحميل أولي
//-------------------------------------------------------------
fetchProducts();
