import { describe, expect, it } from "vitest";
import { formatDate, parseDate } from "../src/index.js";

describe("formatDate", () => {
  it("formats a local Date as day.month.year", () => {
    expect(formatDate(new Date(2026, 11, 11))).toBe("11.12.2026");
  });

  it("uses a custom separator", () => {
    expect(formatDate(new Date(2026, 11, 11), "/")).toBe("11/12/2026");
    expect(formatDate(new Date(2026, 11, 11), "-")).toBe("11-12-2026");
  });

  it("pads day and month", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("05.01.2026");
  });

  it("round-trips with parseDate", () => {
    const formatted = formatDate(new Date(2026, 11, 11));
    const parsed = parseDate(formatted);
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(11);
    expect(parsed?.getDate()).toBe(11);
  });

  it("writes two-digit years inside the default pivot window", () => {
    expect(formatDate(new Date(2026, 11, 11), ".", { yyExpand: {} })).toBe(
      "11.12.26",
    );
    expect(formatDate(new Date(2000, 0, 1), ".", { yyExpand: {} })).toBe(
      "01.01.00",
    );
    expect(formatDate(new Date(2049, 0, 1), ".", { yyExpand: {} })).toBe(
      "01.01.49",
    );
    expect(formatDate(new Date(1950, 0, 1), ".", { yyExpand: {} })).toBe(
      "01.01.50",
    );
    expect(formatDate(new Date(1999, 11, 31), ".", { yyExpand: {} })).toBe(
      "31.12.99",
    );
  });

  it("keeps four digits for years outside the pivot window", () => {
    expect(formatDate(new Date(1949, 5, 15), ".", { yyExpand: {} })).toBe(
      "15.06.1949",
    );
    expect(formatDate(new Date(2050, 5, 15), ".", { yyExpand: {} })).toBe(
      "15.06.2050",
    );
  });

  it("round-trips two-digit years with yyExpand", () => {
    const options = { yyExpand: {} as const };
    expect(formatDate(parseDate("11.12.26", options)!, ".", options)).toBe(
      "11.12.26",
    );
    expect(formatDate(parseDate("01.01.50", options)!, ".", options)).toBe(
      "01.01.50",
    );
  });

  it("respects a custom pivot when formatting", () => {
    const options = { yyExpand: { pivot: 30 } };
    expect(formatDate(new Date(2029, 5, 15), ".", options)).toBe("15.06.29");
    expect(formatDate(new Date(1930, 5, 15), ".", options)).toBe("15.06.30");
    expect(formatDate(new Date(2030, 5, 15), ".", options)).toBe(
      "15.06.2030",
    );
  });
  it("formats mdy order", () => {
    expect(formatDate(new Date(2026, 11, 11), "/", "mdy")).toBe("12/11/2026");
    expect(formatDate(new Date(2026, 0, 5), "/", "mdy")).toBe("01/05/2026");
  });

  it("formats ymd order", () => {
    expect(formatDate(new Date(2026, 11, 11), "/", "ymd")).toBe("2026/12/11");
    expect(formatDate(new Date(2026, 0, 5), "-", "ymd")).toBe("2026-01-05");
  });

  it("round-trips mdy and ymd with parseDate", () => {
    const date = new Date(2026, 11, 11);
    expect(parseDate(formatDate(date, "/", "mdy"), "mdy")?.getDate()).toBe(11);
    expect(parseDate(formatDate(date, "/", "ymd"), "ymd")?.getMonth()).toBe(11);
  });

});
