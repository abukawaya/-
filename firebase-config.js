// ==================== FIREBASE CONFIGURATION ====================
// هذا الملف يحتوي على إعدادات Firebase
// IMPORTANT: استبدل القيم أدناه بقيمك الخاصة من Firebase Console

const firebaseConfig = {
    apiKey: "AIzaSyAARTJAVls36vIKeEBTSaPdQSad5jTEVgU",
    authDomain: "school-task-manager-14ce4.firebaseapp.com",
    projectId: "school-task-manager-14ce4",
    storageBucket: "school-task-manager-14ce4.firebasestorage.app",
    messagingSenderId: "215189323409",
    appId: "1:215189323409:web:77247db6d6f462eaf54930"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Collections
const studentsCollection = db.collection('students');
const activitiesCollection = db.collection('activities');
const settingsCollection = db.collection('settings');
