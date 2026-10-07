import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTime, isTimeMaskKey } from "../src/time.js";

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
  options?: { separator?: string; precision?: "minute" | "second"; step?: number },
) {
  const { value, caret, selectionEnd } = at(before);
  return applyTime({
    value,
    caret,
    selectionEnd,
    key,
    separator: options?.separator,
    precision: options?.precision,
    step: options?.step,
  });
}

describe("time acceptance table", () => {
  it.each([
    ["|", "9", "09:|"],
    ["|", "1", "1|"],
    ["1|", "4", "14:|"],
    ["2|", "3", "23:|"],
    ["2|", "4", "2|"],
    ["1|", ":", "01:|"],
    ["|", ":", "|"],
    ["14:|", "6", "14:06|"],
    ["14:|", "5", "14:5|"],
    ["14:5|", "9", "14:59|"],
    ["14:6|", "0", "14:6|"],
    ["14:30|", "1", "14:30|"],
    ["14:30|", "Backspace", "14:3|"],
  ] as const)("%s + %s → %s", (before, key, after) => {
    const result = type(before, key);
    expect(show(result.value, result.caret)).toBe(after);
  });
});

describe("applyTime", () => {
  it.each([
    ["|", "0", "0|"],
    ["0|", "0", "00:|"],
    ["|", "3", "03:|"],
    ["14:|", ":", "14:|"],
    ["1|", ".", "01:|"],
    ["1|", "-", "01:|"],
    ["14:|", "Backspace", "14|"],
    ["|14:30|", "Backspace", "|"],
    ["|14:30|", "9", "09:|"],
    ["14|:30|", "Backspace", "14|"],
  ] as const)("%s + %s → %s", (before, key, after) => {
    const result = type(before, key);
    expect(show(result.value, result.caret)).toBe(after);
  });

  it.each([
    ["|", "9", ".", "09.|"],
    ["1|", ":", ".", "01.|"],
    ["14.|", "3", ".", "14.3|"],
  ] as const)("%s + %s (separator %s) → %s", (before, key, separator, after) => {
    const result = type(before, key, { separator });
    expect(show(result.value, result.caret)).toBe(after);
  });

  it("ignores a letter key without changing state", () => {
    const result = type("11|", "a");
    expect(show(result.value, result.caret)).toBe("11|");
  });

  it("does not let Backspace leave a rejected letter in state", () => {
    const typed = type("11|", "a");
    expect(typed.value).toBe("11");
    const afterBackspace = applyTime({
      value: `${typed.value}a`,
      caret: 2,
      key: "Backspace",
    });
    expect(afterBackspace.value).toBe("1");
    expect(afterBackspace.value).not.toMatch(/[a-z]/i);
  });

  it("Backspace at the end removes a rejected letter without deleting a digit", () => {
    const result = applyTime({ value: "11a", caret: 3, key: "Backspace" });
    expect(show(result.value, result.caret)).toBe("11|");
  });

  it("ignores a separator inside a complete group that already has its separator", () => {
    const digit = type("14:3|0", "9");
    expect(show(digit.value, digit.caret)).toBe("14:3|0");
    const sep = type("14:3|0", ":");
    expect(show(sep.value, sep.caret)).toBe("14:3|0");
  });

  it.each([
    ["|", "9", "09:|"],
    ["14:30|", ":", "14:30:|"],
    ["14:30:|", "6", "14:30:06|"],
    ["14:30:5|", "9", "14:30:59|"],
    ["14:30:6|", "0", "14:30:6|"],
    ["14:30:00|", "1", "14:30:00|"],
    ["14:30:|5", "1", "14:30:1|5"],
  ] as const)("%s + %s (seconds) → %s", (before, key, after) => {
    const result = type(before, key, { precision: "second" });
    expect(show(result.value, result.caret)).toBe(after);
  });
});

describe("applyTime step", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ignores ArrowUp/ArrowDown when step is omitted or 0", () => {
    const omitted = type("14:30|", "ArrowUp");
    expect(show(omitted.value, omitted.caret)).toBe("14:30|");
    const zero = type("14:30|", "ArrowDown", { step: 0 });
    expect(show(zero.value, zero.caret)).toBe("14:30|");
  });

  it("does not treat arrows as time-mask keys", () => {
    expect(isTimeMaskKey("ArrowUp")).toBe(false);
    expect(isTimeMaskKey("ArrowDown")).toBe(false);
  });

  it.each([
    ["14|:30", "ArrowUp", "15|:30"],
    ["14|:30", "ArrowDown", "13|:30"],
    ["23|:30", "ArrowUp", "00|:30"],
    ["00|:30", "ArrowDown", "23|:30"],
    ["14:59|", "ArrowUp", "14:00|"],
    ["14:00|", "ArrowDown", "14:59|"],
  ] as const)("%s + %s → %s", (before, key, after) => {
    const result = type(before, key, { step: 1 });
    expect(show(result.value, result.caret)).toBe(after);
  });

  it("seeds an empty group from the current clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 9, 7, 0));
    const hour = type("|", "ArrowUp", { step: 1 });
    expect(show(hour.value, hour.caret)).toBe("10|");
    const minute = type("09:|", "ArrowUp", { step: 1 });
    expect(show(minute.value, minute.caret)).toBe("09:08|");
  });

  it("steps seconds when precision is second", () => {
    const result = type("14:30:59|", "ArrowUp", { precision: "second", step: 1 });
    expect(show(result.value, result.caret)).toBe("14:30:00|");
  });
});
