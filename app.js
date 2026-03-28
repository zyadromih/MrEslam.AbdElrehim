// Load Firebase auth script dynamically to avoid touching HTML files
if (typeof firebase !== 'undefined' && !firebase.auth) {
    let s = document.createElement('script');
    s.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js";
    s.onload = () => { if (typeof initFirebaseAuth === 'function') initFirebaseAuth(); };
    document.head.appendChild(s);
} else if (typeof firebase !== 'undefined' && firebase.auth) {
    setTimeout(() => { if (typeof initFirebaseAuth === 'function') initFirebaseAuth(); }, 100);
}

// تهيئة Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCZWFq9Vy7y3gchpXtCyD8-F58Gxe_Pxt4",
    authDomain: "mr-eslam-f8e95.firebaseapp.com",
    projectId: "mr-eslam-f8e95",
    storageBucket: "mr-eslam-f8e95.firebasestorage.app",
    messagingSenderId: "301861026515",
    appId: "1:301861026515:web:751865b1a873c112f5b226"
};
firebase.initializeApp(firebaseConfig);


let products = JSON.parse(localStorage.getItem("products")) || (window.initialProducts || []);
let categoriesList = JSON.parse(localStorage.getItem("categoriesList")) || (window.initialCategories || ["كورسات عامة"]);

// فحص إعادة تحميل الصفحة (Refresh)
const navEntries = performance.getEntriesByType("navigation");
if (navEntries.length > 0 && navEntries[0].type === "reload") {
    sessionStorage.removeItem("isAdmin");
}

let admin = sessionStorage.getItem("isAdmin") === "true";
let articles = JSON.parse(localStorage.getItem("articles")) || [];
let quizzes = JSON.parse(localStorage.getItem("quizzes")) || [];
function generateId() { return Math.random().toString(36).substr(2, 9); }
function saveArticles() { localStorage.setItem("articles", JSON.stringify(articles)); }
function saveQuizzes() { localStorage.setItem("quizzes", JSON.stringify(quizzes)); }
function saveHome() { localStorage.setItem("homeInfo", JSON.stringify(homeInfo)); }

// رقم واتساب المسجل
const WHATSAPP_NUMBER = "201128131379";


function initAppData() {
    if (categoriesList.length === 0) categoriesList.push("كورسات عامة");
    render();
    if (typeof renderArticles === 'function') renderArticles();
    if (typeof renderQuizzes === 'function') renderQuizzes();
    if (!courseUrlChecked) {
        checkUrlForCourse();
    }
}
setTimeout(initAppData, 100);


function checkUrlForCourse() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course');
    if (courseId && products.length > 0) {
        const index = products.findIndex(p => p.id === courseId);
        if (index !== -1) {
            showProductDetails(index);
            courseUrlChecked = true;
            // إزالة المتغير من الرابط لتجنب إعادة الفتح عند التحديث
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: newUrl }, '', newUrl);
        }
    }
}




// دالة لتحويل الروابط في النصوص إلى روابط قابلة للضغط
function linkify(text) {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function (url) {
        return `<a href="${url}" target="_blank" style="color: #d4af37; text-decoration: underline;">${url}</a>`;
    });
}

// دوال الحفظ في المتصفح
function save() { localStorage.setItem("products", JSON.stringify(products)) }
function saveCategories() { localStorage.setItem("categoriesList", JSON.stringify(categoriesList)) }
function saveCart() { localStorage.setItem("cart", JSON.stringify(cart)) }

// إضافة تصنيف جديد
async function addCategory() {
    let catName = document.getElementById("newCategoryName").value.trim();
    if (!catName) return alert("الرجاء إدخال اسم التصنيف");
    if (categoriesList.includes(catName)) return alert("هذا التصنيف موجود مسبقاً");

    categoriesList.push(catName);
    saveCategories();
    render();
    document.getElementById("newCategoryName").value = "";
    alert("تم إضافة التصنيف بنجاح!");
}

async function delCategory(catName) {
    let hasProducts = products.some(p => p.category === catName);
    if (hasProducts) {
        alert("لا يمكن حذف هذا التصنيف لأنه يحتوي على كورسات! الرجاء حذف الكورسات التابعة له أولاً.");
        return;
    }
    if (confirm("هل أنت متأكد من حذف هذا التصنيف ( " + catName + " )؟")) {
        categoriesList = categoriesList.filter(c => c !== catName);
        saveCategories();
        render();
        alert("تم حذف التصنيف.");
    }
}

async function delSelectedCategory() {
    let catSelect = document.getElementById("deleteCategorySelect");
    if (!catSelect || !catSelect.value) return;
    let catName = catSelect.value;
    await delCategory(catName);
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

    let deleteSelectBox = document.getElementById("deleteCategorySelect");
    if (deleteSelectBox) {
        deleteSelectBox.innerHTML = "";
        categoriesList.forEach(c => {
            if (c !== "كورسات عامة") {
                deleteSelectBox.innerHTML += `<option value="${c}">${c}</option>`;
            }
        });
    }

    let panel = document.getElementById("adminPanel");
    if (admin && panel) panel.style.display = "block";
    else if (panel) panel.style.display = "none";

    let homeAdminControls = document.getElementById("homeAdminControls");
    if (homeAdminControls) {
        homeAdminControls.style.display = admin ? "block" : "none";
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

    if (typeof updateCartCount === 'function') updateCartCount();
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

    let descriptionText = p.description || "لا يوجد وصف متوفر لهذا الكورس.";

    // استخراج معرّف يوتيوب للصورة
    const ytIdRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const matchId = descriptionText.match(ytIdRegex);
    let videoHTML = "";

    if (matchId && matchId[1]) {
        const videoId = matchId[1];
        const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // إزالة أي رابط يوتيوب داخل النص تماماً
        const urlToRemoveRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s]+/g;
        descriptionText = descriptionText.replace(urlToRemoveRegex, "").trim();

        videoHTML = `
            <div class="video-preview" style="background-image: url('${thumbUrl}'); background-size: cover; background-position: center; width: 100%; height: 200px; border-radius: 12px; cursor: pointer; margin-bottom: 15px;" onclick="window.open('${videoUrl}', '_blank')">
                <div style="background: rgba(0,0,0,0.4); width:100%; height:100%; display:flex; align-items:center; justify-content:center; border-radius:12px;">
                    <i class="fab fa-youtube" style="color: #ff0000; font-size: 4rem;"></i>
                </div>
            </div>
        `;
    }

    let descriptionHTML = `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 15px;">
            <h2 style="color: #fff; margin-bottom: 5px;">${p.name}</h2>
            <p style="color: #d4af37; font-weight: bold; font-size: 1.2rem; margin: 0;">السعر: ${p.price} جنيه</p>
        </div>
        ${videoHTML}
        <div class="course-description-text" style="white-space: pre-wrap; line-height: 1.8; margin-bottom: 20px;">${linkify(descriptionText)}</div>
        
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-top: 20px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid #333;">
            <input type="text" value="${getCourseLink(p.id)}" readonly id="courseLinkInput" style="flex: 1; padding: 10px; background: #000; color: #a0a0a0; border: 1px solid #444; border-radius: 6px; font-family: 'Cairo', sans-serif; direction: ltr; font-size: 0.9rem; margin-bottom: 0;">
            <button onclick="copyCourseLink()" style="background: #333; color: #fff; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; white-space: nowrap;"><i class="fas fa-copy"></i> نسخ الرابط</button>
        </div>
    `;

    content.innerHTML = descriptionHTML;
    modal.style.display = 'flex';
}

function getCourseLink(courseId) {
    let loc = window.location;
    let originPath = loc.origin + loc.pathname;
    let urlDir = originPath.substring(0, originPath.lastIndexOf('/'));
    return urlDir + "/courses.html?course=" + courseId;
}

function copyCourseLink() {
    const input = document.getElementById('courseLinkInput');
    if (input) {
        input.select();
        document.execCommand('copy');
        alert("تم نسخ رابط الكورس بنجاح!");
    }
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
        p.name = newName;
        p.price = parseFloat(newPrice);
        p.description = newDesc;
        save();
        render();
        alert("تم التعديل بنجاح");
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

        // 2. حفظ البيانات في المتصفح
        products.push({
            id: generateId(),
            name: name,
            price: parseFloat(price),
            category: category,
            description: document.getElementById("desc") ? document.getElementById("desc").value.trim() : "",
            image: imageUrl,
            createdAt: new Date().getTime()
        });
        save();
        render();

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
        products.splice(idOrIndex, 1);
        save();
        render();
        alert("تم حذف الكورس بنجاح!");
    }
}

// ================== العمليات ==================

function buyNow(index) {
    const p = products[index];
    const msg = `مرحباً يا أستاذ إسلام، أريد شراء كورس: ${p.name}\nالسعر: ${p.price} جنيه`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ================== لوحة المدير (Admin) ==================

function initFirebaseAuth() {
    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0 && navEntries[0].type === "reload") {
        firebase.auth().signOut();
    }

    firebase.auth().onAuthStateChanged((user) => {
        if (user && user.email === "islamabdalrhim7@gmail.com") {
            if (!admin) {
                admin = true;
                sessionStorage.setItem("isAdmin", "true");
                render();
                if (typeof renderArticles === 'function') renderArticles();
                if (typeof renderQuizzes === 'function') renderQuizzes();
            }
        } else {
            if (admin) {
                admin = false;
                sessionStorage.removeItem("isAdmin");
                render();
                if (typeof renderArticles === 'function') renderArticles();
                if (typeof renderQuizzes === 'function') renderQuizzes();
            }
        }
    });
}

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
    let email = "islamabdalrhim7@gmail.com";

    // إيقاف الزر لتجنب التكرار
    const loginBox = document.getElementById("loginBox");
    const btns = loginBox.getElementsByTagName("button");
    const loginBtn = btns[0];
    const originalText = loginBtn.innerText;

    loginBtn.innerText = "جاري التحقق...";
    loginBtn.disabled = true;

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            if (userCredential.user.email === "islamabdalrhim7@gmail.com") {
                admin = true;
                sessionStorage.setItem("isAdmin", "true");
                document.getElementById("loginBox").style.display = "none";
                document.getElementById("adminPass").value = "";
                render();
                if (typeof renderArticles === 'function') renderArticles();
                if (typeof renderQuizzes === 'function') renderQuizzes();
            } else {
                firebase.auth().signOut();
                alert("هذا الحساب غير مصرح له كمسؤول!");
            }
        })
        .catch((error) => {
            console.error(error);
            alert("خطأ: " + error.message);
        })
        .finally(() => {
            loginBtn.innerText = originalText;
            loginBtn.disabled = false;
        });
}

function logout() {
    firebase.auth().signOut().then(() => {
        admin = false;
        sessionStorage.removeItem("isAdmin");
        let panel = document.getElementById("adminPanel");
        if (panel) panel.style.display = "none";
        render();
        if (typeof renderArticles === 'function') renderArticles();
        if (typeof renderQuizzes === 'function') renderQuizzes();
    });
}

// دالة إضافة مقال
async function addArticle() {
    const title = document.getElementById("artTitle").value.trim();
    const content = document.getElementById("artContent").value.trim();
    if (!title || !content) return alert("اكمل البيانات");

    articles.push({ id: generateId(), title, content, createdAt: new Date().getTime() });
    saveArticles();
    renderArticles();
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
    articles.forEach((art, i) => {
        // نستخدم index لتكون المعرفات فريدة بشكل مؤكد في حال كان id غير متاح أو متطابق
        html += `
            <div class="article-card" style="padding-bottom: 5px;">
                <h2 class="article-title" onclick="toggleArticle(${i})" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    ${art.title}
                    <i class="fas fa-chevron-down" id="icon-${i}" style="transition: transform 0.3s; pointer-events: none;"></i>
                </h2>
                <div class="article-content" id="content-${i}" style="display: none; padding-top: 10px; margin-bottom: 15px;">
                    ${linkify(art.content).replace(/\n/g, '<br>')}
                </div>
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

function toggleArticle(id) {
    // إغلاق باقي المقالات (Accordion behavior)
    articles.forEach((art, i) => {
        if (i !== id) {
            const otherContent = document.getElementById(`content-${i}`);
            const otherIcon = document.getElementById(`icon-${i}`);
            if (otherContent) otherContent.style.display = "none";
            if (otherIcon) otherIcon.style.transform = "rotate(0deg)";
        }
    });

    const content = document.getElementById(`content-${id}`);
    const icon = document.getElementById(`icon-${id}`);

    if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "block";
        icon.style.transform = "rotate(180deg)";
    } else {
        content.style.display = "none";
        icon.style.transform = "rotate(0deg)";
    }
}

async function editArticlePrompt(id) {
    const art = articles.find(a => a.id === id);
    const newTitle = prompt("العنوان:", art.title);
    const newContent = prompt("المحتوى:", art.content);
    if (newTitle && newContent) {
        art.title = newTitle; art.content = newContent; saveArticles(); renderArticles();
        alert("تم التعديل");
    }
}

async function deleteArticle(id) {
    if (confirm("حذف؟")) await db.collection("articles").doc(id).delete();
}

// دالة إضافة تدريب
async function addQuiz() {
    const question = document.getElementById("qTitle").value.trim();
    const timerInput = document.getElementById("qTimer") ? document.getElementById("qTimer").value : "";
    const linkInput = document.getElementById("qLink") ? document.getElementById("qLink").value.trim() : "";

    if (!question) return alert("اكمل البيانات");

    let expirationTime = null;
    if (timerInput && parseInt(timerInput) > 0) {
        expirationTime = new Date().getTime() + (parseInt(timerInput) * 60000);
    }

    quizzes.push({
        id: generateId(),
        question,
        expirationTime,
        link: linkInput,
        createdAt: new Date().getTime()
    });
    saveQuizzes();
    renderQuizzes();

    document.getElementById("qTitle").value = "";
    if (document.getElementById("qTimer")) document.getElementById("qTimer").value = "";
    if (document.getElementById("qLink")) document.getElementById("qLink").value = "";
    alert("تمت الإضافة");
}

let quizTimers = {};

function renderQuizzes() {
    Object.values(quizTimers).forEach(clearInterval);
    quizTimers = {};

    const box = document.getElementById("quizzesList");
    if (!box) return;
    box.innerHTML = "";

    let panel = document.getElementById("adminPanel");
    if (admin && panel) panel.style.display = "block";
    else if (panel) panel.style.display = "none";

    let html = `<div class="quizzes-grid">`;
    const now = new Date().getTime();

    quizzes.forEach(q => {
        if (q.expirationTime && q.expirationTime < now) {
            deleteQuizWithoutPrompt(q.id);
            return;
        }

        let linkHtml = '';
        if (q.link) {
            linkHtml = `<a href="${q.link}" target="_blank" style="display:block; margin-bottom:15px; color:#d4af37; text-decoration:underline;">▶ رابط التدريب أو الاختبار</a>`;
        }

        let timerHtml = '';
        if (q.expirationTime) {
            timerHtml = `<div id="timer-${q.id}" style="color: #ff4c4c; font-weight: bold; margin-bottom: 10px; background: rgba(255,0,0,0.1); padding: 5px; border-radius: 5px; text-align: center;">جاري حساب الوقت...</div>`;

            quizTimers[q.id] = setInterval(() => {
                const currentTime = new Date().getTime();
                const distance = q.expirationTime - currentTime;

                if (distance <= 0) {
                    clearInterval(quizTimers[q.id]);
                    deleteQuizWithoutPrompt(q.id);
                } else {
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                    const el = document.getElementById(`timer-${q.id}`);
                    if (el) el.innerText = `⏳ متبقي: ${minutes}د و ${seconds}ث`;
                }
            }, 1000);
        }

        html += `
            <div class="quiz-card" id="quiz-card-${q.id}">
                ${timerHtml}
                <div class="quiz-question">${linkify(q.question).replace(/\n/g, '<br>')}</div>
                ${linkHtml}
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

async function deleteQuizWithoutPrompt(id) {
    quizzes = quizzes.filter(q => q.id !== id);
    saveQuizzes();
}

async function editQuizPrompt(id) {
    const q = quizzes.find(item => item.id === id);
    const newQ = prompt("السؤال:", q.question);
    if (newQ) {
        q.question = newQ; saveQuizzes(); renderQuizzes();
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
    if (confirm("حذف؟")) { quizzes = quizzes.filter(q => q.id !== id); saveQuizzes(); renderQuizzes(); }
}

// جعل اللصق يتم كنص فقط بدون تنسيق داخل الحقول (Textarea & ContentEditable)
document.addEventListener('paste', function (e) {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.contentEditable !== 'true') return;

    e.preventDefault();
    let text = "";
    if (e.clipboardData && e.clipboardData.getData) {
        text = e.clipboardData.getData('text/plain');
    } else if (window.clipboardData && window.clipboardData.getData) {
        text = window.clipboardData.getData('Text');
    }

    if (document.queryCommandSupported('insertText')) {
        document.execCommand('insertText', false, text);
    } else {
        // Fallback for newer browsers that removed execCommand for textareas
        const target = e.target;
        if (target.selectionStart !== undefined) {
            const startPos = target.selectionStart;
            const endPos = target.selectionEnd;
            target.value = target.value.substring(0, startPos)
                + text
                + target.value.substring(endPos, target.value.length);
            target.selectionStart = startPos + text.length;
            target.selectionEnd = startPos + text.length;
        } else {
            target.value += text;
        }
    }
});

// Removed unneeded homeInfo empty object to fix SyntaxError

// Home info already loaded from local storage using JSON.parse
let homeInfo = JSON.parse(localStorage.getItem("homeInfo")) || {
    name: "الأستاذ إسلام عبدالرحيم",
    bio: "<p>خريج كلية دار العلوم – قسم اللغة العربية والشريعة الإسلامية، بتقدير ممتاز مع مرتبة الشرف.</p>",
    image: "WhatsApp Image 2026-02-21 at 7.37.11 PM (2).jpg"
};
setTimeout(() => renderHomeInfo(), 200);

function renderHomeInfo() {
    const heroImg = document.getElementById("heroImage");
    const heroName = document.getElementById("heroName");
    const heroBio = document.getElementById("heroBio");

    if (heroImg && homeInfo.image) heroImg.src = homeInfo.image;
    if (heroName && homeInfo.name) heroName.innerText = homeInfo.name;
    if (heroBio && homeInfo.bio) {
        heroBio.innerHTML = homeInfo.bio;
    }
}

function openEditHomeModal() {
    // Convert <br> or html back if needed, but it's easier to just use HTML directly or strip tags for basic text 
    // We'll let html be edited as simple text for bio
    let bioText = homeInfo.bio.replace(/<p(.*?)>/gi, '').replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').trim();
    document.getElementById("editHomeName").value = homeInfo.name || "";
    document.getElementById("editHomeBio").value = bioText || "";
    document.getElementById("editHomeImage").value = "";
    let modal = document.getElementById("editHomeModal");
    if (modal) modal.style.display = "flex";
}

function closeEditHomeModal() {
    let modal = document.getElementById("editHomeModal");
    if (modal) modal.style.display = "none";
}

async function saveHomeInfo() {
    const name = document.getElementById("editHomeName").value.trim();
    const bioText = document.getElementById("editHomeBio").value.trim();
    const file = document.getElementById("editHomeImage").files[0];

    if (!name || !bioText) return alert("الرجاء إدخال الاسم والنبذة");

    const btn = document.getElementById("saveHomeBtn");
    const originalText = btn.innerText;
    btn.innerText = "جاري الحفظ...";
    btn.disabled = true;

    try {
        let imageUrl = homeInfo.image;
        if (file) {
            imageUrl = await uploadImageToCloudinary(file);
        }

        let formattedBio = bioText.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');

        homeInfo.name = name;
        homeInfo.bio = formattedBio;
        homeInfo.image = imageUrl;
        saveHome();
        renderHomeInfo();

        closeEditHomeModal();
        alert("تم تحديث البيانات بنجاح!");
    } catch (err) {
        console.error(err);
        alert("حدث خطأ: " + err.message);
    } finally {
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}
