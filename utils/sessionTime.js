const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const INTERVAL_MS = 45 * 60 * 1000;

function isCalendarDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Horários enviados pela interface são sempre de Brasília (UTC-03:00).
function sessionInstant(date, time) {
  return new Date(`${date}T${time}:00-03:00`);
}

module.exports = {
  isCalendarDate, TIME_PATTERN, sessionInstant, INTERVAL_MS,
};
