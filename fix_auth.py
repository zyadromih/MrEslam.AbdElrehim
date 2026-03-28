import codecs
import re

with codecs.open(r'd:\corse\app.js', 'r', 'utf-8') as f:
    text = f.read()

# Replace login
text = re.sub(
    r'function login\(\) \{.*?alert\("الرقم السري خاطئ!"\);\s*\}\s*\}',
    '''function login() {
    let pass = document.getElementById("adminPass").value;
    let email = "eng.emara888@gmail.com";
    
    // إيقاف الزر لتجنب التكرار
    const loginBox = document.getElementById("loginBox");
    const btns = loginBox.getElementsByTagName("button");
    const loginBtn = btns[0];
    const originalText = loginBtn.innerText;
    
    loginBtn.innerText = "جاري التحقق...";
    loginBtn.disabled = true;

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            admin = true;
            sessionStorage.setItem("isAdmin", "true");
            document.getElementById("loginBox").style.display = "none";
            document.getElementById("adminPass").value = "";
            render();
            if (typeof renderArticles === 'function') renderArticles();
            if (typeof renderQuizzes === 'function') renderQuizzes();
        })
        .catch((error) => {
            console.error(error);
            alert("الرقم السري خاطئ!");
        })
        .finally(() => {
            loginBtn.innerText = originalText;
            loginBtn.disabled = false;
        });
}''',
    text,
    flags=re.DOTALL
)

# Replace logout
text = re.sub(
    r'function logout\(\) \{.*?\}\s*// دالة إضافة مقال',
    '''function logout() {
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

// دالة إضافة مقال''',
    text,
    flags=re.DOTALL
)

with codecs.open(r'd:\corse\app.js', 'w', 'utf-8') as f:
    f.write(text)
