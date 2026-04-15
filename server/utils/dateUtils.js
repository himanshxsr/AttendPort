/**
 * Returns current date in YYYY-MM-DD format for Asia/Kolkata timezone.
 */
exports.getISTDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

/**
 * Returns current date/time object adjusted for Asia/Kolkata.
 * Note: Returning a Date object always implicitly uses UTC internally, 
 * but this is useful for logging or relative calculations.
 */
exports.getISTDate = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
};

/**
 * Returns a UTC Date object representing 23:59:59.999 IST
 * for a given date string (YYYY-MM-DD).
 */
exports.getISTEndOfDayUTC = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // 23:59:59.999 IST == 18:29:59.999 UTC
  return new Date(Date.UTC(year, month - 1, day, 18, 29, 59, 999));
};
