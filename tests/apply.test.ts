import { describe, expect, it } from "vitest";
import { apply } from "../src/index.js";

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
) {
  const { value, caret, selectionEnd } = at(before);
  return apply({ value, caret, selectionEnd, key, separator, mode });
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

