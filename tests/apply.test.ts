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

function type(before: string, key: string, separator?: string, step?: number) {
  const { value, caret, selectionEnd } = at(before);
  return apply({ value, caret, selectionEnd, key, separator, step });
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
});

describe("apply step", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ignores ArrowUp/ArrowDown when step is omitted or 0", () => {
    const omitted = type("11.12.2026|", "ArrowUp");
    expect(show(omitted.value, omitted.caret)).toBe("11.12.2026|");
    const zero = type("11.12.2026|", "ArrowDown", undefined, 0);
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
    ["1|.12.2026", "ArrowUp", "02|.12.2026"],
    ["11.|12.2026", "ArrowUp", "11.|01.2026"],
    ["12.02.20|27", "ArrowUp", "12.02.20|28"],
    ["12.02.20|27", "ArrowDown", "12.02.20|26"],
  ] as const)("%s + %s (step 1) → %s", (before, key, after) => {
    const result = type(before, key, undefined, 1);
    expect(show(result.value, result.caret)).toBe(after);
  });

  it("steps by the configured amount", () => {
    const result = type("10|.12.2026", "ArrowUp", undefined, 5);
    expect(show(result.value, result.caret)).toBe("15|.12.2026");
  });

  it("seeds empty groups from local today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7));
    const day = type("|", "ArrowUp", undefined, 1);
    expect(show(day.value, day.caret)).toBe("08|");
    const month = type("07.|", "ArrowUp", undefined, 1);
    expect(show(month.value, month.caret)).toBe("07.11|");
    const year = type("07.10.|", "ArrowDown", undefined, 1);
    expect(show(year.value, year.caret)).toBe("07.10.2025|");
  });

  it("keeps caret offset when width is unchanged", () => {
    const result = type("11.12.|2026", "ArrowUp", undefined, 1);
    expect(show(result.value, result.caret)).toBe("11.12.|2027");
    for (const key of ["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]) {
      const left = type("11.12.2026|", key, undefined, 1);
      expect(show(left.value, left.caret)).toBe("11.12.2026|");
    }
  });
});
