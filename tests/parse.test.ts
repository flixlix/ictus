import { describe, expect, it } from "vitest";
import { expandTwoDigitYear, parseDate } from "../src/index.js";

function ymd(date: Date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

describe("expandTwoDigitYear", () => {
  it("uses pivot 50 by default", () => {
    expect(expandTwoDigitYear(0)).toBe(2000);
    expect(expandTwoDigitYear(49)).toBe(2049);
    expect(expandTwoDigitYear(50)).toBe(1950);
    expect(expandTwoDigitYear(99)).toBe(1999);
  });

  it("respects a custom pivot", () => {
    expect(expandTwoDigitYear(29, 30)).toBe(2029);
    expect(expandTwoDigitYear(30, 30)).toBe(1930);
    expect(expandTwoDigitYear(0, 0)).toBe(1900);
    expect(expandTwoDigitYear(99, 100)).toBe(2099);
  });
});

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

  it("does not invent a date from zero day or month", () => {
    expect(parseDate("00.01.2026")).toBeUndefined();
    expect(parseDate("01.00.2026")).toBeUndefined();
    expect(parseDate("00.00.2026")).toBeUndefined();
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

  it("leaves two-digit years undefined without yyExpand", () => {
    expect(parseDate("11.12.26")).toBeUndefined();
    expect(parseDate("11.12.50")).toBeUndefined();
  });

  it("expands two-digit years with the default pivot", () => {
    expect(ymd(parseDate("11.12.26", { yyExpand: {} })!)).toEqual({
      year: 2026,
      month: 12,
      day: 11,
    });
    expect(ymd(parseDate("01.01.00", { yyExpand: {} })!)).toEqual({
      year: 2000,
      month: 1,
      day: 1,
    });
    expect(ymd(parseDate("01.01.49", { yyExpand: {} })!)).toEqual({
      year: 2049,
      month: 1,
      day: 1,
    });
    expect(ymd(parseDate("01.01.50", { yyExpand: {} })!)).toEqual({
      year: 1950,
      month: 1,
      day: 1,
    });
    expect(ymd(parseDate("31.12.99", { yyExpand: {} })!)).toEqual({
      year: 1999,
      month: 12,
      day: 31,
    });
  });

  it("expands with a custom pivot", () => {
    expect(ymd(parseDate("15.06.29", { yyExpand: { pivot: 30 } })!)).toEqual({
      year: 2029,
      month: 6,
      day: 15,
    });
    expect(ymd(parseDate("15.06.30", { yyExpand: { pivot: 30 } })!)).toEqual({
      year: 1930,
      month: 6,
      day: 15,
    });
  });

  it("still accepts four-digit years when yyExpand is set", () => {
    expect(ymd(parseDate("11.12.2026", { yyExpand: {} })!)).toEqual({
      year: 2026,
      month: 12,
      day: 11,
    });
  });

  it("rejects invalid calendar dates after expansion", () => {
    expect(parseDate("29.02.01", { yyExpand: {} })).toBeUndefined();
    expect(ymd(parseDate("29.02.00", { yyExpand: {} })!)).toEqual({
      year: 2000,
      month: 2,
      day: 29,
    });
  });

  it("accepts yy with alternate separators", () => {
    expect(ymd(parseDate("11/12/26", { yyExpand: {} })!)).toEqual({
      year: 2026,
      month: 12,
      day: 11,
    });
    expect(ymd(parseDate("11-12-50", { yyExpand: {} })!)).toEqual({
      year: 1950,
      month: 12,
      day: 11,
    });
  });

  it("ignores min and max for partial values", () => {
    const min = new Date(2020, 0, 1);
    const max = new Date(2020, 11, 31);
    expect(parseDate("11.12", { min, max })).toBeUndefined();
    expect(parseDate("11.12.20", { min, max })).toBeUndefined();
  });

  it("accepts a complete date within min and max", () => {
    const date = parseDate("15.06.2020", {
      min: new Date(2020, 0, 1),
      max: new Date(2020, 11, 31),
    });
    expect(ymd(date!)).toEqual({ year: 2020, month: 6, day: 15 });
  });

  it("rejects a complete date before min", () => {
    expect(
      parseDate("31.12.2019", { min: new Date(2020, 0, 1) }),
    ).toBeUndefined();
  });

  it("rejects a complete date after max", () => {
    expect(
      parseDate("01.01.2021", { max: new Date(2020, 11, 31) }),
    ).toBeUndefined();
  });

  it("accepts the min and max boundary days", () => {
    const min = new Date(2020, 0, 1);
    const max = new Date(2020, 11, 31);
    expect(ymd(parseDate("01.01.2020", { min, max })!)).toEqual({
      year: 2020,
      month: 1,
      day: 1,
    });
    expect(ymd(parseDate("31.12.2020", { min, max })!)).toEqual({
      year: 2020,
      month: 12,
      day: 31,
    });
  });

  it("compares min and max by local calendar day", () => {
    const min = new Date(2020, 5, 15, 23, 59, 59);
    const max = new Date(2020, 5, 15, 0, 0, 1);
    expect(ymd(parseDate("15.06.2020", { min, max })!)).toEqual({
      year: 2020,
      month: 6,
      day: 15,
    });
  });

  it("parses mdy order", () => {
    expect(ymd(parseDate("12/11/2026", "mdy")!)).toEqual({
      year: 2026,
      month: 12,
      day: 11,
    });
    expect(parseDate("13/11/2026", "mdy")).toBeUndefined();
    expect(parseDate("02/29/2021", "mdy")).toBeUndefined();
    expect(ymd(parseDate("02/29/2020", "mdy")!)).toEqual({
      year: 2020,
      month: 2,
      day: 29,
    });
  });

  it("parses ymd order", () => {
    expect(ymd(parseDate("2026/12/11", "ymd")!)).toEqual({
      year: 2026,
      month: 12,
      day: 11,
    });
    expect(parseDate("2026/13/11", "ymd")).toBeUndefined();
    expect(parseDate("11.12.2026", "ymd")).toBeUndefined();
  });

  it("does not reinterpret dmy strings as mdy", () => {
    expect(ymd(parseDate("11.12.2026")!)).toEqual({ year: 2026, month: 12, day: 11 });
    expect(ymd(parseDate("11.12.2026", "mdy")!)).toEqual({
      year: 2026,
      month: 11,
      day: 12,
    });
  });

});
