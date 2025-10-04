/**
 * Date helpers for reservation system
 * Ensures proper time information is stored with reservation dates
 */

/**
 * Processes a date string/object to ensure it has proper time information
 * If the date only contains date (00:00:00), sets reasonable default times
 * @param {string|Date} dateInput - The input date
 * @param {boolean} isEndDate - Whether this is an end date (affects default time)
 * @returns {Date} - Processed date with appropriate time
 */
function processReservationDate(dateInput, isEndDate = false) {
  const date = new Date(dateInput);

  // Check if the date has no time information (defaults to 00:00:00)
  if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
    if (isEndDate) {
      // Default return time: 6:00 PM
      date.setHours(18, 0, 0, 0);
    } else {
      // Default pickup time: 9:00 AM
      date.setHours(9, 0, 0, 0);
    }
  }

  return date;
}

/**
 * Processes start and end dates for reservations
 * @param {string|Date} startDate - The start date
 * @param {string|Date} endDate - The end date
 * @returns {Object} - Object with processed start and end dates
 */
function processReservationDates(startDate, endDate) {
  const start = processReservationDate(startDate, false);
  const end = processReservationDate(endDate, true);

  return { start, end };
}

/**
 * Formats a date for display in Slovak format with time
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
function formatReservationDate(date) {
  if (!date) return '';

  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Bratislava'
  };

  return new Intl.DateTimeFormat('sk-SK', options).format(new Date(date));
}

module.exports = {
  processReservationDate,
  processReservationDates,
  formatReservationDate
};