// Logged dates are the user's calendar day, so always use local time, not UTC.
export function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getToday() {
  return toDateString(new Date());
}

export function getCurrentTime() {
  return new Date().toTimeString().slice(0, 5);
}

// SQLite CURRENT_TIMESTAMP values ("YYYY-MM-DD HH:MM:SS") are UTC without a zone marker.
export function parseServerTimestamp(value) {
  if (!value) {
    return null;
  }

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T00:00:00`);
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(text)) {
    return new Date(`${text.replace(" ", "T")}Z`);
  }

  return new Date(text);
}

export function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

// Monday-to-Sunday dates for the week containing dateString.
export function getWeekDates(dateString) {
  const mondayOffset = (new Date(`${dateString}T00:00:00`).getDay() + 6) % 7;
  const monday = addDays(dateString, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}
