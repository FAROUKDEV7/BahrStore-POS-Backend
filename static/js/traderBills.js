
//-------------------------------------------------------------
// elements
//-------------------------------------------------------------
const billForm = document.getElementById("billForm");
const traderName = document.getElementById("traderName");
const products = document.getElementById("products");
const deliveryDate = document.getElementById("deliveryDate");
const receiveDate = document.getElementById("receiveDate");
const totalAmount = document.getElementById("totalAmount");
const paidAmount = document.getElementById("paidAmount");
const remainingDisplay = document.getElementById("remainingDisplay");
const invoiceImage = document.getElementById("invoiceImage");
const billsTable = document.getElementById("billsTable").querySelector("tbody");
const clearAllBtn = document.getElementById("clearAll");
const searchInput = document.getElementById("searchInput");
const popup = document.getElementById("popup");
const popupImg = popup.querySelector("img");

const saveBtn = billForm.querySelector("button[type='submit']");

// toast
const toast = document.createElement("div");
toast.id = "toast";
document.body.appendChild(toast);

// CSRF
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
// Helpers
//-------------------------------------------------------------
function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3000);
}

function getRemaining() {
  const remaining = (Number(totalAmount.value) || 0) - (Number(paidAmount.value) || 0);
  remainingDisplay.textContent = remaining;
  remainingDisplay.style.backgroundColor = remaining > 0 ? "rgba(3,161,3,1)" : "rgb(196,7,7)";
}
totalAmount.addEventListener("input", getRemaining);
paidAmount.addEventListener("input", getRemaining);

//-------------------------------------------------------------
// Fetch & Render Bills from API
//-------------------------------------------------------------
let bills = [];
let editId = null;

async function fetchBills() {
  try {
    const res = await fetch("/api/traderbills/");
    bills = await res.json();
    renderBills();
  } catch (err) {
    showToast("⚠️ فشل جلب الفواتير من السيرفر");
    console.error(err);
  }
}

function renderBills() {
  billsTable.innerHTML = "";
  let totalRemaining = 0;

  bills.forEach((bill) => {
    const remaining = Number(bill.total_amount || 0) - Number(bill.paid_amount || 0);
    totalRemaining += remaining;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${bill.trader_name}</td>
      <td>${bill.products}</td>
      <td>${bill.receive_date || ""}</td>
      <td>${bill.delivery_date || ""}</td>
      <td>${bill.total_amount || 0}</td>
      <td>${bill.paid_amount || 0}</td>
      <td>${remaining}</td>
      <td><img src="${bill.invoice_image || ''}" alt="فاتورة" style="width:50px;cursor:pointer"></td>
      <td><button class="editBtn">تــعديل</button></td>
      <td><button class="deleteBtn" style="background-color:rgb(196,7,7);">حــذف</button></td>
    `;
    row.dataset.id = bill.id;
    billsTable.appendChild(row);
  });

  if (bills.length > 0) {
    const totalRow = document.createElement("tr");
    totalRow.innerHTML = `
      <td colspan="6" style="text-align:center;font-weight:bold">إجمالي المتبقي</td>
      <td colspan="4" style="font-weight:bold;color:#0174a5">${totalRemaining}</td>
    `;
    billsTable.appendChild(totalRow);
  }

  clearAllBtn.style.display = bills.length ? "block" : "none";
}

//-------------------------------------------------------------
// Create / Update Bill
//-------------------------------------------------------------
billForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("trader_name", traderName.value);
  formData.append("products", products.value);
  formData.append("delivery_date", deliveryDate.value);
  formData.append("receive_date", receiveDate.value);
  formData.append("total_amount", totalAmount.value || 0);
  formData.append("paid_amount", paidAmount.value || 0);
  if (invoiceImage.files[0]) formData.append("invoice_image", invoiceImage.files[0]);

  try {
    let res;
    if (editId) {
      res = await fetch(`/api/traderbills/${editId}/`, {
        method: "PATCH",
        headers: { "X-CSRFToken": csrftoken },
        body: formData,
      });
    } else {
      res = await fetch("/api/traderbills/", {
        method: "POST",
        headers: { "X-CSRFToken": csrftoken },
        body: formData,
      });
    }

    if (!res.ok) throw new Error("فشل حفظ الفاتورة");

    showToast(editId ? "تم تعديل الفاتورة بنجاح ✏️" : "تم حفظ الفاتورة بنجاح ✅");
    editId = null;
    saveBtn.textContent = "حفظ الفاتورة 💾";
    billForm.reset();
    getRemaining();
    fetchBills();
  } catch (err) {
    showToast(err.message);
    console.error(err);
  }
});

//-------------------------------------------------------------
// Table Click (Edit/Delete/View)
//-------------------------------------------------------------
billsTable.addEventListener("click", (e) => {
  const row = e.target.closest("tr");
  const id = row?.dataset.id;
  const bill = bills.find(b => b.id == id);

  if (!bill) return;

  if (e.target.classList.contains("deleteBtn")) {
    if (!confirm("هل أنت متأكد من حذف الفاتورة؟")) return;
    fetch(`/api/traderbills/${id}/`, {
      method: "DELETE",
      headers: { "X-CSRFToken": csrftoken }
    }).then(() => fetchBills());
  }

  if (e.target.classList.contains("editBtn")) {
    traderName.value = bill.trader_name;
    products.value = bill.products;
    deliveryDate.value = bill.delivery_date || "";
    receiveDate.value = bill.receive_date || "";
    totalAmount.value = bill.total_amount;
    paidAmount.value = bill.paid_amount;
    getRemaining();
    editId = id;
    saveBtn.textContent = "تعديل الفاتورة ✏️";
    window.scroll({ top: 0, behavior: "smooth" });
  }

  if (e.target.tagName === "IMG") {
    popupImg.src = bill.invoice_image || "";
    popup.style.display = "flex";
  }
});

//-------------------------------------------------------------
// Popup
//-------------------------------------------------------------
popup.addEventListener("click", () => { popup.style.display = "none"; });

//-------------------------------------------------------------
// Clear All
//-------------------------------------------------------------
clearAllBtn.addEventListener("click", async () => {
  if (!confirm("هل أنت متأكد من حذف جميع الفواتير؟")) return;
  for (const bill of bills) {
    await fetch(`/api/traderbills/${bill.id}/`, {
      method: "DELETE",
      headers: { "X-CSRFToken": csrftoken }
    });
  }
  fetchBills();
  showToast("تم حذف جميع الفواتير 🗑️");
});

//-------------------------------------------------------------
// Search
//-------------------------------------------------------------
searchInput.addEventListener("input", () => {
  const term = searchInput.value.toLowerCase();
  const rows = billsTable.querySelectorAll("tr");
  rows.forEach((row, index) => {
    if (index < bills.length) {
      const bill = bills[index];
      row.style.display =
        bill.trader_name.toLowerCase().includes(term) ||
        bill.products.toLowerCase().includes(term)
          ? ""
          : "none";
    }
  });
});

//-------------------------------------------------------------
// Popup Print
//-------------------------------------------------------------
document.getElementById("downloadPdfBtn").addEventListener("click", () => {
  const newWindow = window.open("", "_blank");
  const htmlContent = `
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة - Bahr Store</title>
      <style>
        body { font-family: "Cairo", sans-serif; padding: 20px; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #000; padding: 8px; }
        th { background: #0174a5; color: #fff; }
      </style>
    </head>
    <body>
      <h2>فواتير Bahr Store</h2>
      ${document.getElementById("billsTable").outerHTML}
      <script>window.print();<\/script>
    </body>
    </html>
  `;
  newWindow.document.write(htmlContent);
  newWindow.document.close();
});

//-------------------------------------------------------------
// Menu Navbar
//-------------------------------------------------------------
function toggleMenu() {
  const links = document.querySelector('.navbar .links ul');
  links.classList.toggle('active');
}

// Scroll Button
let btnScroll = document.getElementById("btnScroll");
onscroll = () => {
  btnScroll.style.display = scrollY >= 400 ? "block" : "none";
};
btnScroll.onclick = () => { scroll({ left: 0, top: 0, behavior: "smooth" }); };



//-------------------------------------------------------------
// Initial Fetch
//-------------------------------------------------------------
fetchBills();
