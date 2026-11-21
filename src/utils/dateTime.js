const INDIA_LOCALE = "en-IN";
const INDIA_TIME_ZONE = "Asia/Kolkata";

export const parseDateTimeValue = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const normalized = String(value).trim();
  if (!normalized) return null;

  // If it has timezone offset or 'Z', parse directly as an ISO string
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(normalized)) {
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // If it's a SQL datetime string like "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss"
  const sqlDateTimeMatch = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?$/,
  );

  if (sqlDateTimeMatch) {
    const [
      ,
      year,
      month,
      day,
      hours = "00",
      minutes = "00",
      seconds = "00",
      milliseconds = "0",
    ] = sqlDateTimeMatch;

    const safeMillis = Number(
      String(milliseconds || "0")
        .slice(0, 3)
        .padEnd(3, "0"),
    );

    // Treat as Indian Standard Time (UTC+5:30)
    const utcValue =
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds),
        safeMillis,
      ) -
      (5 * 60 + 30) * 60 * 1000;

    return new Date(utcValue);
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateTimeInIndia = (
  value,
  fallback = "N/A",
  options = {},
) => {
  if (!value) return fallback;

  const parsed = parseDateTimeValue(value);
  if (!parsed) return String(value);

  return parsed.toLocaleString(INDIA_LOCALE, {
    timeZone: INDIA_TIME_ZONE,
    ...options,
  });
};

export const formatDateInIndia = (value, fallback = "N/A", options = {}) => {
  if (!value) return fallback;

  const str = String(value).trim();
  let parsed = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    parsed = parseDateTimeValue(`${str}T00:00:00`);
  } else {
    parsed = parseDateTimeValue(str);
  }

  if (!parsed) return String(value);

  return parsed.toLocaleDateString(INDIA_LOCALE, {
    timeZone: INDIA_TIME_ZONE,
    ...options,
  });
};

export const formatEventDateOrDateTime = (value, fallback = "-") => {
  if (!value) return fallback;
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return formatDateInIndia(str, fallback);
  }
  return formatDateTimeInIndia(str, fallback);
};
