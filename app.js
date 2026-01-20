// ==================== AI CHATBOT INTEGRATION ==================== 
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TTS_URL = 'https://api.groq.com/openai/v1/audio/speech';

// Chat DOM Elements
const chatWidget = {
    toggleBtn: document.getElementById('chatToggleBtn'),
    window: document.getElementById('chatWindow'),
    closeBtn: document.getElementById('chatCloseBtn'),
    messagesContainer: document.getElementById('chatMessages'),
    input: document.getElementById('chatInput'),
    sendBtn: document.getElementById('chatSendBtn'),
    voiceBtn: document.getElementById('chatVoiceBtn'),
    isOpen: false,
    history: [],
    voiceModeActive: false,
    currentAudio: null
};

// Event Listeners
document.addEventListener('DOMContentLoaded', setupChat);

function setupChat() {
    chatWidget.toggleBtn.addEventListener('click', toggleChat);
    chatWidget.closeBtn.addEventListener('click', toggleChat);
    chatWidget.sendBtn.addEventListener('click', sendMessage);
    chatWidget.voiceBtn.addEventListener('click', toggleVoiceMode);
    chatWidget.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

function toggleChat() {
    chatWidget.isOpen = !chatWidget.isOpen;
    if (chatWidget.isOpen) {
        chatWidget.window.classList.remove('hidden');
        chatWidget.input.focus();
        if (chatWidget.history.length === 0) {
            setTimeout(() => {
                appendMessage('مرحباً! 👋 أنا مساعدك الذكي للدراسة. كيف يمكنني مساعدتك اليوم؟', 'bot');
            }, 300);
        }
    } else {
        chatWidget.window.classList.add('hidden');
        stopCurrentAudio();
    }
}

function toggleVoiceMode() {
    chatWidget.voiceModeActive = !chatWidget.voiceModeActive;

    if (chatWidget.voiceModeActive) {
        chatWidget.voiceBtn.classList.add('active');
        chatWidget.voiceBtn.innerHTML = `
            <svg class="voice-icon active" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
            <span class="voice-wave"></span>
            <span class="voice-wave"></span>
            <span class="voice-wave"></span>
        `;
        showNotification('🎤 الوضع الصوتي مفعّل - سأرد عليك بالصوت!', 'success');
    } else {
        chatWidget.voiceBtn.classList.remove('active');
        chatWidget.voiceBtn.innerHTML = `
            <svg class="voice-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
        `;
        stopCurrentAudio();
        showNotification('🔇 الوضع الصوتي معطّل', 'info');
    }
}

async function sendMessage() {
    const text = chatWidget.input.value.trim();
    if (!text) return;

    chatWidget.input.disabled = true;
    chatWidget.sendBtn.disabled = true;
    chatWidget.sendBtn.classList.add('loading');

    appendMessage(text, 'user');
    chatWidget.input.value = '';
    showTypingIndicator();

    try {
        const context = prepareContext();
        const response = await callGroqAPI(text, context);
        removeTypingIndicator();
        appendMessage(response, 'bot');

        if (chatWidget.voiceModeActive) {
            await playAudioResponse(response);
        }
    } catch (error) {
        removeTypingIndicator();
        appendMessage('عذراً، حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى. 🔄', 'bot');
        console.error('Chat Error:', error);
    } finally {
        chatWidget.input.disabled = false;
        chatWidget.sendBtn.disabled = false;
        chatWidget.sendBtn.classList.remove('loading');
        chatWidget.input.focus();
    }
}

async function playAudioResponse(text) {
    try {
        stopCurrentAudio();

        const cleanText = text.replace(/\*\*/g, '').replace(/<[^>]*>/g, '').trim();

        showVoiceIndicator('جاري تحويل النص إلى صوت...');

        const response = await fetch(GROQ_TTS_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "canopylabs/orpheus-arabic-saudi",
                voice: "fahad",
                input: cleanText,
                response_format: "wav"
            })
        });

        if (!response.ok) {
            throw new Error(`TTS API Error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        chatWidget.currentAudio = new Audio(audioUrl);

        updateVoiceIndicator('🔊 يتم التشغيل...');

        chatWidget.currentAudio.onended = () => {
            hideVoiceIndicator();
            URL.revokeObjectURL(audioUrl);
            chatWidget.currentAudio = null;
        };

        chatWidget.currentAudio.onerror = () => {
            hideVoiceIndicator();
            showNotification('⚠️ حدث خطأ في تشغيل الصوت', 'info');
        };

        await chatWidget.currentAudio.play();

    } catch (error) {
        console.error('TTS Error:', error);
        hideVoiceIndicator();
        showNotification('⚠️ تعذر تحويل النص إلى صوت', 'info');
    }
}

function stopCurrentAudio() {
    if (chatWidget.currentAudio) {
        chatWidget.currentAudio.pause();
        chatWidget.currentAudio.currentTime = 0;
        chatWidget.currentAudio = null;
        hideVoiceIndicator();
    }
}

function showVoiceIndicator(message) {
    let indicator = document.getElementById('voiceIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'voiceIndicator';
        indicator.className = 'voice-indicator';
        chatWidget.messagesContainer.appendChild(indicator);
    }
    indicator.innerHTML = `
        <div class="voice-indicator-content">
            <div class="voice-wave-animation">
                <span></span><span></span><span></span><span></span><span></span>
            </div>
            <span class="voice-message">${message}</span>
        </div>
    `;
    scrollToBottom();
}

function updateVoiceIndicator(message) {
    const indicator = document.getElementById('voiceIndicator');
    if (indicator) {
        const messageEl = indicator.querySelector('.voice-message');
        if (messageEl) messageEl.textContent = message;
    }
}

function hideVoiceIndicator() {
    const indicator = document.getElementById('voiceIndicator');
    if (indicator) indicator.remove();
}

function appendMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}-message`;
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    div.innerHTML = formattedText;
    chatWidget.messagesContainer.appendChild(div);
    scrollToBottom();
    chatWidget.history.push({
        role: sender === 'user' ? 'user' : 'assistant',
        content: text
    });
}

function showTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'typingIndicator';
    div.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
    chatWidget.messagesContainer.appendChild(div);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

function scrollToBottom() {
    chatWidget.messagesContainer.scrollTop = chatWidget.messagesContainer.scrollHeight;
}

function prepareContext() {
    const dateKey = getDateKey();
    const todayReadings = readingHistory[dateKey] || {};
    const completedSubjects = Object.keys(todayReadings).filter(s => todayReadings[s]);
    const remainingSubjects = subjects.filter(s => !completedSubjects.includes(s));
    const progress = document.getElementById('todayProgress').textContent;
    let totalStudyTimeToday = 0;
    let subjectTimesToday = [];
    subjects.forEach(subject => {
        const todayTime = getTodayStudyTime(subject);
        totalStudyTimeToday += todayTime;
        if (todayTime > 0) {
            subjectTimesToday.push({
                subject: subject,
                time: formatTime(todayTime)
            });
        }
    });
    const activeTimerInfo = activeTimer ? `المؤقت النشط: ${activeTimer.subject}` : 'لا يوجد مؤقت نشط';
    return `أنت مساعد دراسي ذكي في تطبيق "إتقان – منصة إدارة المهام الدراسية".

نبذة عن صانع التطبيق:
- الاسم: محمد عبد المطلب
- طالب بالصف الاول ثانوي اي بنفس عمر الطلاب الذي صنع لهم هذا التطبيق 
احرز المركز الخامس في امتحانات الشهادة المتوسط بمجموع 276
مطوّر شغوف بالبرمجة والتقنية
- يهتم ببناء أدوات تعليمية ذكية تساعد الطلاب على التنظيم والتفوق
- يتعلم يوميًا ويحب تطوير المواقع والتطبيقات باستخدام JavaScript والذكاء الاصطناعي
- صمّم تطبيق "إتقان" ليكون مساعدًا حقيقيًا للطلاب في إدارة الوقت والمهام الدراسية بذكاء
الطالب سينزل يوم الاحد امتحانات الثلث الاول الجدول كالاتي
يوم الاحد:التربية  الاسلامية   و الكيمياء
يوم الثلاثاء:الانجيليزي و الاحياء
يوم الخميس:الرياضيات و الجغرافيا
يوم السبت:اللغة العربية و ريادة الاعمال
يوم الاحد :عطلة رسمية 
يوم الثلاثاء:الفيزياء و التاريخ
يوم الخميس:الهندسية و الحاسوب
يوم السبت :التربية الوطنية و الفنية
انشئ جدول مناسب و خطط للامتحانات و دائم ذكر الطالب ب الامتحانات و اسأله من اسماء الدروس لكي تساعده ان احتاج لذلك
هذا جدول الامتحانات انت انشئ  له خطة مناسبة من اليوم الحالي الامتحانات بتبدأ يوم الاحد كما في الجدول يوم 18 شهر 1 العام 2026
بيانات الطالب الحالية:

- التاريخ: ${new Date().toLocaleDateString('ar-SA')}
- نسبة الإنجاز اليوم: ${progress}
- المواد المنجزة اليوم: ${completedSubjects.join(', ') || 'لا يوجد بعد'}
- المواد المتبقية: ${remainingSubjects.join(', ')}
- إجمالي القراءات (طوال الوقت): ${document.getElementById('totalReadings').textContent}
- أيام متتالية (Streak): ${document.getElementById('streakNumber').textContent}
- وقت المذاكرة اليوم: ${formatTime(totalStudyTimeToday)}
- ${activeTimerInfo}
- المواد التي تمت دراستها اليوم: ${subjectTimesToday.map(s => `${s.subject} (${s.time})`).join(', ') || 'لم يتم البدء بعد'}

التعليمات:
- تحدث باللغة العربية بلهجة مشجعة وودودة.
- اجعل إجاباتك قصيرة ومختصرة (فقرة واحدة أو نقاط).
- استخدم الإيموجي المناسبة 📚✨⏱️
- شجع الطالب على إكمال المواد المتبقية واستخدام المؤقت.
- قدم نصائح ذكية حول تنظيم الوقت وجدولة المذاكرة.`;
}

async function callGroqAPI(userMessage, systemContext) {
    if (GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
        return "الرجاء إدخال مفتاح Groq API في ملف JavaScript لتفعيل الذكاء الاصطناعي.";
    }
    const messages = [
        { role: "system", content: systemContext },
        ...chatWidget.history.slice(-5),
        { role: "user", content: userMessage }
    ];
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "meta-llama/llama-4-maverick-17b-128e-instruct",
            messages: messages,
            temperature: 0.7,
            max_tokens: 500
        })
    });
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
}

// ==================== DATA STRUCTURE ==================== 
const DEFAULT_SUBJECTS = [
    'القرآن الكريم والتربية الإسلامية', 'اللغة العربية', 'اللغة الإنجليزية',
    'الرياضيات', 'الفيزياء', 'الكيمياء', 'الأحياء', 'علوم الحاسوب',
    'العلوم الهندسية', 'الفنون والتصميم', 'ريادة الأعمال', 'التاريخ',
    'الجغرافيا', 'التربية الوطنية'
];

// ==================== STATE MANAGEMENT ==================== 
let subjects = [];
let readingHistory = {};
let studyTimers = {};
let activeTimer = null;
let currentDate = new Date();
// Try localStorage first (permanent), then sessionStorage (session only)
let currentStudent = localStorage.getItem('currentStudent') || sessionStorage.getItem('currentStudent');

// ==================== INITIALIZATION ==================== 
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    updateUI();
});

function initializeApp() {
    checkStudentLogin(); // NEW: Check login first
    loadData();
    displayCurrentDate();
    renderSubjects();
    updateStats();
    updateProgressBar();
    if (currentStudent) {
        logActivity('زيارة', 'دخول الطالب للموقع');
        generateAIAnalysis();
    }
}

function loadData() {
    const savedSubjects = localStorage.getItem('subjects');
    const savedHistory = localStorage.getItem('readingHistory');
    const savedTimers = localStorage.getItem('studyTimers');
    subjects = savedSubjects ? JSON.parse(savedSubjects) : [...DEFAULT_SUBJECTS];
    readingHistory = savedHistory ? JSON.parse(savedHistory) : {};
    studyTimers = savedTimers ? JSON.parse(savedTimers) : {};
}

function saveData() {
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('readingHistory', JSON.stringify(readingHistory));
    localStorage.setItem('studyTimers', JSON.stringify(studyTimers));

    // Firebase Sync
    if (currentStudent) {
        syncStudentState(currentStudent, {
            subjects,
            readingHistory,
            studyTimers
        });
    }
}

// ==================== DATE MANAGEMENT ==================== 
function displayCurrentDate() {
    const dateEl = document.getElementById('currentDate');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const arabicDate = currentDate.toLocaleDateString('ar-SA', options);
    dateEl.textContent = arabicDate;
}

function getDateKey(date = currentDate) {
    return date.toISOString().split('T')[0];
}

function getDayName(date = currentDate) {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[date.getDay()];
}

function isFriday(date = currentDate) {
    return date.getDay() === 5;
}

// ==================== MODERN LOADING SPINNER ==================== 
function createModernLoader(text = 'جاري التحميل...') {
    return `
        <div class="modern-loader">
            <div class="loader-spinner-wrapper">
                <div class="loader-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <div class="loader-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            <p class="loader-text">${text}</p>
        </div>
    `;
}

function createAILoader(text = 'الذكاء الاصطناعي يحلل بياناتك...') {
    return `
        <div class="ai-loading-container">
            <div class="thinking-particles">
                <div class="particle"></div>
                <div class="particle"></div>
                <div class="particle"></div>
                <div class="particle"></div>
            </div>
            <div class="ai-brain-icon">🧠</div>
            <div class="ai-progress-bar">
                <div class="ai-progress-fill"></div>
            </div>
            <p class="ai-loading-text">${text}</p>
        </div>
    `;
}

// ==================== TIMER FUNCTIONS ==================== 
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
        return `${hours}س ${minutes}د`;
    } else if (minutes > 0) {
        return `${minutes}د ${secs}ث`;
    } else {
        return `${secs}ث`;
    }
}

function getTodayStudyTime(subject) {
    const dateKey = getDateKey();
    const timerData = studyTimers[subject];
    if (!timerData || !timerData.sessions) return 0;
    return timerData.sessions
        .filter(session => session.date === dateKey)
        .reduce((total, session) => total + session.duration, 0);
}

function getTotalStudyTimeToday() {
    let total = 0;
    subjects.forEach(subject => {
        total += getTodayStudyTime(subject);
    });
    return total;
}

function toggleTimer(subject) {
    if (activeTimer && activeTimer.subject === subject) {
        stopTimer(false);
    } else {
        if (activeTimer) {
            stopTimer(false);
        }
        showTimerSetupModal(subject);
    }
}

function showTimerSetupModal(subject) {
    const modal = document.createElement('div');
    modal.className = 'timer-setup-modal';
    modal.id = 'timerSetupModal';
    modal.innerHTML = `
        <div class="timer-setup-overlay" onclick="closeTimerSetup()"></div>
        <div class="timer-setup-content">
            <div class="timer-setup-header">
                <h3>⏱️ ضبط وقت المذاكرة</h3>
                <p class="subject-name">${subject}</p>
            </div>
            <div class="timer-presets">
                <button class="preset-btn" onclick="selectPreset(15)">
                    <span class="preset-time">15</span>
                    <span class="preset-label">دقيقة</span>
                </button>
                <button class="preset-btn" onclick="selectPreset(25)">
                    <span class="preset-time">25</span>
                    <span class="preset-label">دقيقة</span>
                </button>
                <button class="preset-btn" onclick="selectPreset(30)">
                    <span class="preset-time">30</span>
                    <span class="preset-label">دقيقة</span>
                </button>
                <button class="preset-btn" onclick="selectPreset(45)">
                    <span class="preset-time">45</span>
                    <span class="preset-label">دقيقة</span>
                </button>
                <button class="preset-btn" onclick="selectPreset(60)">
                    <span class="preset-time">60</span>
                    <span class="preset-label">دقيقة</span>
                </button>
            </div>
            <div class="custom-timer">
                <label>أو اختر وقتاً مخصصاً:</label>
                <input type="number" id="customMinutes" min="1" max="180" placeholder="الدقائق">
            </div>
            <div class="timer-setup-actions">
                <button class="btn-start-timer" onclick="confirmTimerStart('${subject}')">
                    <span>🚀</span> ابدأ المذاكرة
                </button>
                <button class="btn-cancel-timer" onclick="closeTimerSetup()">إلغاء</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

let selectedPresetMinutes = null;

function selectPreset(minutes) {
    selectedPresetMinutes = minutes;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.preset-btn').classList.add('active');
    document.getElementById('customMinutes').value = '';
}

function confirmTimerStart(subject) {
    const customInput = document.getElementById('customMinutes');
    const minutes = customInput.value ? parseInt(customInput.value) : selectedPresetMinutes;

    if (!minutes || minutes < 1) {
        alert('الرجاء اختيار وقت المذاكرة');
        return;
    }

    closeTimerSetup();
    startTimer(subject, minutes);
}

function closeTimerSetup() {
    const modal = document.getElementById('timerSetupModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
    selectedPresetMinutes = null;
}

function startTimer(subject, targetMinutes) {
    activeTimer = {
        subject: subject,
        startTime: Date.now(),
        targetDuration: targetMinutes * 60,
        intervalId: setInterval(updateTimerDisplay, 1000)
    };
    renderSubjects();
    showNotification(`⏱️ بدأ المؤقت لـ ${subject} - ${targetMinutes} دقيقة`, 'success');
    logActivity('بدء مذاكرة', `بدأ مذاكرة ${subject} لمدة ${targetMinutes} دقيقة`);
}

function stopTimer(completedFully = false) {
    if (!activeTimer) return;

    clearInterval(activeTimer.intervalId);
    const duration = Math.floor((Date.now() - activeTimer.startTime) / 1000);
    const dateKey = getDateKey();

    if (!studyTimers[activeTimer.subject]) {
        studyTimers[activeTimer.subject] = { totalTime: 0, sessions: [] };
    }

    studyTimers[activeTimer.subject].totalTime += duration;
    studyTimers[activeTimer.subject].sessions.push({
        date: dateKey,
        duration: duration,
        timestamp: Date.now()
    });

    saveData();

    const targetReached = duration >= activeTimer.targetDuration;
    const subject = activeTimer.subject;

    logActivity(targetReached ? 'إكمال مذاكرة' : 'توقف مؤقت', `مادة ${subject} لمدة ${Math.floor(duration / 60)} دقيقة`);

    activeTimer = null;
    renderSubjects();
    updateStats();
    generateAIAnalysis();

    if (targetReached) {
        showCompletionCelebration(subject, duration);
        toggleReading(subject);
    } else {
        showEarlyStopModal(subject, duration);
    }
}

function updateTimerDisplay() {
    if (!activeTimer) return;
    const elapsed = Math.floor((Date.now() - activeTimer.startTime) / 1000);
    const timerEl = document.getElementById(`timer-${activeTimer.subject}`);

    if (timerEl) {
        const remaining = Math.max(0, activeTimer.targetDuration - elapsed);
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        if (remaining === 0) {
            stopTimer(true);
        }
    }
}

function showCompletionCelebration(subject, duration) {
    createMassiveConfetti();
    playSuccessSound();

    const modal = document.createElement('div');
    modal.className = 'completion-modal';
    modal.id = 'completionModal';
    modal.innerHTML = `
        <div class="completion-overlay"></div>
        <div class="completion-content">
            <div class="completion-icon">🎉</div>
            <h2 class="completion-title">أحسنت! 🌟</h2>
            <p class="completion-message">لقد أنجزت مذاكرة <strong>${subject}</strong></p>
            <div class="completion-stats">
                <div class="stat-item">
                    <span class="stat-value">${Math.floor(duration / 60)}</span>
                    <span class="stat-label">دقيقة مركزة</span>
                </div>
            </div>
            <p class="completion-encouragement">استمر في هذا الإنجاز الرائع! 💪✨</p>
            <button class="btn-close-completion" onclick="closeCompletionModal()">رائع! 🚀</button>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeCompletionModal() {
    const modal = document.getElementById('completionModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function showEarlyStopModal(subject, duration) {
    const modal = document.createElement('div');
    modal.className = 'early-stop-modal';
    modal.id = 'earlyStopModal';
    modal.innerHTML = `
        <div class="early-stop-overlay"></div>
        <div class="early-stop-content">
            <div class="early-stop-icon">⏸️</div>
            <h3 class="early-stop-title">توقفت مبكراً</h3>
            <p class="early-stop-subject">${subject}</p>
            <p class="early-stop-duration">مدة المذاكرة: ${Math.floor(duration / 60)} دقيقة</p>
            
            <div class="reason-section">
                <label>ما سبب التوقف المبكر؟</label>
                <textarea id="stopReasonInput" placeholder="مثال: شعرت بالتعب، انتهيت من المادة، حدث طارئ..."></textarea>
            </div>
            
            <div class="early-stop-actions">
                <button class="btn-submit-reason" onclick="submitStopReason('${subject}')">
                    إرسال للذكاء الاصطناعي 🤖
                </button>
                <button class="btn-skip-reason" onclick="closeEarlyStopModal()">
                    تخطي
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}
// ==================== تكملة من submitStopReason ====================

async function submitStopReason(subject) {
    const reasonInput = document.getElementById('stopReasonInput');
    const reason = reasonInput.value.trim();

    if (!reason) {
        alert('الرجاء كتابة السبب');
        return;
    }

    const aiMessage = document.createElement('div');
    aiMessage.className = 'ai-response-section';
    aiMessage.innerHTML = createModernLoader('الذكاء الاصطناعي يحلل إجابتك...');
    document.querySelector('.early-stop-content').appendChild(aiMessage);

    try {
        const response = await analyzeStopReason(subject, reason);
        aiMessage.innerHTML = `
            <div class="ai-response">
                <div class="ai-icon">🤖</div>
                <div class="ai-text">${response}</div>
            </div>
            <button class="btn-close-ai-response" onclick="closeEarlyStopModal()">شكراً 👍</button>
        `;
    } catch (error) {
        aiMessage.innerHTML = `
            <div class="ai-response error">
                <p>عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي</p>
            </div>
            <button class="btn-close-ai-response" onclick="closeEarlyStopModal()">حسناً</button>
        `;
    }
}

async function analyzeStopReason(subject, reason) {
    const systemMessage = `أنت مساعد دراسي ذكي. الطالب توقف عن مذاكرة "${subject}" مبكراً للسبب التالي: "${reason}".
قدم نصيحة مختصرة (2-3 جمل) تشجعه وتعطيه حلولاً عملية للمرة القادمة. استخدم لهجة إيجابية وودودة.`;

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "meta-llama/llama-4-maverick-17b-128e-instruct",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: reason }
            ],
            temperature: 0.8,
            max_tokens: 200
        })
    });

    if (!response.ok) throw new Error('API Error');

    const data = await response.json();
    return data.choices[0].message.content;
}

function closeEarlyStopModal() {
    const modal = document.getElementById('earlyStopModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function createMassiveConfetti() {
    const container = document.getElementById('confettiContainer') || createConfettiContainer();
    const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];

    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
            container.appendChild(confetti);
            setTimeout(() => confetti.remove(), 4000);
        }, i * 20);
    }
}

function createConfettiContainer() {
    const container = document.createElement('div');
    container.id = 'confettiContainer';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
    `;
    document.body.appendChild(container);
    return container;
}

function playSuccessSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuFzvLeijgIG2m98OScTgwOUKfk8LNgGwU7k9jxy3UsBS16yO/bjkAKElyz6eynVBMKR6Dh8r9uIQU=');
        audio.play();
    } catch (e) {
        console.log('Sound not supported');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #8b5cf6, #ec4899);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        font-weight: 600;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== SUBJECT MANAGEMENT ==================== 
function renderSubjects() {
    const listEl = document.getElementById('subjectsList');
    listEl.innerHTML = '';
    const dateKey = getDateKey();
    subjects.forEach((subject, index) => {
        const isRead = readingHistory[dateKey]?.[subject] || false;
        const timerData = studyTimers[subject] || { totalTime: 0, sessions: [] };
        const todayTime = getTodayStudyTime(subject);
        const isTimerActive = activeTimer?.subject === subject;

        const subjectEl = document.createElement('div');
        subjectEl.className = `subject-item ${isRead ? 'completed' : ''} ${isTimerActive ? 'timer-active' : ''}`;
        subjectEl.style.animationDelay = `${index * 0.05}s`;

        let timerDisplay = '00:00';
        if (isTimerActive) {
            const elapsed = Math.floor((Date.now() - activeTimer.startTime) / 1000);
            const remaining = Math.max(0, activeTimer.targetDuration - elapsed);
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            timerDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        const playIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        const pauseIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
        const deleteIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

        subjectEl.innerHTML = `
            <div class="subject-checkbox">
                <input type="checkbox" 
                       id="check-${subject}" 
                       ${isRead ? 'checked' : ''} 
                       onchange="toggleReading('${subject}')">
                <label for="check-${subject}"></label>
            </div>
            <div class="subject-info">
                <div class="subject-name">${subject}</div>
                <div class="subject-stats">
                    <span>⏱️ ${formatTime(todayTime)}</span>
                    <span>📊 ${formatTime(timerData.totalTime)}</span>
                </div>
            </div>
            <div class="subject-actions">
                <button class="timer-btn ${isTimerActive ? 'active' : ''}" 
                        onclick="toggleTimer('${subject}')"
                        title="${isTimerActive ? 'إيقاف المؤقت' : 'بدء المؤقت'}">
                    ${isTimerActive ? `<span class="timer-display" id="timer-${subject}">${timerDisplay}</span>` : playIcon}
                </button>
                ${!DEFAULT_SUBJECTS.includes(subject) ?
                `<button class="delete-btn" onclick="deleteSubject('${subject}')" title="حذف المادة">${deleteIcon}</button>` : ''}
            </div>
        `;
        listEl.appendChild(subjectEl);
    });

    if (activeTimer) {
        updateTimerDisplay();
    }
}

function toggleReading(subject) {
    const dateKey = getDateKey();
    if (!readingHistory[dateKey]) {
        readingHistory[dateKey] = {};
    }
    readingHistory[dateKey][subject] = !readingHistory[dateKey][subject];
    saveData();
    renderSubjects();
    updateStats();
    updateProgressBar();
    generateAIAnalysis();
    if (readingHistory[dateKey][subject]) {
        celebrateReading();
        showNotification(`✅ رائع! أتممت ${subject}`, 'success');
    }
}

function deleteSubject(subject) {
    if (confirm(`هل أنت متأكد من حذف مادة "${subject}"؟`)) {
        subjects = subjects.filter(s => s !== subject);
        Object.keys(readingHistory).forEach(date => {
            delete readingHistory[date][subject];
        });
        delete studyTimers[subject];
        saveData();
        renderSubjects();
        updateStats();
        updateProgressBar();
        generateAIAnalysis();
        showNotification(`🗑️ تم حذف ${subject}`, 'info');
    }
}

// ==================== STATISTICS ==================== 
function updateStats() {
    const dateKey = getDateKey();
    const todayReadings = readingHistory[dateKey] || {};
    const readCount = Object.values(todayReadings).filter(v => v).length;
    const totalSubjects = subjects.length;
    const todayPercentage = totalSubjects > 0 ? Math.round((readCount / totalSubjects) * 100) : 0;
    document.getElementById('todayProgress').textContent = `${todayPercentage}%`;
    const weeklyPercentage = calculateWeeklyProgress();
    document.getElementById('weeklyProgress').textContent = `${weeklyPercentage}%`;
    const totalReadings = calculateTotalReadings();
    document.getElementById('totalReadings').textContent = totalReadings;
    const streak = calculateStreak();
    document.getElementById('streakNumber').textContent = streak;
}

function calculateWeeklyProgress() {
    const weekDates = getLast7Days();
    let totalPossible = 0;
    let totalCompleted = 0;
    weekDates.forEach(date => {
        const dateKey = getDateKey(date);
        const dayReadings = readingHistory[dateKey] || {};
        totalPossible += subjects.length;
        totalCompleted += Object.values(dayReadings).filter(v => v).length;
    });
    return totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
}

function calculateTotalReadings() {
    let total = 0;
    Object.values(readingHistory).forEach(day => {
        total += Object.values(day).filter(v => v).length;
    });
    return total;
}

function calculateStreak() {
    let streak = 0;
    let checkDate = new Date(currentDate);
    while (true) {
        const dateKey = getDateKey(checkDate);
        const dayReadings = readingHistory[dateKey] || {};
        const readCount = Object.values(dayReadings).filter(v => v).length;
        if (readCount === 0) break;
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
        if (streak > 365) break;
    }
    return streak;
}

function getLast7Days() {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        dates.push(date);
    }
    return dates;
}

// ==================== PROGRESS BAR ==================== 
function updateProgressBar() {
    const dateKey = getDateKey();
    const todayReadings = readingHistory[dateKey] || {};
    const readCount = Object.values(todayReadings).filter(v => v).length;
    const totalSubjects = subjects.length;
    const percentage = totalSubjects > 0 ? Math.round((readCount / totalSubjects) * 100) : 0;
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    progressFill.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage}%`;
}

// ==================== AI ANALYSIS ==================== 
function buildAIAnalysisData() {
    const weekDates = getLast7Days();
    const weeklyProgress = calculateWeeklyProgress();
    const totalReadings = calculateTotalReadings();
    const streak = calculateStreak();
    const totalStudyTimeToday = getTotalStudyTimeToday();
    let totalWeeklyStudyTime = 0;
    weekDates.forEach(date => {
        const dateKey = getDateKey(date);
        subjects.forEach(subject => {
            const timerData = studyTimers[subject];
            if (timerData && timerData.sessions) {
                timerData.sessions
                    .filter(session => session.date === dateKey)
                    .forEach(session => {
                        totalWeeklyStudyTime += session.duration;
                    });
            }
        });
    });
    const daysData = weekDates.map(date => {
        const dateKey = getDateKey(date);
        const dayReadings = readingHistory[dateKey] || {};
        const completedCount = Object.values(dayReadings).filter(v => v).length;
        const totalSubjects = subjects.length;
        const percentage = totalSubjects > 0 ? Math.round((completedCount / totalSubjects) * 100) : 0;
        let dayStudyTime = 0;
        subjects.forEach(subject => {
            const timerData = studyTimers[subject];
            if (timerData && timerData.sessions) {
                timerData.sessions
                    .filter(session => session.date === dateKey)
                    .forEach(session => {
                        dayStudyTime += session.duration;
                    });
            }
        });
        return {
            date: dateKey,
            dayName: getDayName(date),
            completedCount,
            totalSubjects,
            percentage,
            studyTime: dayStudyTime,
            studyTimeFormatted: formatTime(dayStudyTime)
        };
    });
    const subjectStats = {};
    subjects.forEach(subject => {
        let weeklyReadCount = 0;
        let weeklyStudyTime = 0;
        weekDates.forEach(date => {
            const dateKey = getDateKey(date);
            if (readingHistory[dateKey]?.[subject]) {
                weeklyReadCount++;
            }
            const timerData = studyTimers[subject];
            if (timerData && timerData.sessions) {
                timerData.sessions
                    .filter(session => session.date === dateKey)
                    .forEach(session => {
                        weeklyStudyTime += session.duration;
                    });
            }
        });
        subjectStats[subject] = {
            readCount: weeklyReadCount,
            studyTime: weeklyStudyTime,
            studyTimeFormatted: formatTime(weeklyStudyTime),
            totalTime: studyTimers[subject]?.totalTime || 0,
            totalTimeFormatted: formatTime(studyTimers[subject]?.totalTime || 0)
        };
    });
    return {
        summary: {
            weeklyProgress,
            totalReadings,
            streak,
            subjectsCount: subjects.length,
            totalStudyTimeToday,
            totalStudyTimeTodayFormatted: formatTime(totalStudyTimeToday),
            totalWeeklyStudyTime,
            totalWeeklyStudyTimeFormatted: formatTime(totalWeeklyStudyTime),
            averageDailyStudyTime: Math.round(totalWeeklyStudyTime / 7),
            averageDailyStudyTimeFormatted: formatTime(Math.round(totalWeeklyStudyTime / 7))
        },
        days: daysData,
        subjectStats
    };
}

async function analyzeWithGroqAI() {
    if (GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
        const fallback = performAIAnalysis();
        return buildFallbackAIHtml(fallback);
    }
    const data = buildAIAnalysisData();
    const systemMessage = `أنت محلل ذكي متخصص في تطبيق "مدير المهام الدراسية" لطلاب المدرسة. مهمتك تحليل أداء الطالب بناءً على البيانات المقدمة (JSON) واستخراج:
1. تقييم عام شامل للأداء (يشمل الإنجاز + أوقات المذاكرة)
2. تحليل الاتجاه (تحسن، تراجع، ثابت) مع تفسير
3. أقوى مواد (بناءً على وقت المذاكرة والإنجاز)
4. أضعف مواد (التي تحتاج اهتماماً أكثر)
5. رؤى ذكية عميقة حول نمط الدراسة والأوقات
6. توصيات عملية محددة بالزمن (مثلاً: "خصص 30 دقيقة للرياضيات يومياً")
7. خطة مقترحة لتحسين الأداء مع جدول زمني
إرشادات الأسلوب:
- اكتب بالعربية الفصحى البسيطة بنبرة إيجابية ومحفزة
- استخدم الإيموجي المناسب
- ركز على تحليل أوقات المذاكرة وكيفية تحسينها
- قدم خطط واقعية قابلة للتطبيق
- أرجع النتيجة بصيغة HTML جاهزة (divs و h3) بدون markdown
- استخدم الهيكل التالي: divs مع classes للتنسيق`;
    const userMessage = `بيانات أدائك (تحدث بصيغة المخاطب) (JSON):
${JSON.stringify(data, null, 2)}
حلل البيانات بعمق وأخرج:
- تقييماً شاملاً
- تحليل أوقات المذاكرة
- مواد متميزة وضعيفة
- رؤى ذكية
- توصيات بالزمن
- خطة أسبوعية مقترحة
أرجع HTML فقط بدون شرح خارجي.`;
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "meta-llama/llama-4-maverick-17b-128e-instruct",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 800
        })
    });
    if (!response.ok) {
        console.error('Groq AI Analysis Error:', response.status, await response.text());
        const fallback = performAIAnalysis();
        return buildFallbackAIHtml(fallback);
    }
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    if (!content.includes('<div')) {
        return `<div class="ai-analysis-section"><h3>📊 تحليل ذكي للأداء</h3><div class="analysis-content">${content.replace(/\n/g, '<br>')}</div></div>`;
    }
    return content;
}

function performAIAnalysis() {
    const weekDates = getLast7Days();
    const totalStudyTimeToday = getTotalStudyTimeToday();
    const data = buildAIAnalysisData();
    const analysis = {
        trend: '',
        bestSubjects: [],
        weakSubjects: [],
        recommendations: [],
        performance: '',
        insights: [],
        timeAnalysis: []
    };
    const weeklyData = weekDates.map(date => {
        const dateKey = getDateKey(date);
        const dayReadings = readingHistory[dateKey] || {};
        return Object.values(dayReadings).filter(v => v).length;
    });
    const recentAvg = weeklyData.slice(-3).reduce((a, b) => a + b, 0) / 3 || 0;
    const olderAvg = weeklyData.slice(0, 4).reduce((a, b) => a + b, 0) / 4 || 0;
    if (recentAvg > olderAvg) {
        analysis.trend = 'تحسن';
        analysis.insights.push('📈 أنت تتحسن باستمرار! استمر على هذا المنوال الرائع.');
    } else if (recentAvg < olderAvg) {
        analysis.trend = 'تراجع';
        analysis.insights.push('📉 لاحظنا بعض التراجع مؤخراً. لا تقلق، يمكنك العودة بقوة!');
    } else {
        analysis.trend = 'ثابت';
        analysis.insights.push('📊 أداؤك ثابت. حاول زيادة جهدك قليلاً للوصول لمستوى أفضل.');
    }
    const avgDailyTime = data.summary.averageDailyStudyTime;
    if (avgDailyTime >= 7200) {
        analysis.timeAnalysis.push('⭐ وقت مذاكرتك ممتاز! أنت تدرس بمعدل ساعتين أو أكثر يومياً.');
    } else if (avgDailyTime >= 3600) {
        analysis.timeAnalysis.push('👍 وقت مذاكرتك جيد، لكن يمكنك زيادته لتحقيق نتائج أفضل.');
    } else if (avgDailyTime >= 1800) {
        analysis.timeAnalysis.push('📚 أنت تبدأ بشكل جيد، حاول زيادة وقت مذاكرتك تدريجياً.');
    } else {
        analysis.timeAnalysis.push('⏰ وقت مذاكرتك قليل، ابدأ بـ 30 دقيقة يومياً على الأقل.');
    }
    const subjectScores = {};
    subjects.forEach(subject => {
        const stats = data.subjectStats[subject];
        const score = (stats.readCount * 2) + (stats.studyTime / 3600);
        subjectScores[subject] = score;
    });
    const sorted = Object.entries(subjectScores).sort((a, b) => b[1] - a[1]);
    analysis.bestSubjects = sorted.slice(0, 2).map(s => s[0]);
    analysis.weakSubjects = sorted.slice(-2).map(s => s[0]);
    const weeklyPercentage = calculateWeeklyProgress();
    const totalWeeklyHours = data.summary.totalWeeklyStudyTime / 3600;
    if (weeklyPercentage >= 80 && totalWeeklyHours >= 10) {
        analysis.performance = 'ممتاز جداً';
        analysis.insights.push('🌟 أداؤك استثنائي! إنجاز عالي مع وقت مذاكرة كافٍ.');
    } else if (weeklyPercentage >= 70 && totalWeeklyHours >= 7) {
        analysis.performance = 'ممتاز';
        analysis.insights.push('🎉 أداؤك رائع! أنت على الطريق الصحيح.');
    } else if (weeklyPercentage >= 60) {
        analysis.performance = 'جيد جداً';
        analysis.insights.push('👍 أداؤك جيد، لكن حاول زيادة وقت مذاكرتك.');
    } else if (weeklyPercentage >= 40) {
        analysis.performance = 'جيد';
        analysis.insights.push('💪 أداؤك متوسط، ركز على تنظيم وقتك بشكل أفضل.');
    } else {
        analysis.performance = 'يحتاج تحسين';
        analysis.insights.push('🎯 ابدأ بخطة واضحة وخصص أوقاتاً محددة للمذاكرة.');
    }
    if (analysis.weakSubjects.length > 0) {
        const weakSubject = analysis.weakSubjects[0];
        const weakStats = data.subjectStats[weakSubject];
        const recommendedTime = Math.max(30, Math.ceil((3600 - weakStats.studyTime) / 60 / 7));
        analysis.recommendations.push(`خصص ${recommendedTime} دقيقة يومياً لـ ${weakSubject}`);
    }
    const streak = calculateStreak();
    if (streak === 0) {
        analysis.recommendations.push('ابدأ سلسلة قراءة جديدة اليوم! استخدم المؤقت لتتبع وقتك.');
    } else if (streak < 7) {
        analysis.recommendations.push(`أحسنت! لديك ${streak} يوم متتالي. حافظ على السلسلة لمدة أسبوع كامل.`);
    } else {
        analysis.recommendations.push(`رائع! لديك ${streak} يوم متتالي. لا تتوقف!`);
    }
    if (totalStudyTimeToday === 0) {
        analysis.recommendations.push('ابدأ الآن! اضغط على زر المؤقت بجانب أي مادة واستمر 25 دقيقة.');
    } else if (totalStudyTimeToday < 3600) {
        analysis.recommendations.push(`أنجزت ${formatTime(totalStudyTimeToday)} اليوم. حاول الوصول لساعة كاملة.`);
    }
    if (weeklyPercentage < 60 || totalWeeklyHours < 7) {
        analysis.recommendations.push('خطة مقترحة: ساعة واحدة يومياً موزعة على 3-4 مواد (15-20 دقيقة لكل مادة).');
    }
    return analysis;
}
// ==================== تكملة buildFallbackAIHtml ====================

function buildFallbackAIHtml(analysis) {
    return `
        <div class="ai-analysis-section">
            <h3>🎭 التقييم العام</h3>
            <div class="performance-badge">مستوى الأداء: ${analysis.performance}</div>
            <div class="trend-badge">الاتجاه: ${analysis.trend}</div>
        </div>
        ${analysis.timeAnalysis.length > 0 ? `
        <div class="ai-analysis-section">
            <h3>⏰ تحليل أوقات المذاكرة</h3>
            <div class="analysis-list">
                ${analysis.timeAnalysis.map(time => `<div class="analysis-item">${time}</div>`).join('')}
            </div>
        </div>` : ''}
        ${analysis.bestSubjects.length > 0 ? `
        <div class="ai-analysis-section">
            <h3>⭐ المواد المتميزة</h3>
            <div class="subjects-list">${analysis.bestSubjects.join(' • ')}</div>
        </div>` : ''}
        ${analysis.weakSubjects.length > 0 ? `
        <div class="ai-analysis-section">
            <h3>📌 مواد تحتاج اهتمام</h3>
            <div class="subjects-list">${analysis.weakSubjects.join(' • ')}</div>
        </div>` : ''}
        ${analysis.insights.length > 0 ? `
        <div class="ai-analysis-section">
            <h3>💡 رؤى ذكية</h3>
            <div class="analysis-list">
                ${analysis.insights.map(insight => `<div class="analysis-item">${insight}</div>`).join('')}
            </div>
        </div>` : ''}
        ${analysis.recommendations.length > 0 ? `
        <div class="ai-analysis-section">
            <h3>🎯 توصيات مخصصة</h3>
            <div class="analysis-list">
                ${analysis.recommendations.map(rec => `<div class="analysis-item">• ${rec}</div>`).join('')}
            </div>
        </div>` : ''}
    `;
}

async function generateAIAnalysis() {
    const aiContent = document.getElementById('aiContent');
    aiContent.innerHTML = createAILoader('الذكاء الاصطناعي يحلل أداءك...');
    try {
        const html = await analyzeWithGroqAI();
        aiContent.innerHTML = html;
    } catch (error) {
        console.error('AI Analysis Fatal Error:', error);
        const fallback = performAIAnalysis();
        aiContent.innerHTML = buildFallbackAIHtml(fallback);
    }
}

// ==================== WEEKLY REVIEW ==================== 
function showWeeklyReview() {
    const modal = document.getElementById('weeklyModal');
    modal.classList.remove('hidden');
    const weeklyPercentage = calculateWeeklyProgress();
    const motivationalMsg = getMotivationalMessage(weeklyPercentage);
    document.getElementById('motivationalMessage').innerHTML = motivationalMsg;
    generateWeeklyStats();
    generateWeeklyChart();
    if (weeklyPercentage >= 70) {
        createMassiveConfetti();
    }
}

function getMotivationalMessage(percentage) {
    if (percentage >= 90) {
        return `<div class="motivational-icon">🏆</div><h2>أداء أسطوري!</h2><p>أنت نجم متألق! استمر في هذا التميز الرائع 🌟</p>`;
    } else if (percentage >= 70) {
        return `<div class="motivational-icon">🎉</div><h2>عمل رائع!</h2><p>أداء ممتاز هذا الأسبوع! أنت على الطريق الصحيح 💪</p>`;
    } else if (percentage >= 50) {
        return `<div class="motivational-icon">💪</div><h2>جهد جيد!</h2><p>لديك إمكانيات كبيرة، ضاعف جهدك الأسبوع القادم 🚀</p>`;
    } else {
        return `<div class="motivational-icon">🎯</div><h2>لنبدأ من جديد!</h2><p>الأسبوع القادم فرصة جديدة للتميز. أنت قادر على ذلك! 🌱</p>`;
    }
}

function generateWeeklyStats() {
    const weekDates = getLast7Days();
    let totalReadings = 0;
    let totalPossible = weekDates.length * subjects.length;
    let bestDay = '';
    let maxReadings = 0;
    let totalWeeklyTime = 0;
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    weekDates.forEach(date => {
        const dateKey = getDateKey(date);
        const dayReadings = readingHistory[dateKey] || {};
        const count = Object.values(dayReadings).filter(v => v).length;
        totalReadings += count;
        subjects.forEach(subject => {
            const timerData = studyTimers[subject];
            if (timerData && timerData.sessions) {
                timerData.sessions
                    .filter(session => session.date === dateKey)
                    .forEach(session => {
                        totalWeeklyTime += session.duration;
                    });
            }
        });
        if (count > maxReadings) {
            maxReadings = count;
            bestDay = dayNames[date.getDay()];
        }
    });
    const percentage = totalPossible > 0 ? Math.round((totalReadings / totalPossible) * 100) : 0;
    const streak = calculateStreak();
    const statsEl = document.getElementById('weeklyStats');
    statsEl.innerHTML = `
        <div class="stat-box">
            <div class="stat-value">${percentage}%</div>
            <div class="stat-label">نسبة الإنجاز</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${totalReadings}</div>
            <div class="stat-label">إجمالي القراءات</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${formatTime(totalWeeklyTime)}</div>
            <div class="stat-label">وقت المذاكرة</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${streak}</div>
            <div class="stat-label">أيام متتالية</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${bestDay || 'لا يوجد'}</div>
            <div class="stat-label">أفضل يوم</div>
        </div>
    `;
}

function generateWeeklyChart() {
    const weekDates = getLast7Days();
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const chartData = weekDates.map((date) => {
        const dateKey = getDateKey(date);
        const dayReadings = readingHistory[dateKey] || {};
        const count = Object.values(dayReadings).filter(v => v).length;
        const percentage = subjects.length > 0 ? (count / subjects.length) * 100 : 0;
        return {
            day: dayNames[date.getDay()],
            percentage: Math.round(percentage),
            count: count
        };
    });
    const chartEl = document.getElementById('weeklyChart');
    const maxPercentage = Math.max(...chartData.map(d => d.percentage), 1);

    chartEl.innerHTML = `
        <div class="chart-title">📈 التقدم اليومي</div>
        <div class="chart-bars">
            ${chartData.map((data, index) => `
                <div class="chart-bar-wrapper" style="animation-delay: ${index * 0.1}s;">
                    <div class="chart-bar" style="height: ${(data.percentage / maxPercentage) * 100}%;">
                        <span class="chart-value">${data.percentage}%</span>
                    </div>
                    <div class="chart-label">${data.day}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// ==================== CELEBRATION EFFECTS ==================== 
function celebrateReading() {
    const container = document.getElementById('confettiContainer') || createConfettiContainer();
    const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];
    for (let i = 0; i < 10; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        container.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
    }
}

// ==================== EVENT LISTENERS ==================== 
function setupEventListeners() {
    document.getElementById('btnAddSubject').addEventListener('click', () => {
        document.getElementById('addSubjectForm').classList.remove('hidden');
        document.getElementById('newSubjectInput').focus();
    });
    document.getElementById('btnSaveSubject').addEventListener('click', () => {
        const input = document.getElementById('newSubjectInput');
        const subjectName = input.value.trim();
        if (subjectName && !subjects.includes(subjectName)) {
            subjects.push(subjectName);
            saveData();
            renderSubjects();
            updateStats();
            generateAIAnalysis();
            input.value = '';
            document.getElementById('addSubjectForm').classList.add('hidden');
            showNotification(`➕ تمت إضافة ${subjectName}`, 'success');
        } else if (subjects.includes(subjectName)) {
            alert('هذه المادة موجودة بالفعل!');
        }
    });
    document.getElementById('btnCancelSubject').addEventListener('click', () => {
        document.getElementById('newSubjectInput').value = '';
        document.getElementById('addSubjectForm').classList.add('hidden');
    });
    document.getElementById('newSubjectInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('btnSaveSubject').click();
        }
    });
    document.getElementById('btnWeeklyReview').addEventListener('click', showWeeklyReview);
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', closeModal);
    document.getElementById('btnRefreshAI').addEventListener('click', () => {
        generateAIAnalysis();
        showNotification('🔄 جاري تحديث التحليل...', 'info');
    });
    if (isFriday()) {
        const lastReviewDate = localStorage.getItem('lastWeeklyReview');
        const todayKey = getDateKey();
        if (lastReviewDate !== todayKey) {
            setTimeout(() => {
                showWeeklyReview();
                localStorage.setItem('lastWeeklyReview', todayKey);
            }, 2000);
        }
    }
}

function closeModal() {
    document.getElementById('weeklyModal').classList.add('hidden');
}

function updateUI() {
    renderSubjects();
    updateStats();
    updateProgressBar();
}

// ==================== GLOBAL FUNCTION EXPOSURE ==================== 
window.toggleReading = toggleReading;
window.deleteSubject = deleteSubject;
window.toggleTimer = toggleTimer;
window.selectPreset = selectPreset;
window.confirmTimerStart = confirmTimerStart;
window.closeTimerSetup = closeTimerSetup;
window.submitStopReason = submitStopReason;
window.closeEarlyStopModal = closeEarlyStopModal;
window.closeCompletionModal = closeCompletionModal;

// ==================== KEYBOARD SHORTCUTS ==================== 
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!chatWidget.isOpen) {
            toggleChat();
        } else {
            chatWidget.input.focus();
        }
    }

    if (e.key === 'Escape') {
        if (chatWidget.isOpen) {
            toggleChat();
        }
        closeModal();
        closeTimerSetup();
        closeEarlyStopModal();
        closeCompletionModal();
    }
});

// ==================== AUTO-SAVE INTERVAL ==================== 
setInterval(() => {
    saveData();
}, 30000);

// ==================== PERFORMANCE MONITORING ==================== 
let performanceMetrics = {
    totalStudyTime: 0,
    sessionsCompleted: 0,
    averageSessionLength: 0
};

function updatePerformanceMetrics() {
    let totalTime = 0;
    let totalSessions = 0;

    Object.values(studyTimers).forEach(timer => {
        if (timer.sessions) {
            totalSessions += timer.sessions.length;
            timer.sessions.forEach(session => {
                totalTime += session.duration;
            });
        }
    });

    performanceMetrics.totalStudyTime = totalTime;
    performanceMetrics.sessionsCompleted = totalSessions;
    performanceMetrics.averageSessionLength = totalSessions > 0 ? Math.round(totalTime / totalSessions) : 0;
}

// ==================== EXPORT DATA FUNCTIONALITY ==================== 
function exportData() {
    const data = {
        subjects: subjects,
        readingHistory: readingHistory,
        studyTimers: studyTimers,
        exportDate: new Date().toISOString(),
        version: '2.0'
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `study-manager-backup-${getDateKey()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('📥 تم تصدير البيانات بنجاح', 'success');
}

// ==================== IMPORT DATA FUNCTIONALITY ==================== 
function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (confirm('هل أنت متأكد من استيراد البيانات؟ سيتم استبدال البيانات الحالية.')) {
                subjects = data.subjects || [];
                readingHistory = data.readingHistory || {};
                studyTimers = data.studyTimers || {};

                saveData();
                initializeApp();

                showNotification('📤 تم استيراد البيانات بنجاح', 'success');
            }
        } catch (error) {
            alert('خطأ في قراءة الملف. تأكد من أنه ملف صحيح.');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
}

// ==================== THEME TOGGLE (BONUS FEATURE) ==================== 
let isDarkMode = true;

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    showNotification(`🎨 تم التبديل إلى الوضع ${isDarkMode ? 'الداكن' : 'الفاتح'}`, 'info');
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    isDarkMode = false;
    document.body.classList.add('light-mode');
}

// ==================== STUDY STREAK MOTIVATION ==================== 
function checkStreakMilestone() {
    const streak = calculateStreak();
    const milestones = [7, 14, 30, 60, 100, 365];
    const lastMilestone = parseInt(localStorage.getItem('lastStreakMilestone') || '0');

    const currentMilestone = milestones.find(m => streak >= m && m > lastMilestone);

    if (currentMilestone) {
        localStorage.setItem('lastStreakMilestone', currentMilestone.toString());
        showStreakMilestoneModal(currentMilestone);
    }
}

function showStreakMilestoneModal(days) {
    const messages = {
        7: { icon: '🎯', title: 'أسبوع كامل!', text: 'أنت ملتزم ومثابر!' },
        14: { icon: '🔥', title: 'أسبوعان متواصلان!', text: 'إنجاز رائع!' },
        30: { icon: '🌟', title: 'شهر من الالتزام!', text: 'أنت نموذج يُحتذى به!' },
        60: { icon: '💎', title: 'شهران من التميز!', text: 'لا يوقفك شيء!' },
        100: { icon: '👑', title: '100 يوم متواصل!', text: 'أنت أسطورة حقيقية!' },
        365: { icon: '🏆', title: 'عام كامل!', text: 'إنجاز تاريخي مذهل!' }
    };

    const msg = messages[days] || messages[7];

    const modal = document.createElement('div');
    modal.className = 'completion-modal';
    modal.style.zIndex = '10002';
    modal.innerHTML = `
        <div class="completion-overlay"></div>
        <div class="completion-content">
            <div class="completion-icon" style="font-size: 6rem;">${msg.icon}</div>
            <h2 class="completion-title">${msg.title}</h2>
            <p class="completion-message" style="font-size: 1.5rem; margin: 1rem 0;">
                <strong>${days}</strong> يوم متتالي
            </p>
            <p class="completion-encouragement">${msg.text}</p>
            <button class="btn-close-completion" onclick="this.closest('.completion-modal').remove()">
                شكراً! 🙏
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    createMassiveConfetti();
    playSuccessSound();
}

setTimeout(checkStreakMilestone, 2000);

// ==================== DAILY REMINDER ==================== 
function checkDailyReminder() {
    const lastVisit = localStorage.getItem('lastVisitDate');
    const today = getDateKey();

    if (lastVisit !== today) {
        localStorage.setItem('lastVisitDate', today);

        const yesterday = new Date(currentDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = getDateKey(yesterday);
        const yesterdayReadings = readingHistory[yesterdayKey] || {};
        const yesterdayCount = Object.values(yesterdayReadings).filter(v => v).length;

        if (yesterdayCount === 0 && calculateStreak() === 0) {
            setTimeout(() => {
                showNotification('💪 يوم جديد وفرصة جديدة! ابدأ الآن لبناء سلسلتك', 'info');
            }, 1000);
        } else {
            setTimeout(() => {
                showNotification('☀️ صباح الخير! لنبدأ يوماً إنتاجياً', 'info');
            }, 1000);
        }
    }
}

checkDailyReminder();

// ==================== FOCUS MODE (BONUS FEATURE) ==================== 
let focusModeActive = false;

function toggleFocusMode() {
    focusModeActive = !focusModeActive;
    document.body.classList.toggle('focus-mode', focusModeActive);

    if (focusModeActive) {
        showNotification('🎯 وضع التركيز مفعّل - قلل من المشتتات!', 'info');
        if (chatWidget.isOpen) toggleChat();
        document.querySelector('.stats-grid').style.opacity = '0.3';
    } else {
        showNotification('👁️ وضع التركيز معطّل', 'info');
        document.querySelector('.stats-grid').style.opacity = '1';
    }
}

// ==================== POMODORO TECHNIQUE HELPER ==================== 
function suggestPomodoroSession() {
    const totalSubjects = subjects.length;
    const dateKey = getDateKey();
    const todayReadings = readingHistory[dateKey] || {};
    const remaining = subjects.filter(s => !todayReadings[s]).length;

    if (remaining > 0) {
        const suggestion = {
            subject: subjects.find(s => !todayReadings[s]),
            duration: 25,
            breakAfter: 5
        };

        showNotification(`💡 اقتراح: ابدأ جلسة 25 دقيقة في ${suggestion.subject}`, 'info');
    }
}

// ==================== STUDY ANALYTICS DASHBOARD ==================== 
function generateStudyAnalytics() {
    updatePerformanceMetrics();

    const analytics = {
        totalStudyHours: Math.round(performanceMetrics.totalStudyTime / 3600 * 10) / 10,
        totalSessions: performanceMetrics.sessionsCompleted,
        averageSessionMinutes: Math.round(performanceMetrics.averageSessionLength / 60),
        currentStreak: calculateStreak(),
        totalReadings: calculateTotalReadings(),
        weeklyCompletion: calculateWeeklyProgress()
    };

    return analytics;
}

// ==================== MOTIVATIONAL QUOTES ==================== 
const motivationalQuotes = [
    { text: 'النجاح هو حصيلة جهود صغيرة متكررة يومياً', emoji: '🌟' },
    { text: 'العبقرية هي 1% إلهام و99% اجتهاد', emoji: '💪' },
    { text: 'التعليم هو أقوى سلاح يمكنك استخدامه لتغيير العالم', emoji: '🎓' },
    { text: 'ابدأ من حيث أنت، استخدم ما لديك، افعل ما تستطيع', emoji: '🚀' },
    { text: 'الطريق إلى النجاح دائماً قيد الإنشاء', emoji: '🛤️' },
    { text: 'كل إنجاز عظيم بدأ بقرار المحاولة', emoji: '✨' },
    { text: 'التعلم رحلة، وليس وجهة', emoji: '🗺️' }
];

function showRandomQuote() {
    const quote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    showNotification(`${quote.emoji} ${quote.text}`, 'info');
}

setInterval(showRandomQuote, 30 * 60 * 1000);

// ==================== ACCESSIBILITY ENHANCEMENTS ==================== 
document.addEventListener('DOMContentLoaded', () => {
    const tooltipStyle = document.createElement('style');
    tooltipStyle.textContent = `
        [data-shortcut]::after {
            content: attr(data-shortcut);
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
            white-space: nowrap;
        }
        [data-shortcut]:hover::after {
            opacity: 1;
        }
    `;
    document.head.appendChild(tooltipStyle);
});

// ==================== OFFLINE SUPPORT ==================== 
window.addEventListener('online', () => {
    showNotification('🌐 أنت متصل بالإنترنت الآن', 'success');
});

window.addEventListener('offline', () => {
    showNotification('📵 أنت غير متصل - البيانات محفوظة محلياً', 'info');
});

// ==================== ERROR BOUNDARY ==================== 
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showNotification('⚠️ حدث خطأ غير متوقع', 'info');
});

// ==================== FINAL INITIALIZATION ==================== 
console.log('%c🎓 Study Manager Pro v2.0', 'color: #8b5cf6; font-size: 20px; font-weight: bold;');
console.log('%cLoaded successfully! Happy studying! 📚', 'color: #06b6d4; font-size: 14px;');

updatePerformanceMetrics();
console.log('Performance Metrics:', performanceMetrics);

const analytics = generateStudyAnalytics();
console.log('Study Analytics:', analytics);

// ==================== STUDENT LOGIN & ADMIN SYSTEM ====================

function checkStudentLogin() {
    // Check if student is logged in (must be non-empty string)
    if (!currentStudent || currentStudent.trim() === '') {
        console.log('No student logged in, showing login modal');
        setTimeout(() => {
            const modal = document.getElementById('studentLoginModal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        }, 500); // Small delay to ensure DOM is ready
    } else {
        console.log('Student already logged in:', currentStudent);
    }
}

// Student Login Event Listeners (wrapped to ensure DOM is ready)
document.addEventListener('DOMContentLoaded', () => {
    const btnSaveStudent = document.getElementById('btnSaveStudentName');
    const studentNameInput = document.getElementById('studentNameInput');

    if (btnSaveStudent) {
        btnSaveStudent.addEventListener('click', saveStudentName);
    }

    if (studentNameInput) {
        studentNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveStudentName();
            }
        });
    }
});


async function saveStudentName() {
    const nameInput = document.getElementById('studentNameInput');
    const name = nameInput.value.trim();
    if (name) {
        currentStudent = name;

        // حفظ في Firebase أو localStorage (fallback تلقائي)
        await saveCurrentStudent(name);
        await addStudentToList(name);

        document.getElementById('studentLoginModal').classList.add('hidden');

        // تسجيل النشاط
        await logActivityToDatabase(name, 'تسجيل دخول', 'بدء جلسة جديدة');

        generateAIAnalysis();
        showNotification(`أهلاً بك يا ${name}! 🌟`, 'success');
    } else {
        alert('الرجاء كتابة اسمك');
    }
}

async function logActivity(action, details) {
    if (!currentStudent) return;
    await logActivityToDatabase(currentStudent, action, details);
}
