import { afterEach, describe, expect, it, vi } from "vitest";
import { apply, isDateMaskKey } from "../src/index.js";

function show(value: string, caret: number): string {
  return `${value.slice(0, caret)}|${value.slice(caret)}`;
}

function at(marked: string): { value: string; caret: number; selectionEnd?: number } {
  const first = marked.indexOf("|");
  const second = marked.indexOf("|", first + 1);
  if (second === -1) {
    return { value: marked.replace("|", ""), caret: first };
  }
  return {
    value: marked.replaceAll("|", ""),
    caret: first,
    selectionEnd: second - 1,
  };
}

function type(
  before: string,
  key: string,
  separator?: string,
  mode?: "dmy" | "mdy" | "ymd",
  step?: number,
) {
  const { value, caret, selectionEnd } = at(before);
  return apply({ value, caret, selectionEnd, key, separator, mode, step });
}

describe("acceptance table", () => {
  it.each([
    ["|", "4", "04.|"],
    ["|", "1", "1|"],
    ["1|", ".", "01.|"],
    ["13|", ".", "13.|"],
    ["|", ".", "|"],
    ["04.|", ".", "04.|"],
    ["04.|", "9", "04.09.|"],
    ["3|", "9", "3|"],
    ["04.1|", "3", "04.1|"],
    ["04.|2.2026", "1", "04.12.|2026"],
    ["04.|1.2026", "2", "04.|1.2026"],
    ["11|", "1", "11.1|"],
    ["11.12.|", "Backspace", "11.12|"],
  ] as const)("%s + %s → %s", (before, key, after) => {
    const result = type(before, key);
    expect(show(result.value, result.caret)).toBe(after);
  });
});

describe("apply", () => {
  it.each([
    ["1|", "1", "11.|"],
    ["3|", "1", "31.|"],
    ["11.|", "1", "11.1|"],
    ["11.|", "2", "11.02.|"],
    ["11.1|", "2", "11.12.|"],
    ["04.|2.2026", "1", "04.12.|2026"],
    ["04.|1.2026", "2", "04.|1.2026"],
    ["04.2|.2026", "1", "04.2|.2026"],
    ["04.1|.2026", "2", "04.12.|2026"],
    ["|4.12.2026", "1", "14.|12.2026"],
    ["|1.12.2026", "4", "|1.12.2026"],
    ["11.12|", "2", "11.12.2|"],
    ["11.12.|", "2", "11.12.2|"],
    ["11.12.202|", "6", "11.12.2026|"],
    ["11.12.2026|", "1", "11.12.2026|"],
    ["04.|", "Backspace", "04|"],
    ["04.|", "Delete", "04.|"],
    ["|04.", "Delete", "|4."],
    ["04|.", "Delete", "04|"],
    ["1|", "/", "01.|"],
    ["1|", "-", "01.|"],
    ["|", "a", "|"],
    ["|11.12.2026|", "Backspace", "|"],
    ["|11.12.2026|", "Delete", "|"],
    ["11.|12|.2026", "Backspace", "11.|.2026"],
    ["|11.12.2026|", "4", "04.|"],
  ] as const)("%s + %s → %s", (before, key, after) => {
    const result = type(before, key);
    expect(show(result.value, result.caret)).toBe(after);
  });

  it.each([
    ["|", "4", "/", "04/|"],
    ["1|", ".", "/", "01/|"],
    ["1|", "-", "/", "01/|"],
    ["04/|", "9", "/", "04/09/|"],
    ["04/09/|", "Backspace", "/", "04/09|"],
    ["11/12/|", "2", "/", "11/12/2|"],
  ] as const)("%s + %s (separator %s) → %s", (before, key, separator, after) => {
    const result = type(before, key, separator);
    expect(show(result.value, result.caret)).toBe(after);
  });

  it("ignores a letter key without changing state", () => {
    const result = type("11|", "a");
    expect(show(result.value, result.caret)).toBe("11|");
  });

  it("does not let Backspace leave a rejected letter in state", () => {
    const typed = type("11|", "a");
    expect(typed.value).toBe("11");
    const afterBackspace = apply({
      value: `${typed.value}a`,
      caret: 2,
      key: "Backspace",
    });
    expect(afterBackspace.value).toBe("1");
    expect(afterBackspace.value).not.toMatch(/[a-z]/i);
  });

  it("Backspace at the end removes a rejected letter without deleting a digit", () => {
    const result = apply({ value: "11a", caret: 3, key: "Backspace" });
    expect(show(result.value, result.caret)).toBe("11|");
  });

  it("ignores a separator inside a complete group that already has its separator", () => {
    const digit = type("02.1|2.2026", "4");
    expect(show(digit.value, digit.caret)).toBe("02.1|2.2026");
    const sep = type("02.1|2.2026", ".");
    expect(show(sep.value, sep.caret)).toBe("02.1|2.2026");
  });
});

describe("apply step", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ignores ArrowUp/ArrowDown when step is omitted or 0", () => {
    const omitted = type("11.12.2026|", "ArrowUp");
    expect(show(omitted.value, omitted.caret)).toBe("11.12.2026|");
    const zero = type("11.12.2026|", "ArrowDown", undefined, undefined, 0);
    expect(show(zero.value, zero.caret)).toBe("11.12.2026|");
  });

  it("does not treat arrows as date-mask keys", () => {
    expect(isDateMaskKey("ArrowUp")).toBe(false);
    expect(isDateMaskKey("ArrowDown")).toBe(false);
  });

  it.each([
    ["15|.12.2026", "ArrowUp", "16|.12.2026"],
    ["15|.12.2026", "ArrowDown", "14|.12.2026"],
    ["31|.12.2026", "ArrowUp", "01|.12.2026"],
    ["01|.12.2026", "ArrowDown", "31|.12.2026"],
    ["15.12|.2026", "ArrowUp", "15.01|.2026"],
    ["15.01|.2026", "ArrowDown", "15.12|.2026"],
    ["15.12.2026|", "ArrowUp", "15.12.2027|"],
    ["15.12.2026|", "ArrowDown", "15.12.2025|"],
    ["15.12.9999|", "ArrowUp", "15.12.9999|"],
    ["15.12.0001|", "ArrowDown", "15.12.0001|"],
    ["1|.12.2026", "ArrowUp", "0|2.12.2026"],
    ["|9.12.2026", "ArrowUp", "|10.12.2026"],
    ["9|.12.2026", "ArrowUp", "1|0.12.2026"],
    ["1|0.12.2026", "ArrowDown", "0|9.12.2026"],
    ["11.|12.2026", "ArrowUp", "11.|01.2026"],
    ["12.02.20|27", "ArrowUp", "12.02.20|28"],
    ["12.02.20|27", "ArrowDown", "12.02.20|26"],
  ] as const)("%s + %s (step 1) → %s", (before, key, after) => {
    const result = type(before, key, undefined, undefined, 1);
    expect(show(result.value, result.caret)).toBe(after);
  });

  it("steps by the configured amount", () => {
    const result = type("10|.12.2026", "ArrowUp", undefined, undefined, 5);
    expect(show(result.value, result.caret)).toBe("15|.12.2026");
  });

  it("seeds empty groups from local today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7));
    const day = type("|", "ArrowUp", undefined, undefined, 1);
    expect(show(day.value, day.caret)).toBe("08|");
    const month = type("07.|", "ArrowUp", undefined, undefined, 1);
    expect(show(month.value, month.caret)).toBe("07.11|");
    const year = type("07.10.|", "ArrowDown", undefined, undefined, 1);
    expect(show(year.value, year.caret)).toBe("07.10.2025|");
  });

  it("keeps caret offset inside the group (empty seed still ends the group)", () => {
    const result = type("11.12.|2026", "ArrowUp", undefined, undefined, 1);
    expect(show(result.value, result.caret)).toBe("11.12.|2027");
    for (const key of ["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]) {
      const left = type("11.12.2026|", key, undefined, undefined, 1);
      expect(show(left.value, left.caret)).toBe("11.12.2026|");
    }
  });
});

describe("mode mdy", () => {
  it.each([
    ["|", "4", "04/|"],
    ["|", "1", "1|"],
    ["1|", "/", "01/|"],
    ["|", "9", "09/|"],
    ["04/|", "3", "04/3|"],
    ["04/|", "9", "04/09/|"],
    ["04/3|", "2", "04/3|"],
    ["04/1|", "5", "04/15/|"],
    ["12/|", "4", "12/04/|"],
    ["12/25/|", "2", "12/25/2|"],
    ["12/25/202|", "6", "12/25/2026|"],
    ["3|", "9", "3|"],
    ["1|", "2", "12/|"],
    ["1|", "3", "1|"],
  ] as const)("%s + %s → %s", (before, key, after) => {
    const result = type(before, key, "/", "mdy");
    expect(show(result.value, result.caret)).toBe(after);
  });
});

describe("mode ymd", () => {
  it.each([
    ["|", "2", "2|"],
    ["2026|", "/", "2026/|"],
    ["2026/|", "4", "2026/04/|"],
    ["2026/|", "1", "2026/1|"],
    ["2026/1|", "2", "2026/12/|"],
    ["2026/12/|", "9", "2026/12/09|"],
    ["2026/12/|", "3", "2026/12/3|"],
    ["2026/12/3|", "1", "2026/12/31|"],
    ["2026/12/3|", "9", "2026/12/3|"],
    ["2026/1|", "3", "2026/1|"],
    ["|", "0", "0|"],
  ] as const)("%s + %s → %s", (before, key, after) => {
    const result = type(before, key, "/", "ymd");
    expect(show(result.value, result.caret)).toBe(after);
  });

  it("does not overflow-pad the year first digit", () => {
    const result = type("|", "4", "/", "ymd");
    expect(show(result.value, result.caret)).toBe("4|");
  });
});

describe("mode defaults to dmy", () => {
  it("treats omitted mode like dmy", () => {
    const withDefault = type("|", "4");
    const withExplicit = type("|", "4", ".", "dmy");
    expect(show(withDefault.value, withDefault.caret)).toBe("04.|");
    expect(show(withExplicit.value, withExplicit.caret)).toBe("04.|");
  });
});

