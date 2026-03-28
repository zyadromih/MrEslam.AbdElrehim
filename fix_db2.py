import codecs
import re

with codecs.open(r'd:\corse\app.js', 'r', 'utf-8') as f:
    text = f.read()

# Normalize newlines
text = text.replace('\r\n', '\n')

# 1. Remove firestore initialization
text = re.sub(r'const db = firebase\.firestore\(\);', '', text)

# 2. Add local storage loads
old_vars = r'''let products = \[\]; // سيتم جلبها من Firestore
let categoriesList = \[\]; // سيتم جلبها من Firestore'''

new_vars = '''let products = JSON.parse(localStorage.getItem("products")) || (window.initialProducts || []);
let categoriesList = JSON.parse(localStorage.getItem("categoriesList")) || (window.initialCategories || ["كورسات عامة"]);'''
text = re.sub(old_vars, new_vars, text)

old_articles = r'''let articles = \[\];
let quizzes = \[\];'''

new_articles = '''let articles = JSON.parse(localStorage.getItem("articles")) || [];
let quizzes = JSON.parse(localStorage.getItem("quizzes")) || [];
function generateId() { return Math.random().toString(36).substr(2, 9); }
function saveArticles() { localStorage.setItem("articles", JSON.stringify(articles)); }
function saveQuizzes() { localStorage.setItem("quizzes", JSON.stringify(quizzes)); }
function saveHome() { localStorage.setItem("homeInfo", JSON.stringify(homeInfo)); }'''
text = re.sub(old_articles, new_articles, text)

# 3. Remove onSnapshot blocks
new_snapshots = '''
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
'''
text = re.sub(r'// جلب التصنيفات من Firestore في الوقت الفعلي[\s\S]*?checkUrlForCourse\(\);\n    \}\n\}\);', new_snapshots, text)
text = re.sub(r'// جلب المقالات\ndb\.collection\("articles"\)[\s\S]*?\}\);\n', '', text)
text = re.sub(r'// جلب التدريبات\ndb\.collection\("quizzes"\)[\s\S]*?\}\);\n', '', text)

# 4. update addCategory
old_addCategory = r'''try \{
        await db\.collection\("categories"\)\.add\(\{
            name: catName,
            createdAt: new Date\(\)
        \}\);
        document\.getElementById\("newCategoryName"\)\.value = "";
        alert\("تم إضافة التصنيف بنجاح!"\);
    \} catch \(error\) \{
        console\.error\("Error adding category:", error\);
        alert\("حدث خطأ أثناء إضافة التصنيف\."\);
    \}'''
new_addCategory = '''categoriesList.push(catName);
    saveCategories();
    render();
    document.getElementById("newCategoryName").value = "";
    alert("تم إضافة التصنيف بنجاح!");'''
text = re.sub(old_addCategory, new_addCategory, text)

# 5. update delCategory
old_delCategory = r'''try \{
            const query = await db\.collection\("categories"\)\.where\("name", "==", catName\)\.get\(\);
            const batch = db\.batch\(\);
            query\.forEach\(doc => batch\.delete\(doc\.ref\)\);
            await batch\.commit\(\);
            alert\("تم حذف التصنيف\."\);
        \} catch \(error\) \{
            console\.error\("Error deleting category:", error\);
            alert\("حدث خطأ أثناء حذف التصنيف\."\);
        \}'''
new_delCategory = '''categoriesList = categoriesList.filter(c => c !== catName);
            saveCategories();
            render();
            alert("تم حذف التصنيف.");'''
text = re.sub(old_delCategory, new_delCategory, text)

# 6. update editCoursePrompt
old_editCoursePrompt = r'''try \{
            await db\.collection\("products"\)\.doc\(p\.id\)\.update\(\{
                name: newName,
                price: parseFloat\(newPrice\),
                description: newDesc
            \}\);
            alert\("تم التعديل بنجاح"\);
        \} catch \(e\) \{
            alert\("خطأ في التعديل: " \+ e\.message\);
        \}'''
new_editCoursePrompt = '''p.name = newName;
            p.price = parseFloat(newPrice);
            p.description = newDesc;
            save();
            render();
            alert("تم التعديل بنجاح");'''
text = re.sub(old_editCoursePrompt, new_editCoursePrompt, text)

# 7. update addCourse
old_addCourseDB = r'''// 2\. حفظ البيانات في Firestore
        await db\.collection\("products"\)\.add\(\{
            name: name,
            price: parseFloat\(price\),
            category: category,
            description: document\.getElementById\("desc"\) \? document\.getElementById\("desc"\)\.value\.trim\(\) : "",
            imageUrl: imageUrl,
            createdAt: new Date\(\)
        \}\);'''
new_addCourseDB = '''// 2. حفظ البيانات في المتصفح
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
        render();'''
text = re.sub(old_addCourseDB, new_addCourseDB, text)

# 8. update del (delete course)
old_del = r'''// إذا كان المنتج يحتوي على id \(من Firestore\)، نحذفه من هناك
        const product = products\[idOrIndex\];
        if \(product && product\.id\) \{
            try \{
                await db\.collection\("products"\)\.doc\(product\.id\)\.delete\(\);
                alert\("تم حذف الكورس بنجاح!"\);
            \} catch \(error\) \{
                console\.error\("Error deleting course:", error\);
                alert\("حدث خطأ أثناء الحذف\."\);
            \}
        \} else \{
            // كحالة احتياطية للمنتجات المحلية القديمة
            products\.splice\(idOrIndex, 1\);
            save\(\);
            render\(\);
        \}'''
new_del = '''products.splice(idOrIndex, 1);
        save();
        render();
        alert("تم حذف الكورس بنجاح!");'''
text = re.sub(old_del, new_del, text)

# 9. update addArticle
old_addArtDB = r'''await db\.collection\("articles"\)\.add\(\{ title, content, createdAt: new Date\(\) \}\);'''
new_addArtDB = '''articles.push({ id: generateId(), title, content, createdAt: new Date().getTime() });
    saveArticles();
    renderArticles();'''
text = re.sub(old_addArtDB, new_addArtDB, text)

# 10. update editArticlePrompt
old_editArtDB = r'''await db\.collection\("articles"\)\.doc\(id\)\.update\(\{ title: newTitle, content: newContent \}\);'''
new_editArtDB = '''art.title = newTitle; art.content = newContent; saveArticles(); renderArticles();'''
text = re.sub(old_editArtDB, new_editArtDB, text)

# 11. update deleteArticle
old_delArtDB = r'''if \(confirm\("حذف\?"\)\) await db\.collection\("articles"\)\.doc\(id\)\.delete\(\);'''
new_delArtDB = '''if (confirm("حذف؟")) { articles = articles.filter(a => a.id !== id); saveArticles(); renderArticles(); }'''
text = re.sub(old_delArtDB, new_delArtDB, text)

# 12. update addQuiz
old_addQuizDB = r'''await db\.collection\("quizzes"\)\.add\(\{
        question,
        expirationTime,
        link: linkInput,
        createdAt: new Date\(\)
    \}\);'''
new_addQuizDB = '''quizzes.push({
        id: generateId(),
        question,
        expirationTime,
        link: linkInput,
        createdAt: new Date().getTime()
    });
    saveQuizzes();
    renderQuizzes();'''
text = re.sub(old_addQuizDB, new_addQuizDB, text)

# 13. update deleteQuizWithoutPrompt
old_delQuizWPDB = r'''try \{
        // حذف التدريب المنتهي بدون إشعار
        await db\.collection\("quizzes"\)\.doc\(id\)\.delete\(\);
    \} catch \(e\) \{ \}'''
new_delQuizWPDB = '''quizzes = quizzes.filter(q => q.id !== id);
    saveQuizzes();'''
text = re.sub(old_delQuizWPDB, new_delQuizWPDB, text)

# 14. update editQuizPrompt
old_editQuizDB = r'''await db\.collection\("quizzes"\)\.doc\(id\)\.update\(\{ question: newQ \}\);'''
new_editQuizDB = '''q.question = newQ; saveQuizzes(); renderQuizzes();'''
text = re.sub(old_editQuizDB, new_editQuizDB, text)

# 15. update deleteQuiz
old_delQuizDB = r'''if \(confirm\("حذف\?"\)\) await db\.collection\("quizzes"\)\.doc\(id\)\.delete\(\);'''
new_delQuizDB = '''if (confirm("حذف؟")) { quizzes = quizzes.filter(q => q.id !== id); saveQuizzes(); renderQuizzes(); }'''
text = re.sub(old_delQuizDB, new_delQuizDB, text)


# 16. update HomeInfo
old_homeInfoDB = r'''// جلب معلومات الرئيسية\ndb\.collection\("settings"\)\.doc\("homeInfo"\)\.onSnapshot\(\(doc\) => \{[\s\S]*?renderHomeInfo\(\);\n\}\);'''
new_homeInfoDB = '''// Home info already loaded from local storage using JSON.parse
let homeInfo = JSON.parse(localStorage.getItem("homeInfo")) || {
    name: "الأستاذ إسلام عبدالرحيم",
    bio: "<p>خريج كلية دار العلوم – قسم اللغة العربية والشريعة الإسلامية، بتقدير ممتاز مع مرتبة الشرف.</p>",
    image: "WhatsApp Image 2026-02-21 at 7.37.11 PM (2).jpg"
};
setTimeout(() => renderHomeInfo(), 200);'''
text = re.sub(old_homeInfoDB, new_homeInfoDB, text)

old_saveHomeInfoDB = r'''await db\.collection\("settings"\)\.doc\("homeInfo"\)\.set\(\{
            name: name,
            bio: formattedBio,
            image: imageUrl
        \}, \{ merge: true \}\);'''
new_saveHomeInfoDB = '''homeInfo.name = name;
        homeInfo.bio = formattedBio;
        homeInfo.image = imageUrl;
        saveHome();
        renderHomeInfo();'''
text = re.sub(old_saveHomeInfoDB, new_saveHomeInfoDB, text)

# Just in case `let homeInfo` was duplicated 
text = re.sub(r'let homeInfo = \{[\s\S]*?WhatsApp Image.*?\}\;', '', text)

with codecs.open(r'd:\corse\app.js', 'w', 'utf-8') as f:
    f.write(text)

print("DB occurrences remaining:", text.count("db.collection"))
