const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Data Management - Initial Load
let activityLogs = [];
let students = [];

async function loadAdminData() {
    // جلب البيانات من Firebase أو localStorage
    students = await getStudentsList();
    activityLogs = await getActivityLogs(100);
}

document.addEventListener('DOMContentLoaded', () => {
    // Check if admin is already logged in (session)
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showDashboard();
    }
});

function checkAdminPass() {
    const input = document.getElementById('adminPassInput').value;
    if (input === 'admin123') { // Simple password
        sessionStorage.setItem('adminLoggedIn', 'true');
        showDashboard();
    } else {
        alert('كلمة المرور غير صحيحة!');
    }
}

async function showDashboard() {
    await loadAdminData(); // تحميل البيانات من Firebase
    document.getElementById('adminLogin').classList.add('hidden');
    document.getElementById('adminContent').classList.remove('hidden');
    renderLogs();
    renderStudents();
}

function renderLogs() {
    const tbody = document.getElementById('logsTableBody');
    tbody.innerHTML = '';

    // Show recent logs
    const recentLogs = activityLogs;

    if (recentLogs.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" style="text-align: center; color: #888;">لا توجد نشاطات حتى الآن</td>`;
        tbody.appendChild(row);
        return;
    }

    recentLogs.forEach(log => {
        const row = document.createElement('tr');
        const timestamp = new Date(log.timestamp);
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
                    <span>${log.student}</span>
                    <div style="width: 24px; height: 24px; background: #6366f1; border-radius: 50%; border: 1px solid #fff;"></div>
                </div>
            </td>
            <td>${log.action}</td>
            <td style="color: #aaa; font-size: 0.9em;">${log.details}</td>
            <td style="color: #888; font-size: 0.85em;">${timestamp.toLocaleTimeString('ar-SA')}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderStudents() {
    const container = document.getElementById('studentsList');
    container.innerHTML = '';

    if (students.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center;">لا يوجد طلاب مسجلين حتى الآن</p>';
        return;
    }

    students.forEach(name => {
        const div = document.createElement('div');
        div.className = 'student-item';
        div.style.cursor = 'pointer';
        div.onclick = () => showStudentDetails(name);
        div.innerHTML = `
            <div class="student-avatar">${name.charAt(0)}</div>
            <div style="flex: 1; margin-right: 15px;">
                <h4 style="margin: 0;">${name}</h4>
                <p style="margin: 0; font-size: 12px; color: #aaa;">آخر نشاط: ${getLastSeen(name)}</p>
            </div>
            <div style="color: #6366f1;">👁️</div>
        `;
        container.appendChild(div);
    });
}

function getLastSeen(name) {
    const lastLog = activityLogs.find(l => l.student === name);
    if (!lastLog) return 'غير متوفر';
    return new Date(lastLog.timestamp).toLocaleDateString('ar-SA');
}

async function clearLogs() {
    if (confirm('هل أنت متأكد من مسح جميع السجلات؟')) {
        await clearAllLogs();
        activityLogs = [];
        renderLogs();
    }
}

async function analyzeData() {
    const btn = document.querySelector('.btn-ai');
    const resultCard = document.getElementById('aiAnalysisCard');
    const resultContent = document.getElementById('aiResultContent');

    btn.innerHTML = `<div class="spinner"></div> جاري التحليل...`;
    btn.disabled = true;
    resultCard.classList.remove('hidden');
    resultContent.innerHTML = 'جاري الاتصال بالذكاء الاصطناعي لتلخيص البيانات...';

    try {
        const summary = await prepareDataForAI();
        const analysis = await callGroqAPI(summary);

        resultContent.innerHTML = analysis
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fbbf24">$1</strong>')
            .replace(/- /g, '<br>• ');

    } catch (error) {
        resultContent.innerHTML = `<span style="color: #ef4444">حدث خطأ: ${error.message}</span>`;
    } finally {
        btn.innerHTML = `<span>🤖</span> تحليل الذكاء الاصطناعي`;
        btn.disabled = false;
    }
}

// ==================== AI ANALYSIS FIX ====================

async function prepareDataForAI() {
    // 1. Get Basic Stats
    const totalLogs = activityLogs.length;
    const activeStudents = students.length;

    // 2. Fetch Deep Data for ALL Students (for accurate analysis)
    let studentsSummary = [];

    const studentPromises = students.slice(0, 10).map(async (name) => {
        const data = await fetchStudentDetails(name);
        if (!data) return `${name}: بيانت غير متوفرة`;

        const today = new Date().toISOString().split('T')[0];
        const history = data.readingHistory || {};

        // Calculate Total Completed Subjects All Time
        let totalCompleted = 0;
        Object.values(history).forEach(day => {
            totalCompleted += Object.values(day).filter(v => v).length;
        });

        // Get Today's Completed
        const todayCompleted = history[today] ? Object.keys(history[today]).filter(k => history[today][k]).length : 0;

        return `- الطالب ${name}: أنجز ${totalCompleted} مادة إجمالياً (${todayCompleted} اليوم).`;
    });

    const detailedReports = await Promise.all(studentPromises);

    return `
    تقرير حالة المنصة التعليمية:
    - عدد الطلاب: ${activeStudents}
    - إجمالي النشاطات المسجلة: ${totalLogs}
    
    تفاصيل أداء الطلاب (عينة):
    ${detailedReports.join('\n')}
    
    المطلوب:
    قدم تحليلاً ذكياً للمشرف. اذكر بالاسم الطلاب المجتهدين بناءً على عدد المواد المنجزة. لا تعتمد فقط على "الدخول للموقع" بل ركز على الإنجاز الفعلي للمواد.
    `;
}

async function callGroqAPI(prompt) {
    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "meta-llama/llama-4-maverick-17b-128e-instruct",
                messages: [
                    { role: "system", content: "أنت مساعد ذكي للمشرف التربوي. تتقن اللغة العربية وتحلل البيانات بدقة." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq API Error:', response.status, errorText);
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Call Groq API Failed:', error);
        throw error; // Re-throw to be caught by caller
    }
}

// ==================== STUDENT DETAILS MODAL ====================

async function fetchStudentDetails(studentName) {
    if (!useFirebase) return null;
    try {
        const doc = await studentsCollection.doc(studentName).get();
        if (doc.exists) {
            return doc.data();
        }
    } catch (error) {
        console.error('Error fetching student details:', error);
    }
    return null;
}

// ==================== NEW STUDENT PROFILE SECTION ====================

async function showStudentDetails(studentName) {
    // We are now redirecting to the Full Page Profile instead of Modal
    showStudentProfile(studentName);
}

async function showStudentProfile(studentName) {
    const dashboard = document.getElementById('adminContent');
    const profileSection = document.getElementById('studentProfileSection');

    // UI Elements
    const nameEl = document.getElementById('profileName');
    const avatarEl = document.getElementById('profileAvatar');
    const streakEl = document.getElementById('profileStreak');
    const timeEl = document.getElementById('profileTotalTime');
    const completionEl = document.getElementById('profileCompletion');
    const tbody = document.getElementById('profileTableBody');
    const timelineContainer = document.getElementById('profileTimeline');

    // Show Loading
    dashboard.classList.add('hidden');
    profileSection.classList.remove('hidden');
    nameEl.textContent = studentName;
    avatarEl.textContent = studentName.charAt(0);
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #888; padding: 30px;">جاري جلب البيانات...</td></tr>';

    const data = await fetchStudentDetails(studentName);

    if (!data) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #888;">لا توجد بيانات لهذا الطالب</td></tr>';
        return;
    }

    // Process Data
    const today = new Date().toISOString().split('T')[0];
    const todayReadings = data.readingHistory?.[today] || {};
    const subjects = data.subjects || [];

    // Stats Calculation
    const completedToday = Object.keys(todayReadings).filter(s => todayReadings[s]);
    const completionRate = Math.round((completedToday.length / (subjects.length || 1)) * 100);

    let totalTimeMinutes = 0;
    if (data.studyTimers) {
        Object.values(data.studyTimers).forEach(t => totalTimeMinutes += (t.totalTime || 0) / 60);
    }

    // Update Header Stats
    streakEl.textContent = calculateStreakFromHistory(data.readingHistory) || '0';
    timeEl.textContent = (totalTimeMinutes / 60).toFixed(1);
    completionEl.textContent = `${completionRate}%`;

    // Populate Premium Table
    tbody.innerHTML = '';
    subjects.forEach(subject => {
        const isCompleted = todayReadings[subject];
        const timerData = data.studyTimers?.[subject] || { totalTime: 0 };
        const totalMinutes = Math.floor(timerData.totalTime / 60);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600; color: #f8fafc;">${subject}</td>
            <td>
                <span class="status-badge ${isCompleted ? 'status-completed' : 'status-pending'}">
                    ${isCompleted ? '✅ مكتمل' : '⏳ قيد الانتظار'}
                </span>
            </td>
            <td>
                <span class="time-badge">${totalMinutes} دقيقة</span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Populate Timeline (from activityLogs filtered for this student)
    const studentLogs = activityLogs.filter(l => l.student === studentName).slice(0, 10);
    timelineContainer.innerHTML = studentLogs.map(log => `
        <div class="timeline-item">
            <div class="timeline-time">${new Date(log.timestamp).toLocaleTimeString('ar-SA')}</div>
            <div class="timeline-text">${log.action} - ${log.details}</div>
        </div>
    `).join('') || '<div style="color:#64748b; padding:10px;">لا توجد نشاطات حديثة</div>';
}

function calculateStreakFromHistory(history) {
    if (!history) return 0;
    let streak = 0;
    let checkDate = new Date();
    while (true) {
        const dateKey = checkDate.toISOString().split('T')[0];
        const dayReadings = history[dateKey] || {};
        const readCount = Object.values(dayReadings).filter(v => v).length;
        if (readCount === 0 && streak > 0) break; // Allow missing today
        if (readCount > 0) streak++;
        checkDate.setDate(checkDate.getDate() - 1);
        if (streak > 365) break;
    }
    return streak;
}

function closeStudentProfile() {
    document.getElementById('studentProfileSection').classList.add('hidden');
    document.getElementById('adminContent').classList.remove('hidden');
}

// Make globally available
window.showStudentDetails = showStudentDetails; // Keep old entry point working
window.closeStudentProfile = closeStudentProfile;
