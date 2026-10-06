import { describe, expect, it } from "vitest";
import { generateFeedToken, verifyFeedToken } from "./calendar-feed-token";

describe("calendar-feed-token", () => {
  it("generates a deterministic 32-character hex token for a scope", () => {
    const token1 = generateFeedToken("default");
    const token2 = generateFeedToken("default");

    expect(token1).toBeDefined();
    expect(token1.length).toBe(32);
    expect(token1).toBe(token2);
  });

  it("generates distinct tokens for different scopes", () => {
    const tokenA = generateFeedToken("scope-a");
    const tokenB = generateFeedToken("scope-b");

    expect(tokenA).not.toBe(tokenB);
  });

  it("verifies matching token correctly", () => {
    const token = generateFeedToken("test-scope");
    expect(verifyFeedToken(token, "test-scope")).toBe(true);
  });

  it("rejects mismatched token or wrong scope", () => {
    const token = generateFeedToken("scope-1");
    expect(verifyFeedToken("invalid-token", "scope-1")).toBe(false);
    expect(verifyFeedToken(token, "different-scope")).toBe(false);
    expect(verifyFeedToken(null, "scope-1")).toBe(false);
    expect(verifyFeedToken("", "scope-1")).toBe(false);
  });
});
