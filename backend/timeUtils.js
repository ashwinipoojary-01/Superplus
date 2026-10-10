/**
 * timeUtils.js
 * Accurate, timezone-safe date/time utilities for YYYY-MM-DDTHH:MM format.
 */

const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function isValidIsoDateTime(str) {
  if (typeof str !== 'string' || !ISO_DATETIME_REGEX.test(str)) {
    return false;
  }
  const [datePart, timePart] = str.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;

  // Check valid day for month using Date.UTC
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day &&
    d.getUTCHours() === hour &&
    d.getUTCMinutes() === minute
  );
}

export function parseToMinutes(str) {
  if (!isValidIsoDateTime(str)) {
    throw new Error(`Invalid ISO datetime string: ${str}`);
  }
  const [datePart, timePart] = str.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day, hour, minute) / 60000);
}

export function minutesToIsoDateTime(minutes) {
  const d = new Date(minutes * 60000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hour = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${min}`;
}

/**
 * Compare two ISO timestamps.
 * Returns -1 if t1 < t2, 0 if t1 === t2, 1 if t1 > t2.
 */
export function compareTimes(t1, t2) {
  const m1 = parseToMinutes(t1);
  const m2 = parseToMinutes(t2);
  if (m1 < m2) return -1;
  if (m1 > m2) return 1;
  return 0;
}

/**
 * Returns absolute difference in minutes between t1 and t2.
 */
export function diffMinutes(t1, t2) {
  return Math.abs(parseToMinutes(t1) - parseToMinutes(t2));
}
