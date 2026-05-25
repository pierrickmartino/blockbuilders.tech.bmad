import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationsApiClient } from "@/lib/notifications-api-client";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);

const emptyResponse = { items: [], unread_count: 0, total: 0 };

describe("NotificationsApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue(emptyResponse);
  });

  describe("list()", () => {
    it("calls /notifications/ with no params by default", async () => {
      await NotificationsApiClient.list({});

      expect(mockApiFetch).toHaveBeenCalledWith("/notifications/");
    });

    it("appends read_state=unread to the query string", async () => {
      await NotificationsApiClient.list({ read_state: "unread" });

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("read_state=unread")
      );
    });

    it("appends read_state=read to the query string", async () => {
      await NotificationsApiClient.list({ read_state: "read" });

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("read_state=read")
      );
    });

    it("appends offset and limit to the query string", async () => {
      await NotificationsApiClient.list({ offset: 25, limit: 10 });

      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("offset=25");
      expect(url).toContain("limit=10");
    });

    it("omits default all read_state from query string", async () => {
      await NotificationsApiClient.list({ read_state: "all" });

      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).not.toContain("read_state=all");
    });

    it("omits offset=0 from query string", async () => {
      await NotificationsApiClient.list({ offset: 0 });

      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).not.toContain("offset=0");
    });

    it("returns the response from apiFetch", async () => {
      const mockData = { items: [], unread_count: 3, total: 10 };
      mockApiFetch.mockResolvedValueOnce(mockData);

      const result = await NotificationsApiClient.list({});

      expect(result).toEqual(mockData);
    });

    it("appends archived=true to the query string", async () => {
      await NotificationsApiClient.list({ archived: true });

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("archived=true")
      );
    });

    it("omits archived=false from query string", async () => {
      await NotificationsApiClient.list({ archived: false });

      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).not.toContain("archived");
    });

    it("appends repeated type params for each type value", async () => {
      await NotificationsApiClient.list({ types: ["alert", "system"] });

      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("type=alert");
      expect(url).toContain("type=system");
    });

    it("omits type param when types array is empty", async () => {
      await NotificationsApiClient.list({ types: [] });

      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).not.toContain("type=");
    });

    it("appends from param when provided", async () => {
      await NotificationsApiClient.list({ from: "2024-01-01" });

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("from=2024-01-01")
      );
    });

    it("appends to param when provided", async () => {
      await NotificationsApiClient.list({ to: "2024-12-31" });

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("to=2024-12-31")
      );
    });

    it("appends q param when provided", async () => {
      await NotificationsApiClient.list({ q: "BTC" });

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("q=BTC")
      );
    });

    it("omits q param when q is empty string", async () => {
      await NotificationsApiClient.list({ q: "" });

      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).not.toContain("q=");
    });
  });

  describe("archive()", () => {
    it("calls POST /notifications/{id}/archive", async () => {
      const mockApiFetchVoid = vi.mocked(api.apiFetchVoid);
      await NotificationsApiClient.archive("abc-123");

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/notifications/abc-123/archive",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("unarchive()", () => {
    it("calls POST /notifications/{id}/unarchive", async () => {
      const mockApiFetchVoid = vi.mocked(api.apiFetchVoid);
      await NotificationsApiClient.unarchive("abc-456");

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/notifications/abc-456/unarchive",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("bulkAcknowledge()", () => {
    it("calls POST /notifications/bulk-acknowledge with ids body", async () => {
      const mockApiFetchVoid = vi.mocked(api.apiFetchVoid);
      await NotificationsApiClient.bulkAcknowledge(["id1", "id2"]);

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/notifications/bulk-acknowledge",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ ids: ["id1", "id2"] }),
        })
      );
    });
  });

  describe("bulkArchive()", () => {
    it("calls POST /notifications/bulk-archive with ids body", async () => {
      const mockApiFetchVoid = vi.mocked(api.apiFetchVoid);
      await NotificationsApiClient.bulkArchive(["id1", "id2"]);

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/notifications/bulk-archive",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ ids: ["id1", "id2"] }),
        })
      );
    });
  });
});
