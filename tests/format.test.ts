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
});
