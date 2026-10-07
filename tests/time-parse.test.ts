import { describe, expect, it } from "vitest";
import { formatTime, parseTime, timeStatus } from "../src/time.js";

describe("parseTime", () => {
  it("parses a complete minute time", () => {
    expect(parseTime("14:30")).toEqual({ hours: 14, minutes: 30, seconds: 0 });
    expect(parseTime("00:00")).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    expect(parseTime("23:59")).toEqual({ hours: 23, minutes: 59, seconds: 0 });
  });

  it("accepts alternate separators", () => {
    expect(parseTime("14.30")).toEqual({ hours: 14, minutes: 30, seconds: 0 });
    expect(parseTime("14-30")).toEqual({ hours: 14, minutes: 30, seconds: 0 });
  });

  it("parses seconds when precision is second", () => {
    expect(parseTime("14:30:05", { precision: "second" })).toEqual({
      hours: 14,
      minutes: 30,
      seconds: 5,
    });
  });

  it("rejects incomplete and impossible values", () => {
    expect(parseTime("14:")).toBeUndefined();
    expect(parseTime("14:3")).toBeUndefined();
    expect(parseTime("24:00")).toBeUndefined();
    expect(parseTime("14:60")).toBeUndefined();
    expect(parseTime("14:30:60", { precision: "second" })).toBeUndefined();
    expect(parseTime("14:30", { precision: "second" })).toBeUndefined();
  });

  it("applies min and max", () => {
    const min = { hours: 9, minutes: 0, seconds: 0 };
    const max = { hours: 17, minutes: 0, seconds: 0 };
    expect(parseTime("09:00", { min, max })).toEqual({
      hours: 9,
      minutes: 0,
      seconds: 0,
    });
    expect(parseTime("08:59", { min, max })).toBeUndefined();
    expect(parseTime("17:01", { min, max })).toBeUndefined();
  });
});

describe("timeStatus", () => {
  it("classifies masked strings", () => {
    expect(timeStatus("")).toBe("empty");
    expect(timeStatus("14:")).toBe("incomplete");
    expect(timeStatus("24:00")).toBe("invalid");
    expect(timeStatus("14:30")).toBe("valid");
  });
});

describe("formatTime", () => {
  it("formats from TimeValue and Date", () => {
    expect(formatTime({ hours: 9, minutes: 5, seconds: 7 })).toBe("09:05");
    expect(
      formatTime({ hours: 9, minutes: 5, seconds: 7 }, ":", { precision: "second" }),
    ).toBe("09:05:07");
    expect(formatTime(new Date(2026, 0, 1, 14, 30, 0), ".")).toBe("14.30");
  });
});
