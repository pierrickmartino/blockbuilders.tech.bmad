import { describe, it, expect, vi, beforeEach } from "vitest";
import { AlertsApiClient, alertsKeys } from "@/lib/api/alerts-client";
import * as api from "@/lib/api/internal/fetch";
import type { AlertRule, CreateAlertRequest, UpdateAlertRequest } from "@/types/alert";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);
const mockApiFetchVoid = vi.mocked(api.apiFetchVoid);

const mockAlert: AlertRule = {
  id: "alert-1",
  user_id: "user-1",
  alert_type: "performance",
  strategy_id: "strat-1",
  threshold_pct: 5,
  alert_on_entry: true,
  alert_on_exit: false,
  notify_in_app: true,
  notify_email: false,
  notify_webhook: false,
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("alertsKeys", () => {
  it("all() returns root scope key", () => {
    expect(alertsKeys.all()).toEqual(["alerts"]);
  });

  it("lists() returns list-scoped key", () => {
    expect(alertsKeys.lists()).toEqual(["alerts", "list"]);
  });

  it("list() returns parameterless list key", () => {
    expect(alertsKeys.list()).toEqual(["alerts", "list", {}]);
  });

  it("detail(id) embeds id in the key", () => {
    expect(alertsKeys.detail("abc")).toEqual(["alerts", "detail", "abc"]);
  });
});

describe("AlertsApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue([]);
  });

  describe("list()", () => {
    it("calls GET /alerts/", async () => {
      await AlertsApiClient.list();
      expect(mockApiFetch).toHaveBeenCalledWith("/alerts/");
    });

    it("returns the array from apiFetch", async () => {
      mockApiFetch.mockResolvedValueOnce([mockAlert]);
      const result = await AlertsApiClient.list();
      expect(result).toEqual([mockAlert]);
    });
  });

  describe("create()", () => {
    it("calls POST /alerts/ with the request body", async () => {
      const req: CreateAlertRequest = {
        alert_type: "performance",
        backtest_run_id: "run-1",
        threshold_pct: 5,
        alert_on_entry: true,
        alert_on_exit: false,
        notify_email: false,
        notify_webhook: false,
        is_active: true,
      };
      mockApiFetch.mockResolvedValueOnce(mockAlert);
      await AlertsApiClient.create(req);
      expect(mockApiFetch).toHaveBeenCalledWith("/alerts/", {
        method: "POST",
        body: JSON.stringify(req),
      });
    });

    it("returns the created alert", async () => {
      const req: CreateAlertRequest = {
        alert_type: "price",
        asset: "BTC/USDT",
        direction: "above",
        threshold_price: 100000,
        notify_in_app: true,
        notify_email: false,
        notify_webhook: false,
        is_active: true,
      };
      mockApiFetch.mockResolvedValueOnce(mockAlert);
      const result = await AlertsApiClient.create(req);
      expect(result).toEqual(mockAlert);
    });
  });

  describe("update()", () => {
    it("calls PATCH /alerts/{id} with the patch body", async () => {
      const patch: UpdateAlertRequest = { is_active: false };
      mockApiFetch.mockResolvedValueOnce({ ...mockAlert, is_active: false });
      await AlertsApiClient.update("alert-1", patch);
      expect(mockApiFetch).toHaveBeenCalledWith("/alerts/alert-1", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    });

    it("returns the updated alert", async () => {
      const updated = { ...mockAlert, is_active: false };
      mockApiFetch.mockResolvedValueOnce(updated);
      const result = await AlertsApiClient.update("alert-1", { is_active: false });
      expect(result).toEqual(updated);
    });
  });

  describe("delete()", () => {
    it("calls DELETE /alerts/{id} via apiFetchVoid", async () => {
      await AlertsApiClient.delete("alert-1");
      expect(mockApiFetchVoid).toHaveBeenCalledWith("/alerts/alert-1", {
        method: "DELETE",
      });
    });
  });
});
