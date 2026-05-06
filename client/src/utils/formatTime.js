export const formatTime = (ms) => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatDate = (dateStr) => {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  const date = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(Date.UTC(year, month - 1, day))
    : new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
};

export const formatHours = (hours) => {
  if (!hours) return '0h 0m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

/**
 * Fills in missing dates with "Absent" status from a start date to today.
 * @param {string|Date} startDate 
 * @param {Array} logs Existing attendance logs
 * @returns {Array} Complete log history
 */
export const getCompleteHistory = (startDate, logs = [], referenceToday = new Date()) => {
  if (!startDate) return logs;
  
  const history = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const today = new Date(referenceToday);
  today.setHours(0, 0, 0, 0);
  
  // Create a map for quick lookup: "YYYY-MM-DD" -> log
  const logMap = new Map();
  logs.forEach(log => {
    logMap.set(log.date, log);
  });
  
  // Iterate from start date to today
  let current = new Date(start);
  while (current <= today) {
    const dateStr = getISTDateString(current);
    
    if (logMap.has(dateStr)) {
      history.push(logMap.get(dateStr));
    } else {
      // Create a virtual "Absent" record
      history.push({
        _id: `absent-${dateStr}`,
        date: dateStr,
        status: 'Absent',
        totalHours: 0,
        isVirtual: true // Mark as virtual for UI differentiation if needed
      });
    }
    
    // Increment day
    current.setDate(current.getDate() + 1);
  }
  
  // Return sorted descending (newest first)
  return history.sort((a, b) => new Date(b.date) - new Date(a.date));
};

/**
 * Returns current date in YYYY-MM-DD format for Asia/Kolkata timezone (IST).
 */
export const getISTDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

export const getISTHour = (date = new Date()) => {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hour12: false,
    }).format(date),
  );
};

export const formatISTDateLong = (dateLike) => {
  return new Date(dateLike).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
};

export const formatISTTime = (dateLike) => {
  return new Date(dateLike).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
};
