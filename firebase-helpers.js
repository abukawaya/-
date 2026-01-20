// ==================== FIREBASE DATABASE WRAPPERS ====================
// هذا الملف يحتوي على دوال مساعدة للتعامل مع Firebase بدلاً من localStorage

// التحقق من وجود Firebase
const useFirebase = typeof firebase !== 'undefined' && firebase.apps.length > 0;

console.log(useFirebase ? '🔥 Firebase متصل!' : '⚠️ Firebase غير متاح - استخدام localStorage');

// ==================== STUDENT MANAGEMENT ====================

// حفظ اسم الطالب الحالي
async function saveCurrentStudent(studentName) {
    if (useFirebase) {
        try {
            // حفظ في Firebase
            await db.collection('settings').doc('currentStudent').set({
                name: studentName,
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
            });

            // وحفظه أيضاً في localStorage كنسخة احتياطية
            localStorage.setItem('currentStudent', studentName);
            return true;
        } catch (error) {
            console.error('خطأ في حفظ الطالب في Firebase:', error);
            // في حالة الخطأ، استخدم localStorage
            localStorage.setItem('currentStudent', studentName);
            return false;
        }
    } else {
        // استخدام localStorage فقط
        localStorage.setItem('currentStudent', studentName);
        sessionStorage.setItem('currentStudent', studentName);
        return true;
    }
}

// إضافة طالب للقائمة
async function addStudentToList(studentName) {
    if (useFirebase) {
        try {
            // إضافة الطالب إلى Firestore
            await studentsCollection.add({
                name: studentName,
                registeredAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // تحديث localStorage أيضاً
            let list = JSON.parse(localStorage.getItem('studentsList') || '[]');
            if (!list.includes(studentName)) {
                list.push(studentName);
                localStorage.setItem('studentsList', JSON.stringify(list));
            }
            return true;
        } catch (error) {
            console.error('خطأ في إضافة الطالب:', error);
            // fallback to localStorage
            let list = JSON.parse(localStorage.getItem('studentsList') || '[]');
            if (!list.includes(studentName)) {
                list.push(studentName);
                localStorage.setItem('studentsList', JSON.stringify(list));
            }
            return false;
        }
    } else {
        // استخدام localStorage
        let list = JSON.parse(localStorage.getItem('studentsList') || '[]');
        if (!list.includes(studentName)) {
            list.push(studentName);
            localStorage.setItem('studentsList', JSON.stringify(list));
        }
        return true;
    }
}

// ==================== ACTIVITY LOGGING ====================

// تسجيل نشاط
async function logActivityToDatabase(studentName, action, details) {
    const activity = {
        student: studentName,
        action: action,
        details: details,
        timestamp: new Date().toISOString()
    };

    if (useFirebase) {
        try {
            // حفظ في Firebase
            await activitiesCollection.add(activity);

            // حفظ في localStorage كنسخة احتياطية
            let logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
            logs.push(activity);
            if (logs.length > 1000) logs.shift();
            localStorage.setItem('activityLogs', JSON.stringify(logs));

            return true;
        } catch (error) {
            console.error('خطأ في تسجيل النشاط:', error);
            // fallback to localStorage
            let logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
            logs.push(activity);
            if (logs.length > 1000) logs.shift();
            localStorage.setItem('activityLogs', JSON.stringify(logs));
            return false;
        }
    } else {
        // استخدام localStorage فقط
        let logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
        logs.push(activity);
        if (logs.length > 1000) logs.shift();
        localStorage.setItem('activityLogs', JSON.stringify(logs));
        return true;
    }
}

// ==================== DATA RETRIEVAL ====================

// جلب قائمة الطلاب
async function getStudentsList() {
    if (useFirebase) {
        try {
            const snapshot = await studentsCollection.get();
            const students = snapshot.docs.map(doc => doc.data().name);

            // إزالة التكرار
            return [...new Set(students)];
        } catch (error) {
            console.error('خطأ في جلب قائمة الطلاب:', error);
            // fallback to localStorage
            return JSON.parse(localStorage.getItem('studentsList') || '[]');
        }
    } else {
        return JSON.parse(localStorage.getItem('studentsList') || '[]');
    }
}

// جلب سجل النشاطات
async function getActivityLogs(limit = 100) {
    if (useFirebase) {
        try {
            const snapshot = await activitiesCollection
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error('خطأ في جلب سجل النشاطات:', error);
            // fallback to localStorage
            let logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
            return logs.slice().reverse().slice(0, limit);
        }
    } else {
        let logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
        return logs.slice().reverse().slice(0, limit);
    }
}

// مسح جميع السجلات (للAdmin فقط)
async function clearAllLogs() {
    if (useFirebase) {
        try {
            const batch = db.batch();
            const snapshot = await activitiesCollection.get();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // مسح localStorage أيضاً
            localStorage.setItem('activityLogs', '[]');
            return true;
        } catch (error) {
            console.error('خطأ في مسح السجلات:', error);
            return false;
        }
    } else {
        localStorage.setItem('activityLogs', '[]');
        return true;
    }
}

// ==================== STATE SYNCING ====================

// مزامنة حالة الطالب الكاملة (المواد، السجل، المؤقتات)
async function syncStudentState(studentName, data) {
    if (!useFirebase || !studentName) return false;

    try {
        await studentsCollection.doc(studentName).set({
            ...data,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error('خطأ في مزامنة بيانات الطالب:', error);
        return false;
    }
}
