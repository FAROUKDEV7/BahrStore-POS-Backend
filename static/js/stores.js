
const API_URL = "/api/products/";



// -------------------------------
// Element page
// -------------------------------
const tableContainer = document.getElementById("tableContainer");
const dropdown = document.getElementById("categorySelect");



// -------------------------------
// جلب المنتجات من السيرفر
// -------------------------------
async function fetchProducts() {
    const res = await fetch(API_URL);
    const data = await res.json();
    return data;
}

// -------------------------------
// show products
// -------------------------------
async function displayProducts(category = "all") {
    const allProducts = await fetchProducts();

    const filtered = category === "all"
        ? allProducts
        : allProducts.filter(p => p.category === category);

    if (filtered.length === 0) {
        tableContainer.innerHTML = `<p class="no-products">لا توجد منتجات فى هذا القسم</p>`;
        return;
    }

    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>اسم المنتج</th>
                    <th>القسم</th>
                    <th>السعر</th>
                    <th>الكمية</th>
                </tr>
            </thead>
            <tbody>
    `;

    filtered.forEach(p => {
        tableHTML += `
            <tr>
                <td>${p.title || "-"}</td>
                <td>${p.category || "-"}</td>
                <td>${p.total || 0} جنيه</td>
                <td>${p.count || 0}</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    tableContainer.innerHTML = tableHTML;
}

// -------------------------------
// change section
// -------------------------------
dropdown.addEventListener("change", (e) => {
    displayProducts(e.target.value);
});

// -------------------------------
// تحميل أولي
// -------------------------------
displayProducts("all");

// -------------------------------
// Navbar Menu
// -------------------------------
function toggleMenu() {
    const links = document.querySelector('.navbar .links ul');
    links.classList.toggle('active');
}

// -------------------------------
// Scroll button
// -------------------------------
const btnScroll = document.getElementById("btnScroll");

onscroll = function() {
    if (scrollY >= 400) {
        btnScroll.style.display = "block";
    } else {
        btnScroll.style.display = "none";
    }
};

btnScroll.onclick = function() {
    scroll({
        left: 0,
        top: 0,
        behavior: "smooth"
    });
};



