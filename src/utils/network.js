const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createTimeoutSignal = (timeoutMs) => {
  if (!timeoutMs) {
    return { signal: undefined, cleanup: () => {} };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => window.clearTimeout(timeoutId),
  };
};

export const fetchWithRetry = async (
  url,
  options = {},
  { timeoutMs = 20000, retries = 1, retryDelayMs = 1200 } = {},
) => {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { signal, cleanup } = createTimeoutSignal(timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal,
      });
      cleanup();
      return response;
    } catch (error) {
      cleanup();
      lastError = error;

      const shouldRetry =
        (error instanceof TypeError || error?.name === "AbortError") &&
        attempt < retries;

      if (!shouldRetry) {
        throw error;
      }

      await sleep(retryDelayMs);
    }
  }

  throw lastError;
};

export const getNetworkErrorMessage = (
  error,
  {
    timeoutMessage = "The request took too long on this connection. Please try again.",
    offlineMessage = "Your internet connection appears to be offline. Please reconnect and try again.",
    unstableMessage = "The network is slow or unstable right now. Please try again in a moment.",
  } = {},
) => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return offlineMessage;
  }

  if (error?.name === "AbortError") {
    return timeoutMessage;
  }

  if (error instanceof TypeError) {
    return unstableMessage;
  }

  return error?.message || unstableMessage;
};
