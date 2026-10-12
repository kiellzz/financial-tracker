describe("analyticsClient readiness", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.ANALYTICS_SERVICE_URL = "https://analytics.example.test";
    process.env.ANALYTICS_API_KEY = "test-key";
    process.env.ANALYTICS_TIMEOUT_MS = "1000";
    process.env.ANALYTICS_RETRY_WINDOW_MS = "5000";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("shares one health check between concurrent callers", async () => {
    let releaseHealthCheck;
    const healthCheckPending = new Promise((resolve) => {
      releaseHealthCheck = resolve;
    });

    global.fetch = jest.fn().mockReturnValue(healthCheckPending);

    const { ensureAnalyticsServiceReady } = require("../services/analyticsClient");
    const firstCall = ensureAnalyticsServiceReady();
    const secondCall = ensureAnalyticsServiceReady();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://analytics.example.test/health",
      expect.objectContaining({ method: "GET" })
    );

    releaseHealthCheck({
      ok: true,
      status: 200,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
    });

    await Promise.all([firstCall, secondCall]);
  });

  it("reuses a recent successful readiness check", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
    });

    const { ensureAnalyticsServiceReady } = require("../services/analyticsClient");

    await ensureAnalyticsServiceReady();
    await ensureAnalyticsServiceReady();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
