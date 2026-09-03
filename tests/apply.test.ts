import { describe, expect, it } from "vitest";
import { apply } from "../src/index.js";

function show(value: string, caret: number): string {
  return `${value.slice(0, caret)}|${value.slice(caret)}`;
}

function at(marked: string): { value: string; caret: number } {
  const caret = marked.indexOf("|");
  return { value: marked.replace("|", ""), caret };
}

function type(before: string, key: string, separator?: string) {
  const { value, caret } = at(before);
  return apply({ value, caret, key, separator });
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

