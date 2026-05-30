import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationsApiClient, notificationsKeys } from "@/lib/api/notifications-client";
import * as api from "@/lib/api/internal/fetch";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);
const mockApiFetchVoid = vi.mocked(api.apiFetchVoid);
const emptyResponse = { items: [], unread_count: 0, total: 0 };

describe("notificationsKeys", () => {
  it("all() returns the root scope key", () => {
    expect(notificationsKeys.all()).toEqual(["notifications"]);
  });

  it("lists() returns a list-scoped key", () => {
    expect(notificationsKeys.lists()).toEqual(["notifications", "list"]);
  });

  it("list(filters) embeds the filter object in the key", () => {
    const filters = { limit: 5 };
    expect(notificationsKeys.list(filters)).toEqual(["notifications", "list", filters]);
  });

  it("list({}) and list({}) with different filter objects are distinguishable", () => {
    const a = notificationsKeys.list({ limit: 5 });
    const b = notificationsKeys.list({ limit: 10 });
    expect(a).not.toEqual(b);
  });
});

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

    it("appends repeated type params for each type value", async () => {
      await NotificationsApiClient.list({ types: ["alert", "system"] });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("type=alert");
      expect(url).toContain("type=system");
    });

    it("appends q param when provided", async () => {
      await NotificationsApiClient.list({ q: "BTC" });
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("q=BTC")
      );
    });
  });

  describe("markAsRead()", () => {
    it("calls POST /notifications/{id}/acknowledge", async () => {
      await NotificationsApiClient.markAsRead("abc-123");
      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/notifications/abc-123/acknowledge",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("markAllAsRead()", () => {
    it("calls POST /notifications/acknowledge-all", async () => {
      await NotificationsApiClient.markAllAsRead();
      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/notifications/acknowledge-all",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("archive()", () => {
    it("calls POST /notifications/{id}/archive", async () => {
      await NotificationsApiClient.archive("abc-123");
      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/notifications/abc-123/archive",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("unarchive()", () => {
    it("calls POST /notifications/{id}/unarchive", async () => {
      await NotificationsApiClient.unarchive("abc-456");
      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/notifications/abc-456/unarchive",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("bulkAcknowledge()", () => {
    it("calls POST /notifications/bulk-acknowledge with ids body", async () => {
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
