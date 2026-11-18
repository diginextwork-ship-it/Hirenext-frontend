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

  const sqlDateTimeMatch = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?$/,
  );

  if (sqlDateTimeMatch && !/[zZ]|[+-]\d{2}:\d{2}$/.test(normalized)) {
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

const stripTimeZoneSuffix = (value) =>
  String(value || "").replace(/([zZ]|[+-]\d{2}:\d{2})$/, "");

export const formatDateTimeInIndia = (
  value,
  fallback = "N/A",
  options = {},
) => {
  if (!value) return fallback;

  const normalizedValue =
    options?.treatAsWallTime && typeof value === "string"
      ? stripTimeZoneSuffix(value)
      : value;

  const parsed = parseDateTimeValue(normalizedValue);
  if (!parsed) return String(value);

  return parsed.toLocaleString(INDIA_LOCALE, {
    timeZone: INDIA_TIME_ZONE,
  });
};

export const formatDateInIndia = (value, fallback = "N/A") => {
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
  });
};

export const formatEventDateOrDateTime = (value, fallback = "-") => {
  if (!value) return fallback;
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return formatDateInIndia(str, fallback);
  }
  return formatDateTimeInIndia(str, fallback, { treatAsWallTime: true });
};
