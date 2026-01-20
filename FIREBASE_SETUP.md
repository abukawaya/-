# 🔥 دليل إعداد Firebase للموقع

## الخطوة 1️⃣: إنشاء مشروع Firebase

1. اذهب إلى: https://console.firebase.google.com/
2. اضغط على **"إضافة مشروع"** (Add project)
3. أدخل اسم المشروع (مثلاً: `school-task-manager`)
4. اضغط **متابعة** ← **متابعة** ← **إنشاء المشروع**

## الخطوة 2️⃣: إنشاء تطبيق ويب

1. من لوحة التحكم، اضغط على أيقونة **`</>`** (Web)
2. أدخل اسم التطبيق (مثلاً: `School Manager Web`)
3. **لا تفعّل** Firebase Hosting (ليس مطلوباً)
4. اضغط **تسجيل التطبيق**

## الخطوة 3️⃣: نسخ إعدادات Firebase

ستظهر لك شفرة JavaScript تحتوي على `firebaseConfig` مثل:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxx"
};
```

**انسخ هذه القيم** ← افتح ملف `firebase-config.js` ← **استبدل القيم الموجودة**

## الخطوة 4️⃣: تفعيل Firestore Database

1. من القائمة الجانبية، اختر **Firestore Database**
2. اضغط **إنشاء قاعدة بيانات** (Create database)
3. اختر **البدء في وضع الاختبار** (Start in test mode)
4. اختر أقرب موقع جغرافي (مثلاً: `europe-west1`)
5. اضغط **تفعيل** (Enable)

## الخطوة 5️⃣: ضبط قواعد الأمان (مؤقتاً)

اذهب لـ **قواعد** (Rules) في Firestore، واستبدل الكود بهذا:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for testing (للاختبار فقط!)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ **تحذير**: هذا للاختبار فقط! سنحدث القواعد لاحقاً لحماية البيانات.

## الخطوة 6️⃣: رفع الموقع على GitHub Pages

1. ارفع جميع الملفات المحدثة إلى GitHub
2. من **Settings** → **Pages**
3. اختر `main` branch → **حفظ**
4. انتظر 1-2 دقيقة حتى ينشر الموقع

## ✅ اختبار النظام

1. افتح موقعك على GitHub Pages
2. سجل اسم طالب
3. افتح `admin.html`
4. يجب أن ترى الطالب! 🎉

## 🔒 قواعد الأمان النهائية (بعد الاختبار)

استبدل قواعد Firestore بهذا:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Students: read for all, write only for authenticated
    match /students/{studentId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Activities: read for all, write only for authenticated
    match /activities/{activityId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 🆘 حل المشاكل

### المشكلة: لا تظهر البيانات
- تأكد من نسخ `firebaseConfig` بشكل صحيح
- تحقق من Console للأخطاء (F12)
- تأكد من تفعيل Firestore Database

### المشكلة: خطأ "Permission Denied"
- راجع قواعد Firestore (Rules)
- تأكد من تفعيل وضع Test Mode

---

**جاهز! الآن موقعك يعمل مع قاعدة بيانات سحابية** 🚀
