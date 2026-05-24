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
  });
});
