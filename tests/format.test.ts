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
