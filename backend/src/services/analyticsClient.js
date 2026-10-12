const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_RETRY_WINDOW_MS = 90000;
const ANALYTICS_READY_CACHE_MS = 5 * 60 * 1000;
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);
const NETWORK_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ECONNRESET",
  "UND_ERR_CONNECT_TIMEOUT"
]);

let analyticsReadinessPromise = null;
let analyticsReadyUntil = 0;

class AnalyticsServiceError extends Error {
  constructor(message, statusCode, cause = null) {
    super(message);
    this.name = "AnalyticsServiceError";
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

function getAnalyticsConfig() {
  const baseUrl = String(process.env.ANALYTICS_SERVICE_URL || "").replace(/\/+$/, "");
  const apiKey = String(process.env.ANALYTICS_API_KEY || "");
  const configuredTimeout = Number(process.env.ANALYTICS_TIMEOUT_MS);
  const configuredRetryWindow = Number(process.env.ANALYTICS_RETRY_WINDOW_MS);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_TIMEOUT_MS;
  const retryWindowMs = Number.isFinite(configuredRetryWindow) && configuredRetryWindow > 0
    ? configuredRetryWindow
    : DEFAULT_RETRY_WINDOW_MS;

  if (!baseUrl || !apiKey) {
    throw new AnalyticsServiceError(
      "Serviço de análise financeira não configurado.",
      503
    );
  }

  return { apiKey, baseUrl, timeoutMs, retryWindowMs };
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getNetworkErrorCode(error) {
  return error?.cause?.code || error?.code || "";
}

function isRetryableNetworkError(error) {
  return error?.name === "AbortError" ||
    NETWORK_ERROR_CODES.has(getNetworkErrorCode(error));
}

function getRetryDelay(attempt) {
  return Math.min(1000 * (2 ** (attempt - 1)), 10000);
}

async function fetchWithRetry(url, options, { attemptTimeoutMs, windowMs }) {
  const startedAt = Date.now();
  let attempt = 0;

  while (Date.now() - startedAt < windowMs) {
    attempt += 1;
    const remainingMs = windowMs - (Date.now() - startedAt);
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      Math.min(attemptTimeoutMs, remainingMs)
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      if (!RETRYABLE_STATUS_CODES.has(response.status)) {
        return response;
      }

      await response.arrayBuffer();
      console.warn("Tentativa do serviço de análise falhou:", {
        attempt,
        reason: `HTTP ${response.status} ${response.statusText}`
      });
    } catch (error) {
      if (!isRetryableNetworkError(error)) {
        throw error;
      }

      console.warn("Tentativa do serviço de análise falhou:", {
        attempt,
        reason: error?.name === "AbortError"
          ? "timeout da tentativa"
          : `${getNetworkErrorCode(error) || "erro de rede"}: ${error.message}`
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const delayMs = Math.min(
      getRetryDelay(attempt),
      windowMs - (Date.now() - startedAt)
    );

    if (delayMs <= 0) {
      break;
    }

    await sleep(delayMs);
  }

  throw new AnalyticsServiceError(
    "O serviço de análise está indisponível no momento. Tente novamente em instantes.",
    503
  );
}

async function ensureAnalyticsServiceReady(config = getAnalyticsConfig()) {
  const { baseUrl, timeoutMs, retryWindowMs } = config;

  if (Date.now() < analyticsReadyUntil) {
    return;
  }

  if (!analyticsReadinessPromise) {
    analyticsReadinessPromise = (async () => {
      const response = await fetchWithRetry(
        `${baseUrl}/health`,
        { method: "GET" },
        {
          attemptTimeoutMs: timeoutMs,
          windowMs: retryWindowMs
        }
      );

      if (!response.ok) {
        await response.arrayBuffer();
        throw new AnalyticsServiceError(
          "O serviço de análise não ficou pronto para receber solicitações.",
          503
        );
      }

      await response.arrayBuffer();
      analyticsReadyUntil = Date.now() + ANALYTICS_READY_CACHE_MS;
    })().finally(() => {
      analyticsReadinessPromise = null;
    });
  }

  return analyticsReadinessPromise;
}

async function callAnalyticsService(path, payload, readResponse) {
  const { apiKey, baseUrl, timeoutMs, retryWindowMs } = getAnalyticsConfig();

  try {
    await ensureAnalyticsServiceReady({
      apiKey,
      baseUrl,
      timeoutMs,
      retryWindowMs
    });

    const response = await fetchWithRetry(
      `${baseUrl}${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-API-Key": apiKey
        },
        body: JSON.stringify(payload)
      },
      {
        attemptTimeoutMs: timeoutMs,
        windowMs: retryWindowMs
      }
    );

    if (!response.ok) {
      const body = (await response.text()).slice(0, 500);

      console.error("O serviço de análise recusou a solicitação:", {
        status: response.status,
        statusText: response.statusText,
        endpoint: `${baseUrl}${path}`,
        body
      });

      throw new AnalyticsServiceError(
        "O serviço de análise recusou a solicitação.",
        502
      );
    }

    try {
      return await readResponse(response);
    } catch (error) {
      if (error.name === "AbortError") {
        throw error;
      }

      throw new AnalyticsServiceError(
        "O serviço de análise retornou uma resposta inválida.",
        502,
        error
      );
    }
  } catch (error) {
    if (error instanceof AnalyticsServiceError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new AnalyticsServiceError(
        "O serviço de análise demorou mais que o esperado. Tente novamente.",
        504,
        error
      );
    }

    console.error("Erro na integração com o serviço de análise:", {
      code: getNetworkErrorCode(error),
      message: error.message
    });

    throw new AnalyticsServiceError(
      "O serviço de análise está indisponível no momento. O restante do EZSaldo continua funcionando.",
      503,
      error
    );
  }
}

async function getAnalyticsSummary(payload) {
  return callAnalyticsService(
    "/v1/analytics/summary",
    payload,
    (response) => response.json()
  );
}

async function getMonthlyReport(payload, format) {
  return callAnalyticsService(
    `/v1/reports/monthly?format=${encodeURIComponent(format)}`,
    payload,
    async (response) => Buffer.from(await response.arrayBuffer())
  );
}

module.exports = {
  AnalyticsServiceError,
  ensureAnalyticsServiceReady,
  fetchWithRetry,
  getAnalyticsSummary,
  getMonthlyReport
};
