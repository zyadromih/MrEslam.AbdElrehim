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
let categoriesList = []; // سيتم جلبها من Firestore

// فحص إعادة تحميل الصفحة (Refresh)
const navEntries = performance.getEntriesByType("navigation");
if (navEntries.length > 0 && navEntries[0].type === "reload") {
    sessionStorage.removeItem("isAdmin");
}

let admin = sessionStorage.getItem("isAdmin") === "true";
let articles = [];
let quizzes = [];

// رقم واتساب المسجل
const WHATSAPP_NUMBER = "201128131379";

// جلب التصنيفات من Firestore في الوقت الفعلي
db.collection("categories").orderBy("createdAt", "asc").onSnapshot((snapshot) => {
    if (snapshot.empty) {
        // إذا كانت القائمة فارغة تماماً عند أول تشغيل، ننشئ التصنيف الافتراضي
        db.collection("categories").add({ name: "كورسات عامة", createdAt: new Date() });
    } else {
        categoriesList = snapshot.docs.map(doc => doc.data().name);
        render();
        if (typeof renderArticles === 'function') renderArticles();
        if (typeof renderQuizzes === 'function') renderQuizzes();
    }
});

// جلب المنتجات من Firestore في الوقت الفعلي
db.collection("products").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), image: doc.data().imageUrl }));
    render();
});

// جلب المقالات
db.collection("articles").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    articles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (typeof renderArticles === 'function') renderArticles();
});

// جلب التدريبات
db.collection("quizzes").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (typeof renderQuizzes === 'function') renderQuizzes();
});

// دوال الحفظ في المتصفح
function save() { localStorage.setItem("products", JSON.stringify(products)) }
function saveCategories() { localStorage.setItem("categoriesList", JSON.stringify(categoriesList)) }
function saveCart() { localStorage.setItem("cart", JSON.stringify(cart)) }

// إضافة تصنيف جديد
async function addCategory() {
    let catName = document.getElementById("newCategoryName").value.trim();
    if (!catName) return alert("الرجاء إدخال اسم التصنيف");
    if (categoriesList.includes(catName)) return alert("هذا التصنيف موجود مسبقاً");

    try {
        await db.collection("categories").add({
            name: catName,
            createdAt: new Date()
        });
        document.getElementById("newCategoryName").value = "";
        alert("تم إضافة التصنيف بنجاح!");
    } catch (error) {
        console.error("Error adding category:", error);
        alert("حدث خطأ أثناء إضافة التصنيف.");
    }
}

async function delCategory(catName) {
    let hasProducts = products.some(p => p.category === catName);
    if (hasProducts) {
        alert("لا يمكن حذف هذا التصنيف لأنه يحتوي على كورسات! الرجاء حذف الكورسات التابعة له أولاً.");
        return;
    }
    if (confirm("هل أنت متأكد من حذف هذا التصنيف؟")) {
        try {
            const query = await db.collection("categories").where("name", "==", catName).get();
            const batch = db.batch();
            query.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            alert("تم حذف التصنيف.");
        } catch (error) {
            console.error("Error deleting category:", error);
            alert("حدث خطأ أثناء حذف التصنيف.");
        }
    }
}

// دالة عرض الكورسات
function render() {
    let box = document.getElementById("products");
    let selectBox = document.getElementById("categorySelect");

    if (selectBox) {
        selectBox.innerHTML = "";
        categoriesList.forEach(c => {
            selectBox.innerHTML += `<option value="${c}">${c}</option>`;
        });
    }

    injectWhatsAppButton();
    if (!box) return;
    box.innerHTML = "";

    const sortedCategories = [...categoriesList].sort();

    sortedCategories.forEach(cat => {
        let catProducts = products
            .filter(p => p.category === cat)
            .sort((a, b) => a.price - b.price);

        let productsWithIndices = catProducts.map(p => {
            const originalIndex = products.findIndex(item => item.id === p.id);
            return { product: p, index: originalIndex };
        });

        let catHTML = `
        <div class="category-section">
            <h2 class="category-title">
                <span>${cat}</span>
                ${admin && cat !== "كورسات عامة" ? `<button onclick="delCategory('${cat}')" style="background:transparent; color:#e63946; border:none; padding:0; margin:0; box-shadow:none; font-size:1.2rem;" title="حذف التصنيف">✖</button>` : ""}
            </h2>
            <div class="category-grid">
        `;

        if (productsWithIndices.length === 0) {
            catHTML += `<p style="color:#777; grid-column: 1 / -1; text-align:center;">لا توجد كورسات في هذا التصنيف حالياً.</p>`;
        } else {
            productsWithIndices.forEach(item => {
                let p = item.product;
                let i = item.index;

                catHTML += `
                <div class="product">
                    <div class="product-image-container" onclick="showProductDetails(${i})">
                        <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x200?text=Course+Image'">
                    </div>
                    <div class="product-info">
                        <h3 class="product-name" onclick="showProductDetails(${i})" style="cursor:pointer;">${p.name}</h3>
                        <p class="product-price">${p.price} جنيه</p>
                        <div class="product-actions" id="actions-${i}">
                            <button class="btn-buy-now" onclick="buyNow(${i})">
                                <i class="fab fa-whatsapp" style="font-size:1.4rem;"></i> إتمام الشراء
                            </button>
                            <button class="btn-details" onclick="showProductDetails(${i})">
                                التفاصيل والنبذة
                            </button>
                            ${admin ? `
                                <div class="admin-actions-group">
                                    <button class="btn-edit" onclick="editCoursePrompt(${i})">تعديل</button>
                                    <button class="btn-delete" onclick="del(${i})">حذف</button>
                                </div>
                            ` : ""}
                        </div>
                    </div>
                </div>`;
            });
        }

        catHTML += `</div></div>`;
        box.innerHTML += catHTML;
    });

    let panel = document.getElementById("adminPanel");
    if (admin && panel) panel.style.display = "block";
    else if (panel) panel.style.display = "none";

    updateCartCount();
    injectWhatsAppButton();
}

function injectWhatsAppButton() {
    if (document.querySelector('.whatsapp-float')) return;
    const waBtn = document.createElement('a');
    waBtn.href = `https://wa.me/${WHATSAPP_NUMBER}`;
    waBtn.className = 'whatsapp-float';
    waBtn.target = '_blank';
    waBtn.innerHTML = '<i class="fab fa-whatsapp"></i>';
    document.body.appendChild(waBtn);
}

function showProductDetails(index) {
    const p = products[index];
    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalBody');

    title.innerText = p.name;

    let descriptionHTML = `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 15px;">
            <h2 style="color: #fff; margin-bottom: 5px;">${p.name}</h2>
            <p style="color: #d4af37; font-weight: bold; font-size: 1.2rem; margin: 0;">السعر: ${p.price} جنيه</p>
        </div>
        <div class="course-description-text">${p.description || "لا يوجد وصف متوفر لهذا الكورس."}</div>
    `;

    // فحص روابط يوتيوب
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([^ &?]+)/;
    const match = p.description ? p.description.match(youtubeRegex) : null;

    if (match && match[1]) {
        const videoId = match[1];
        const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        descriptionHTML = `
            <div class="video-preview" style="background-image: url('${thumbUrl}')" onclick="window.open('${videoUrl}', '_blank')">
                <div style="background: rgba(0,0,0,0.4); width:100%; height:100%; display:flex; align-items:center; justify-content:center; border-radius:12px;">
                    <i class="fab fa-youtube" style="color: #ff0000; font-size: 4rem;"></i>
                </div>
            </div>
            ${descriptionHTML}
        `;
    }

    content.innerHTML = descriptionHTML;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

function buyNow(index) {
    const p = products[index];
    const msg = `مرحباً يا أستاذ إسلام، أريد شراء كورس: ${p.name}\nالسعر: ${p.price} جنيه`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

async function editCoursePrompt(index) {
    const p = products[index];
    const newName = prompt("اسم الكورس:", p.name);
    const newPrice = prompt("السعر:", p.price);
    const newDesc = prompt("وصف الكورس (يمكن وضع رابط يوتيوب هنا):", p.description || "");

    if (newName && newPrice) {
        try {
            await db.collection("products").doc(p.id).update({
                name: newName,
                price: parseFloat(newPrice),
                description: newDesc
            });
            alert("تم التعديل بنجاح");
        } catch (e) {
            alert("خطأ في التعديل: " + e.message);
        }
    }
}

// تشغيل عرض الكورسات عند فتح الصفحة
render();
injectWhatsAppButton();

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
            category: category,
            description: document.getElementById("desc") ? document.getElementById("desc").value.trim() : "",
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

// ================== العمليات ==================

function buyNow(index) {
    const p = products[index];
    const msg = `مرحباً يا أستاذ إسلام، أريد شراء كورس: ${p.name}\nالسعر: ${p.price} جنيه`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
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
        sessionStorage.setItem("isAdmin", "true");
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("adminPass").value = "";
        render();
        if (typeof renderArticles === 'function') renderArticles();
        if (typeof renderQuizzes === 'function') renderQuizzes();
    } else {
        alert("الرقم السري خاطئ!");
    }
}

function logout() {
    admin = false;
    sessionStorage.removeItem("isAdmin");
    let panel = document.getElementById("adminPanel");
    if (panel) panel.style.display = "none";
    render();
    if (typeof renderArticles === 'function') renderArticles();
    if (typeof renderQuizzes === 'function') renderQuizzes();
}

// دالة إضافة مقال
async function addArticle() {
    const title = document.getElementById("artTitle").value.trim();
    const content = document.getElementById("artContent").value.trim();
    if (!title || !content) return alert("اكمل البيانات");

    await db.collection("articles").add({ title, content, createdAt: new Date() });
    document.getElementById("artTitle").value = "";
    document.getElementById("artContent").value = "";
    alert("تم النشر");
}

function renderArticles() {
    const box = document.getElementById("articlesList");
    if (!box) return;
    box.innerHTML = "";

    let panel = document.getElementById("adminPanel");
    if (admin && panel) panel.style.display = "block";
    else if (panel) panel.style.display = "none";

    let html = `<div class="articles-grid">`;
    articles.forEach(art => {
        html += `
            <div class="article-card">
                <h2 class="article-title">${art.title}</h2>
                <div class="article-content">${art.content.replace(/\n/g, '<br>')}</div>
                ${admin ? `
                    <div style="margin-top:20px; display:flex; gap:10px; border-top:1px solid rgba(255,255,255,0.1); padding-top:15px;">
                        <button onclick="editArticlePrompt('${art.id}')" style="flex:1; background:#333; color:#fff; padding:10px; border-radius:8px; border:none; cursor:pointer;">تعديل</button>
                        <button onclick="deleteArticle('${art.id}')" style="flex:1; background:#e63946; color:#fff; padding:10px; border-radius:8px; border:none; cursor:pointer;">حذف</button>
                    </div>
                ` : ""}
            </div>
        `;
    });
    html += `</div>`;
    box.innerHTML = html;
}

async function editArticlePrompt(id) {
    const art = articles.find(a => a.id === id);
    const newTitle = prompt("العنوان:", art.title);
    const newContent = prompt("المحتوى:", art.content);
    if (newTitle && newContent) {
        await db.collection("articles").doc(id).update({ title: newTitle, content: newContent });
        alert("تم التعديل");
    }
}

async function deleteArticle(id) {
    if (confirm("حذف؟")) await db.collection("articles").doc(id).delete();
}

// دالة إضافة تدريب
async function addQuiz() {
    const question = document.getElementById("qTitle").value.trim();
    if (!question) return alert("اكمل البيانات");

    await db.collection("quizzes").add({ question, createdAt: new Date() });
    document.getElementById("qTitle").value = "";
    alert("تمت الإضافة");
}

function renderQuizzes() {
    const box = document.getElementById("quizzesList");
    if (!box) return;
    box.innerHTML = "";

    let panel = document.getElementById("adminPanel");
    if (admin && panel) panel.style.display = "block";
    else if (panel) panel.style.display = "none";

    let html = `<div class="quizzes-grid">`;
    quizzes.forEach(q => {
        html += `
            <div class="quiz-card">
                <div class="quiz-question">${q.question}</div>
                <textarea id="ans-${q.id}" class="quiz-textarea" placeholder="اكتب إجابتك هنا بوضوح..."></textarea>
                <button onclick="sendAnswer('${q.id}', '${q.question.replace(/'/g, "\\'")}')" class="btn-send-answer">
                    <i class="fab fa-whatsapp" style="font-size:1.4rem;"></i> إرسال الإجابة (واتساب)
                </button>
                ${admin ? `
                    <div style="margin-top:20px; display:flex; gap:10px; border-top:1px solid rgba(255,255,255,0.1); padding-top:15px;">
                        <button onclick="editQuizPrompt('${q.id}')" style="flex:1; background:#333; color:#fff; padding:10px; border-radius:8px; border:none; cursor:pointer;">تعديل</button>
                        <button onclick="deleteQuiz('${q.id}')" style="flex:1; background:#e63946; color:#fff; padding:10px; border-radius:8px; border:none; cursor:pointer;">حذف</button>
                    </div>
                ` : ""}
            </div>
        `;
    });
    html += `</div>`;
    box.innerHTML = html;
}

async function editQuizPrompt(id) {
    const q = quizzes.find(item => item.id === id);
    const newQ = prompt("السؤال:", q.question);
    if (newQ) {
        await db.collection("quizzes").doc(id).update({ question: newQ });
        alert("تم التعديل");
    }
}

function sendAnswer(id, question) {
    const ans = document.getElementById(`ans-${id}`).value.trim();
    if (!ans) return alert("اكتب الإجابة أولاً");
    const msg = `إجابة تدريب: ${question}\n\nالإجابة:\n${ans}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

async function deleteQuiz(id) {
    if (confirm("حذف؟")) await db.collection("quizzes").doc(id).delete();
}
