import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { load } from "../utils";

describe("load", () => {
  let getItemSpy;

  beforeEach(() => {
    getItemSpy = vi.spyOn(Storage.prototype, "getItem");
  });

  afterEach(() => {
    getItemSpy.mockRestore();
  });

  it("returns stored value for existing key", () => {
    getItemSpy.mockReturnValue(JSON.stringify({ pal: "cool", shapes: [1, 2] }));
    expect(load("pal", "warm")).toBe("cool");
    expect(load("shapes", [])).toEqual([1, 2]);
  });

  it("returns default when key is missing from stored data", () => {
    getItemSpy.mockReturnValue(JSON.stringify({ pal: "cool" }));
    expect(load("shapes", [])).toEqual([]);
    expect(load("missing", 42)).toBe(42);
  });

  it("returns default when localStorage is empty", () => {
    getItemSpy.mockReturnValue(null);
    expect(load("pal", "warm")).toBe("warm");
  });

  it("returns default when localStorage contains invalid JSON", () => {
    getItemSpy.mockReturnValue("not valid json{{{");
    expect(load("pal", "warm")).toBe("warm");
  });

  it("returns default when localStorage throws", () => {
    getItemSpy.mockImplementation(() => { throw new Error("SecurityError"); });
    expect(load("pal", "warm")).toBe("warm");
  });

  it("distinguishes undefined values from missing keys", () => {
    // If stored value is explicitly null, it should be returned (not default)
    getItemSpy.mockReturnValue(JSON.stringify({ val: null }));
    expect(load("val", "fallback")).toBeNull();
  });

  it("handles stored value of 0 or false without falling back", () => {
    getItemSpy.mockReturnValue(JSON.stringify({ count: 0, flag: false }));
    expect(load("count", 99)).toBe(0);
    expect(load("flag", true)).toBe(false);
  });
});
