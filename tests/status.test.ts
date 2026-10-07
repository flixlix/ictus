import { describe, expect, it } from "vitest";
import { dateStatus } from "../src/index.js";
import type { DateStatus } from "../src/index.js";

function label(status: DateStatus): string {
  switch (status) {
    case "empty":
      return "empty";
    case "incomplete":
      return "incomplete";
    case "invalid":
      return "invalid";
    case "valid":
      return "valid";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

describe("dateStatus", () => {
  it("returns empty for an empty string", () => {
    expect(dateStatus("")).toBe("empty");
    expect(label(dateStatus(""))).toBe("empty");
  });

  it("returns incomplete for a partial mask", () => {
    expect(dateStatus("11")).toBe("incomplete");
    expect(dateStatus("11.12")).toBe("incomplete");
    expect(dateStatus("11.12.20")).toBe("incomplete");
    expect(dateStatus("04.")).toBe("incomplete");
    expect(dateStatus("04.09.")).toBe("incomplete");
  });

  it("returns invalid for a complete non-calendar date", () => {
    expect(dateStatus("32.01.2020")).toBe("invalid");
    expect(dateStatus("31.02.2020")).toBe("invalid");
    expect(dateStatus("29.02.2021")).toBe("invalid");
    expect(dateStatus("31/02/2020")).toBe("invalid");
    expect(dateStatus("31-02-2020")).toBe("invalid");
    expect(dateStatus("00.01.2026")).toBe("invalid");
    expect(dateStatus("01.00.2026")).toBe("invalid");
  });

  it("keeps zero day/month masks incomplete until a full invalid triple", () => {
    expect(dateStatus("00.")).toBe("incomplete");
    expect(dateStatus("04.00.")).toBe("incomplete");
  });

  it("returns valid when parseDate would succeed", () => {
    expect(dateStatus("11.12.2026")).toBe("valid");
    expect(dateStatus("29.02.2020")).toBe("valid");
    expect(dateStatus("11/12/2026")).toBe("valid");
    expect(dateStatus("11-12-2026")).toBe("valid");
  });
});
