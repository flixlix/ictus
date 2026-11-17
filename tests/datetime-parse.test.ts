import { describe, expect, it } from "vitest";
import {
  dateTimeStatus,
  formatDateTime,
  isoDateTime,
  parseDateTime,
} from "../src/datetime.js";

describe("parseDateTime", () => {
  it("parses a complete local date and time", () => {
    expect(parseDateTime("11.12.2026 09:45")).toEqual(new Date(2026, 11, 11, 9, 45, 0));
  });

  it("respects mode, precision and joiner", () => {
    expect(
      parseDateTime("2026-12-11, 09:45:30", { mode: "ymd", precision: "second", joiner: ", " }),
    ).toEqual(new Date(2026, 11, 11, 9, 45, 30));
    expect(parseDateTime("12/11/2026 09:45", { mode: "mdy" })).toEqual(
      new Date(2026, 11, 11, 9, 45),
    );
  });

  it.each(["", "11.12.2026", "11.12.2026 ", "11.12.2026 09:4", "31.02.2026 09:45", "11.12.2026 24:00"])(
    "rejects %j",
    (masked) => {
      expect(parseDateTime(masked)).toBeUndefined();
    },
  );

  it("expands two-digit years when asked", () => {
    expect(parseDateTime("11.12.26 09:45", { yyExpand: {} })).toEqual(
      new Date(2026, 11, 11, 9, 45),
    );
  });

  it("applies min and max to the full timestamp", () => {
    const min = new Date(2026, 11, 11, 9, 0);
    const max = new Date(2026, 11, 11, 17, 30);
    expect(parseDateTime("11.12.2026 08:59", { min, max })).toBeUndefined();
    expect(parseDateTime("11.12.2026 09:00", { min, max })).toEqual(min);
    expect(parseDateTime("11.12.2026 17:30", { min, max })).toEqual(max);
    expect(parseDateTime("11.12.2026 17:31", { min, max })).toBeUndefined();
  });
});

describe("dateTimeStatus", () => {
  it.each([
    ["", "empty"],
    ["11.12", "incomplete"],
    ["11.12.2026 ", "incomplete"],
    ["11.12.2026 09:4", "incomplete"],
    ["11.12.2026 09:45", "valid"],
    ["31.02.2026 09:45", "invalid"],
  ] as const)("%j → %s", (masked, status) => {
    expect(dateTimeStatus(masked)).toBe(status);
  });

  it("needs seconds for second precision", () => {
    expect(dateTimeStatus("11.12.2026 09:45", { precision: "second" })).toBe("incomplete");
    expect(dateTimeStatus("11.12.2026 09:45:00", { precision: "second" })).toBe("valid");
  });

  it("marks out-of-range values invalid", () => {
    expect(
      dateTimeStatus("11.12.2026 09:45", { max: new Date(2026, 0, 1) }),
    ).toBe("invalid");
  });
});

describe("formatDateTime", () => {
  const date = new Date(2026, 11, 11, 9, 5, 7);

  it("formats with defaults", () => {
    expect(formatDateTime(date)).toBe("11.12.2026 09:05");
  });

  it("formats with options", () => {
    expect(
      formatDateTime(date, {
        mode: "mdy",
        separator: "/",
        timeSeparator: ".",
        joiner: ", ",
        precision: "second",
      }),
    ).toBe("12/11/2026, 09.05.07");
  });

  it("round-trips through parseDateTime", () => {
    const text = formatDateTime(date, { precision: "second", mode: "ymd" });
    expect(parseDateTime(text, { precision: "second", mode: "ymd" })).toEqual(date);
  });
});

describe("isoDateTime", () => {
  it("writes datetime-local strings", () => {
    const date = new Date(2026, 11, 11, 9, 5, 7);
    expect(isoDateTime(date)).toBe("2026-12-11T09:05");
    expect(isoDateTime(date, "second")).toBe("2026-12-11T09:05:07");
    expect(isoDateTime(undefined)).toBe("");
  });
});
