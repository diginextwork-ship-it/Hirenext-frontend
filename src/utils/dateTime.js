const INDIA_LOCALE = "en-IN";
const INDIA_TIME_ZONE = "Asia/Kolkata";

export const formatDateTimeInIndia = (value, fallback = "N/A") => {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString(INDIA_LOCALE, {
    timeZone: INDIA_TIME_ZONE,
  });
};

export const formatDateInIndia = (value, fallback = "N/A") => {
  if (!value) return fallback;

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString(INDIA_LOCALE, {
    timeZone: INDIA_TIME_ZONE,
  });
};
