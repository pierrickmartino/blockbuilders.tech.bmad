import { describe, it, expect } from "vitest";
import { shouldRetry } from "@/lib/query-client";
import { ApiError } from "@/lib/api";

describe("shouldRetry predicate", () => {
  it("does not retry 400 bad-request errors", () => {
    expect(shouldRetry(0, new ApiError(400, "bad request"))).toBe(false);
  });

  it("does not retry 401 unauthorized errors", () => {
    expect(shouldRetry(0, new ApiError(401, "unauthorized"))).toBe(false);
  });

  it("does not retry 403 forbidden errors", () => {
    expect(shouldRetry(0, new ApiError(403, "forbidden"))).toBe(false);
  });

  it("does not retry 404 not-found errors", () => {
    expect(shouldRetry(0, new ApiError(404, "not found"))).toBe(false);
  });

  it("does not retry 422 validation errors", () => {
    expect(shouldRetry(0, new ApiError(422, "unprocessable"))).toBe(false);
  });

  it("retries 500 server errors on the first attempt", () => {
    expect(shouldRetry(0, new ApiError(500, "server error"))).toBe(true);
  });

  it("does not retry 500 server errors on the second attempt", () => {
    expect(shouldRetry(1, new ApiError(500, "server error"))).toBe(false);
  });

  it("retries network errors on the first attempt", () => {
    expect(shouldRetry(0, new Error("Network error"))).toBe(true);
  });

  it("does not retry network errors on the second attempt", () => {
    expect(shouldRetry(1, new Error("Network error"))).toBe(false);
  });
});
