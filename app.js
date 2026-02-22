// تهيئة Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD6eqVG1zgY4l4u7anW1xVhbfUUMO2WYBg",
    authDomain: "gx-store-43cc0.firebaseapp.com",
    projectId: "gx-store-43cc0",
    storageBucket: "gx-store-43cc0.firebasestorage.app",
    messagingSenderId: "1032633501549",
    appId: "1:1032633501549:web:1db7e41edb633095bc7c64"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let products = []; // سيتم جلبها من Firestore
let categoriesList = JSON.parse(localStorage.getItem("categoriesList")) || ["كورسات عامة"];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let admin = sessionStorage.getItem("admin") === "true";

// جلب المنتجات من Firestore في الوقت الفعلي
db.collection("products").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), image: doc.data().imageUrl }));
    render();
});

// دوال الحفظ في المتصفح
function save() { localStorage.setItem("products", JSON.stringify(products)) }
function saveCategories() { localStorage.setItem("categoriesList", JSON.stringify(categoriesList)) }
function saveCart() { localStorage.setItem("cart", JSON.stringify(cart)) }

// إضافة تصنيف جديد
function addCategory() {
    let catName = document.getElementById("newCategoryName").value;
    if (!catName) return alert("الرجاء إدخال اسم التصنيف");
    if (categoriesList.includes(catName)) return alert("هذا التصنيف موجود مسبقاً");

    categoriesList.push(catName);
    saveCategories();
    document.getElementById("newCategoryName").value = "";
    render();
    alert("تم إضافة التصنيف بنجاح!");
}

function delCategory(catName) {
    let hasProducts = products.some(p => p.category === catName);
    if (hasProducts) {
        alert("لا يمكن حذف هذا التصنيف لأنه يحتوي على كورسات! الرجاء حذف الكورسات التابعة له أولاً.");
        return;
    }
    if (confirm("هل أنت متأكد من حذف هذا التصنيف؟")) {
        categoriesList = categoriesList.filter(c => c !== catName);
        saveCategories();
        render();
    }
}

// دالة عرض الكورسات
function render() {
    let box = document.getElementById("products");
    let selectBox = document.getElementById("categorySelect");

    // تحديث قائمة الاختيار (dropdown) لإضافة الكورس
    if (selectBox) {
        selectBox.innerHTML = "";
        categoriesList.forEach(c => {
            selectBox.innerHTML += `<option value="${c}">${c}</option>`;
        });
    }

    if (!box) return; // تأكد أننا في صفحة الكورسات
    box.innerHTML = "";

    // عرض كل تصنيف
    categoriesList.forEach(cat => {
        let catProducts = products.map((p, i) => ({ product: p, index: i })).filter(item => item.product.category === cat);

        let catHTML = `
        <div class="category-section">
            <h2 class="category-title" style="display:flex; justify-content:space-between; align-items:center;">
                <span>${cat}</span>
                ${admin && cat !== "كورسات عامة" ? `<button onclick="delCategory('${cat}')" style="background:transparent; color:#e63946; border:none; padding:0; margin:0; box-shadow:none; font-size:1.2rem;" title="حذف التصنيف">✖</button>` : ""}
            </h2>
            <div class="category-grid">
        `;

        if (catProducts.length === 0) {
            catHTML += `<p style="color:#777; grid-column: 1 / -1;">لا توجد كورسات في هذا التصنيف حالياً.</p>`;
        } else {
            catProducts.forEach(item => {
                let p = item.product;
                let i = item.index;
                catHTML += `
                <div class="product">
                    <img src="${p.image}" alt="${p.name}">
                    <h3 style="color:#fff; margin-bottom:5px;">${p.name}</h3>
                    <p style="color: #d4af37; font-weight:bold; font-size:1.1rem; margin-bottom:5px;">السعر: ${p.price} جنيه</p>
                    <div style="margin-top: 15px;">
                        <button id="add-btn-${i}" onclick="addCart(${i})" style="width:100%;">إضافة للسلة</button>
                        ${admin ? `<button onclick="del(${i})" style="background: linear-gradient(135deg, #e63946, #b02a35); color: #fff; width:100%; margin-top:5px;">حذف الكورس</button>` : ""}
                    </div>
                </div>`;
            });
        }

        catHTML += `</div></div>`;
        box.innerHTML += catHTML;
    });

    // إظهار لوحة التحكم إذا كان المستخدم أدمن
    let panel = document.getElementById("adminPanel");
    if (admin && panel) panel.style.display = "block";

    updateCartCount();
}

// تشغيل عرض الكورسات عند فتح الصفحة
render();

// دالة رفع الصورة إلى Cloudinary
async function uploadImageToCloudinary(file) {
    const url = "https://api.cloudinary.com/v1_1/dnbpfkeuk/image/upload";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "WebSite");

    const response = await fetch(url, {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || "Image upload failed");
    }

    return data.secure_url;
}

// دالة إضافة كورس جديد (للمدير)
async function addCourse() {
    let name = document.getElementById("name").value.trim();
    let price = document.getElementById("price").value.trim();
    let category = document.getElementById("categorySelect").value;
    let file = document.getElementById("image").files[0];

    if (!name || !price || !file) return alert("الرجاء إدخال اسم الكورس والسعر واختيار صورة");

    try {
        // تغيير نص الزر أثناء الرفع
        const addBtn = document.querySelector("button[onclick='addCourse()']");
        const originalText = addBtn.innerText;
        addBtn.innerText = "جاري الحفظ...";
        addBtn.disabled = true;

        // 1. رفع الصورة إلى Cloudinary
        const imageUrl = await uploadImageToCloudinary(file);

        // 2. حفظ البيانات في Firestore
        await db.collection("products").add({
            name: name,
            price: parseFloat(price),
            category: category, // للحفاظ على نظام التصنيفات الحالي
            description: "",   // كما هو مطلوب في الهيكل
            imageUrl: imageUrl,
            createdAt: new Date()
        });

        // تفريغ الحقول بعد الإضافة
        document.getElementById("name").value = "";
        document.getElementById("price").value = "";
        document.getElementById("image").value = "";

        alert("تمت إضافة الكورس بنجاح!");
        addBtn.innerText = originalText;
        addBtn.disabled = false;
    } catch (error) {
        console.error("Error adding course:", error);
        alert("حدث خطأ أثناء الإضافة: " + error.message);
        const addBtn = document.querySelector("button[onclick='addCourse()']");
        addBtn.innerText = "إضافة الكورس";
        addBtn.disabled = false;
    }
}

// دالة حذف الكورس (للمدير)
async function del(idOrIndex) {
    if (confirm("هل أنت متأكد من حذف هذا الكورس؟")) {
        // إذا كان المنتج يحتوي على id (من Firestore)، نحذفه من هناك
        const product = products[idOrIndex];
        if (product && product.id) {
            try {
                await db.collection("products").doc(product.id).delete();
                alert("تم حذف الكورس بنجاح!");
            } catch (error) {
                console.error("Error deleting course:", error);
                alert("حدث خطأ أثناء الحذف.");
            }
        } else {
            // كحالة احتياطية للمنتجات المحلية القديمة
            products.splice(idOrIndex, 1);
            save();
            render();
        }
    }
}

// ================== السلة (Cart) ==================

function addCart(i) {
    cart.push(products[i]);
    saveCart();
    updateCartCount();

    // إظهار رسالة سريعة بدلاً من alert المزعج
    let btn = document.getElementById(`add-btn-${i}`);
    if (btn) {
        let originalText = btn.innerText;
        btn.innerText = "✓ تمت الإضافة";
        btn.style.background = "linear-gradient(135deg, #25D366, #1da851)"; /* green check */
        btn.style.color = "#fff";
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = ""; /* resort to CSS class styling */
            btn.style.color = "";
        }, 1500);
    }
}

function updateCartCount() {
    let countBadge = document.getElementById("cartCount");
    if (countBadge) {
        countBadge.innerText = cart.length;
        countBadge.style.display = cart.length > 0 ? "inline-block" : "none";
    }
}

function toggleCart() {
    let c = document.getElementById("cartBox");
    if (c) {
        c.style.display = c.style.display == "block" ? "none" : "block";
        if (c.style.display == "block") renderCart();
    }
}

function renderCart() {
    let b = document.getElementById("cartItems");
    let totalEl = document.getElementById("cartTotal");
    if (!b) return;

    b.innerHTML = "";
    let total = 0;

    if (cart.length === 0) {
        b.innerHTML = '<p style="text-align: center; color: #777; font-size: 0.9rem;">السلة فارغة حالياً</p>';
    }

    cart.forEach((p, i) => {
        total += Number(p.price) || 0;
        b.innerHTML += `
        <div class="cart-item" style="align-items:center;">
            <div style="flex:1;">
                <div style="font-weight:bold; font-size:0.9rem; color:#fff;">${p.name}</div>
                <div style="color:#d4af37; font-size:0.8rem;">${p.price} جنيه</div>
            </div>
            <button onclick="remove(${i})" style="background:#e63946; color:#fff; padding:4px 8px; margin-top:0; border-radius:50%; width:30px; height:30px; display:flex; justify-content:center; align-items:center; box-shadow:none;">✖</button>
        </div>`;
    });

    if (totalEl) totalEl.innerText = total + " جنيه";
}

function remove(i) {
    cart.splice(i, 1);
    saveCart();
    renderCart();
    updateCartCount();
}

function checkout() {
    if (cart.length == 0) return alert("السلة فارغة، أضف كورسات أولاً");

    let msg = "مرحباً يا أستاذ إسلام، أريد شراء الكورسات التالية:\n\n";
    let total = 0;

    cart.forEach(p => {
        msg += `📚 ${p.name} - السعر: ${p.price} جنيه\n`;
        total += Number(p.price) || 0;
    });

    msg += `\n💳 الإجمالي: ${total} جنيه`;

    window.location.href = "https://wa.me/201128131379?text=" + encodeURIComponent(msg);
}

// ================== لوحة المدير (Admin) ==================

function showLogin() {
    let box = document.getElementById("loginBox");
    if (box) box.style.display = "flex";
}

function hideLogin() {
    let box = document.getElementById("loginBox");
    if (box) box.style.display = "none";
}

function login() {
    let pass = document.getElementById("adminPass").value;
    if (pass === "1357") {
        admin = true;
        sessionStorage.setItem("admin", "true");
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("adminPass").value = "";
        render(); // إعادة رسم الصفحة لإظهار لوحة التحكم
    } else {
        alert("الرقم السري خاطئ!");
    }
}

function logout() {
    admin = false;
    sessionStorage.removeItem("admin");
    let panel = document.getElementById("adminPanel");
    if (panel) panel.style.display = "none";
    render(); // إعادة رسم الصفحة لإخفاء أزرار الحذف
}
