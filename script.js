
    const LS_KEY = 'salesData';
    const SESSION_LS_KEY = 'sessionStartTime';
    const SESSION_PAUSE_KEY = 'sessionPauseState';
    let sales = JSON.parse(localStorage.getItem(LS_KEY)) || [];
    let lastPrice = 0;
    let sessionStart = null;
    let sessionPausedAt = null;
    let totalPausedSeconds = 0;
    let timerInterval = null;
    let originalTitle = document.title;

    // Утилита: форматировать дату как "11 декабря"
    function formatDateToDayMonth(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const monthNames = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    return `${day} ${monthNames[date.getMonth()]}`;
}

    // Утилита: форматировать дату как "11.12"
    function formatDateToDayMonthShort(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
}

    // Утилита: форматировать время как HH:MM:SS
    function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

    // Установка значений по умолчанию
    function setDefaults() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;

    if (sales.length > 0) {
    const lastSale = sales[sales.length - 1];
    lastPrice = lastSale.pricePerSphere;
    document.getElementById('priceInput').value = lastPrice;
}
}

    // Обновление данных
    function updateStats() {
    if (sales.length === 0) {
    document.getElementById('daysCount').textContent = 0;
    document.getElementById('avgSpheresPerDay').textContent = 0;
    document.getElementById('avgRoublesPerDay').textContent = 0;
    document.getElementById('avgSpheresPerHour').textContent = 0;
    document.getElementById('avgRoublesPerHour').textContent = 0;
    return;
}

    const uniqueDays = new Set(sales.map(s => s.date)).size;
    const totalSpheres = sales.reduce((sum, s) => sum + s.spheres, 0);
    const totalRoubles = sales.reduce((sum, s) => sum + s.spheres * s.pricePerSphere, 0);

    const avgSpheresPerDay = uniqueDays ? (totalSpheres / uniqueDays).toFixed(2) : 0;
    const avgRoublesPerDay = uniqueDays ? (totalRoubles / uniqueDays).toFixed(2) : 0;

    // Сессии с временем
    const sessionsWithTime = sales.filter(s => s.sessionDuration !== undefined);
    const totalHours = sessionsWithTime.reduce((sum, s) => sum + s.sessionDuration / 3600, 0);

    const avgSpheresPerHour = totalHours ? (totalSpheres / totalHours).toFixed(2) : 0;
    const avgRoublesPerHour = totalHours ? (totalRoubles / totalHours).toFixed(2) : 0;

    document.getElementById('daysCount').textContent = uniqueDays;
    document.getElementById('avgSpheresPerDay').textContent = avgSpheresPerDay;
    document.getElementById('avgRoublesPerDay').textContent = avgRoublesPerDay;
    document.getElementById('avgSpheresPerHour').textContent = avgSpheresPerHour;
    document.getElementById('avgRoublesPerHour').textContent = avgRoublesPerHour;
}

    // Обновление истории
    function updateHistoryTable() {
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';

    sales.forEach((s, index) => {
    const row = document.createElement('tr');
    const amount = (s.spheres * s.pricePerSphere).toFixed(2);
    const duration = s.sessionDuration !== undefined ? formatTime(s.sessionDuration) : '—';

    row.innerHTML = `
        <td>${formatDateToDayMonth(s.date)}</td>
        <td>${s.spheres}</td>
        <td>${s.pricePerSphere}</td>
        <td>${amount}</td>
        <td>${duration}</td>
        <td><button class="delete-btn" data-index="${index}">Удалить</button></td>
      `;
    tbody.appendChild(row);
});

    // Добавляем обработчики кнопок удаления
    document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', function() {
    const index = parseInt(this.getAttribute('data-index'));
    sales.splice(index, 1);
    localStorage.setItem(LS_KEY, JSON.stringify(sales));
    updateStats();
    updateHistoryTable();
    renderCharts();
});
});
}

    // Обновление заголовка вкладки
    function updatePageTitle(timeStr = '') {
    if (timeStr) {
    document.title = `[${timeStr}] ${originalTitle}`;
} else {
    document.title = originalTitle;
}
}

    // Запуск таймера
    function startTimer() {
    if (sessionStart) return;

    sessionStart = new Date();
    localStorage.setItem(SESSION_LS_KEY, sessionStart.toISOString());

    if (sessionPausedAt) {
    totalPausedSeconds += Math.floor((sessionStart - sessionPausedAt) / 1000);
    sessionPausedAt = null;
}

    clearInterval(timerInterval);

    timerInterval = setInterval(updateTimerDisplay, 1000);
}

    // Обновление отображения таймера
    function updateTimerDisplay() {
    if (!sessionStart) return;

    const now = new Date();
    let elapsed = Math.floor((now - sessionStart) / 1000);
    elapsed -= totalPausedSeconds;

    if (elapsed < 0) elapsed = 0;

    const timeStr = formatTime(elapsed);
    document.getElementById('timerDisplay').textContent = timeStr;
    updatePageTitle(timeStr);

    // Автоматически обновляем поле времени в форме
    document.getElementById('sessionTimeInput').value = (elapsed / 60).toFixed(2);
}

    // Пауза таймера
    function pauseTimer() {
    if (!sessionStart || sessionPausedAt) return;

    clearInterval(timerInterval);
    sessionPausedAt = new Date();
    localStorage.setItem(SESSION_PAUSE_KEY, sessionPausedAt.toISOString());
}

    // Продолжение таймера
    function resumeTimer() {
    if (!sessionStart || !sessionPausedAt) return;

    const pauseEnd = new Date();
    totalPausedSeconds += Math.floor((pauseEnd - sessionPausedAt) / 1000);

    localStorage.removeItem(SESSION_PAUSE_KEY);
    sessionPausedAt = null;

    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

    // Остановка таймера
    function stopTimer() {
    if (!sessionStart) return;

    clearInterval(timerInterval);

    localStorage.removeItem(SESSION_LS_KEY);
    localStorage.removeItem(SESSION_PAUSE_KEY);

    sessionStart = null;
    sessionPausedAt = null;
    totalPausedSeconds = 0;

    const elapsed = Math.floor((new Date() - sessionStart) / 1000) - totalPausedSeconds;
    const timeStr = formatTime(elapsed);
    document.getElementById('timerDisplay').textContent = timeStr;
    updatePageTitle();

    // Автоматически подставляем время в поле формы
    document.getElementById('sessionTimeInput').value = (elapsed / 60).toFixed(2);

    return elapsed;
}

    // Восстановление таймера при загрузке
    function resumeTimerIfActive() {
    const savedStartTime = localStorage.getItem(SESSION_LS_KEY);
    const savedPauseTime = localStorage.getItem(SESSION_PAUSE_KEY);

    if (!savedStartTime) return;

    const startTime = new Date(savedStartTime);
    if (isNaN(startTime.getTime())) {
    localStorage.removeItem(SESSION_LS_KEY);
    localStorage.removeItem(SESSION_PAUSE_KEY);
    return;
}

    sessionStart = startTime;

    if (savedPauseTime) {
    sessionPausedAt = new Date(savedPauseTime);
    if (isNaN(sessionPausedAt.getTime())) {
    localStorage.removeItem(SESSION_PAUSE_KEY);
    sessionPausedAt = null;
}
}

    clearInterval(timerInterval);

    if (sessionPausedAt) {
    document.getElementById('pauseSessionBtn').disabled = true;
    document.getElementById('resumeSessionBtn').disabled = false;
    updateTimerDisplay();
} else {
    timerInterval = setInterval(updateTimerDisplay, 1000);
    document.getElementById('pauseSessionBtn').disabled = false;
    document.getElementById('resumeSessionBtn').disabled = true;
}
}

    // Форма отправки
    document.getElementById('saleForm').addEventListener('submit', e => {
    e.preventDefault();

    const date = document.getElementById('dateInput').value;
    const spheres = parseInt(document.getElementById('spheresInput').value);
    const price = parseFloat(document.getElementById('priceInput').value);
    const sessionTimeInMinutes = parseFloat(document.getElementById('sessionTimeInput').value);

    let sessionDuration = null;
    if (!isNaN(sessionTimeInMinutes) && sessionTimeInMinutes >= 0) {
    sessionDuration = Math.round(sessionTimeInMinutes * 60); // в секундах
}

    // Останавливаем таймер, если он был запущен
    if (sessionStart) {
    stopTimer();
}

    sales.push({ date, spheres, pricePerSphere: price, sessionDuration });
    localStorage.setItem(LS_KEY, JSON.stringify(sales));

    // Сбрасываем форму и таймер
    document.getElementById('saleForm').reset();
    document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
    if (sales.length > 0) {
    const lastSale = sales[sales.length - 1];
    document.getElementById('priceInput').value = lastSale.pricePerSphere;
}

    // Сбрасываем переменные таймера
    clearInterval(timerInterval);
    sessionStart = null;
    sessionPausedAt = null;
    totalPausedSeconds = 0;
    localStorage.removeItem(SESSION_LS_KEY);
    localStorage.removeItem(SESSION_PAUSE_KEY);
    document.getElementById('timerDisplay').textContent = '00:00:00';
    document.getElementById('sessionTimeInput').value = '';
    updatePageTitle();

    // Обновляем интерфейс
    renderCharts();
    updateStats();
    updateHistoryTable();
});

    // Переключение графиков
    function renderCharts() {
    const selector = document.getElementById('graphSelector');
    const selectedType = selector.value;

    const ctx = document.getElementById('dailyChart').getContext('2d');

    // Группировка по дням
    const dailyData = {};
    sales.forEach(s => {
    if (!dailyData[s.date]) dailyData[s.date] = { spheres: 0, roubles: 0, hours: 0 };
    dailyData[s.date].spheres += s.spheres;
    dailyData[s.date].roubles += s.spheres * s.pricePerSphere;
    if (s.sessionDuration !== undefined) dailyData[s.date].hours += s.sessionDuration / 3600;
});

    const dates = Object.keys(dailyData).sort();
    const formattedDates = dates.map(d => formatDateToDayMonthShort(d));
    let values;

    if (selectedType === 'spheresPerDay') {
    values = dates.map(date => dailyData[date].spheres);
} else if (selectedType === 'roublesPerDay') {
    values = dates.map(date => dailyData[date].roubles);
} else if (selectedType === 'spheresPerHour') {
    values = dates.map(date => {
    const d = dailyData[date];
    return d.hours ? (d.spheres / d.hours).toFixed(2) : 0;
});
} else if (selectedType === 'roublesPerHour') {
    values = dates.map(date => {
    const d = dailyData[date];
    return d.hours ? (d.roubles / d.hours).toFixed(2) : 0;
});
}

    const labelMap = {
    spheresPerDay: 'Сфер в день',
    roublesPerDay: 'Рублей в день',
    spheresPerHour: 'Сфер в час',
    roublesPerHour: 'Рублей в час'
};

    // Уничтожаем старый график, если он есть
    if (window.dailyChartInstance) window.dailyChartInstance.destroy();

    // ✅ ИСПРАВЛЕНО: Полностью явный синтаксис Chart.js
    window.dailyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {  // ✅ Явно указано свойство data
    labels: formattedDates,
    datasets: [{
    label: labelMap[selectedType],
    data: values,  // ✅ Явно указано свойство data
    borderColor: '#5a3aff',
    backgroundColor: 'rgba(90, 58, 255, 0.1)',
    fill: true,
}]
},
    options: {
    responsive: true,
    plugins: { legend: { labels: { color: '#e0e0e0' } } },
    scales: {
    x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } }
}
}
});
}

    // Экспорт в CSV
    function exportToCsv() {
    if (sales.length === 0) {
    alert("Нет данных для экспорта.");
    return;
}

    const header = "Дата,Сфер,Цена за шт,Сумма,Время сессии (сек)\n";
    const rows = sales.map(s => {
    const amount = (s.spheres * s.pricePerSphere).toFixed(2);
    const duration = s.sessionDuration !== undefined ? s.sessionDuration : '';
    return `"${s.date}",${s.spheres},${s.pricePerSphere},${amount},${duration}`;
}).join('\n');

    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `история_продаж_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

    // Инициализация
    setDefaults();
    resumeTimerIfActive();
    updateStats();
    updateHistoryTable();
    renderCharts();

    // Обработчик переключения графика
    document.getElementById('graphSelector').addEventListener('change', renderCharts);

    // Обработчики кнопок таймера
    document.getElementById('startSessionBtn').addEventListener('click', startTimer);
    document.getElementById('pauseSessionBtn').addEventListener('click', pauseTimer);
    document.getElementById('resumeSessionBtn').addEventListener('click', resumeTimer);

    // Обработчик кнопки экспорта
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCsv);
