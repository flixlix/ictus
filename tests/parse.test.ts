import { describe, expect, it } from "vitest";
import { parseDate } from "../src/index.js";

function ymd(date: Date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

describe("parseDate", () => {
  it("returns a local Date for a complete calendar-valid triple", () => {
    const date = parseDate("11.12.2026");
    expect(date).toBeInstanceOf(Date);
    expect(ymd(date!)).toEqual({ year: 2026, month: 12, day: 11 });
  });

  it("accepts . / - as separators", () => {
    expect(ymd(parseDate("11.12.2026")!)).toEqual({ year: 2026, month: 12, day: 11 });
    expect(ymd(parseDate("11/12/2026")!)).toEqual({ year: 2026, month: 12, day: 11 });
    expect(ymd(parseDate("11-12-2026")!)).toEqual({ year: 2026, month: 12, day: 11 });
  });

  it("rejects an impossible day", () => {
    expect(parseDate("32.01.2020")).toBeUndefined();
  });

  it("rejects 31 February", () => {
    expect(parseDate("31.02.2020")).toBeUndefined();
  });

  it("rejects a non-leap 29 February", () => {
    expect(parseDate("29.02.2021")).toBeUndefined();
  });

  it("accepts a leap-year 29 February", () => {
    expect(ymd(parseDate("29.02.2020")!)).toEqual({ year: 2020, month: 2, day: 29 });
  });

  it("returns undefined for a partial value", () => {
    expect(parseDate("")).toBeUndefined();
    expect(parseDate("11")).toBeUndefined();
    expect(parseDate("11.12")).toBeUndefined();
    expect(parseDate("11.12.20")).toBeUndefined();
    expect(parseDate("04.")).toBeUndefined();
  });
});
