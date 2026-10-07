import { describe, expect, it } from "vitest";
import { applyTimePaste } from "../src/time.js";

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

function paste(
  before: string,
  pasted: string,
  options?: { separator?: string; precision?: "minute" | "second" },
) {
  const { value, caret, selectionEnd } = at(before);
  return applyTimePaste({
    value,
    caret,
    selectionEnd,
    pasted,
    separator: options?.separator,
    precision: options?.precision,
  });
}

describe("applyTimePaste", () => {
  it.each([
    ["|", "14:30", "14:30|"],
    ["|", "14.30", "14:30|"],
    ["|", "14-30", "14:30|"],
    ["|", "1430", "14:30|"],
    ["|", "  14 : 30  ", "14:30|"],
    ["|", "foo14:30bar", "14:30|"],
    ["|", "9", "09:|"],
    ["|", "", "|"],
    ["|", "abc", "|"],
    ["|14:30|", "09:15", "09:15|"],
  ] as const)("%s paste %s → %s", (before, pasted, after) => {
    const result = paste(before, pasted);
    expect(show(result.value, result.caret)).toBe(after);
  });

  it("pastes seconds when precision is second", () => {
    const result = paste("|", "14:30:05", { precision: "second" });
    expect(show(result.value, result.caret)).toBe("14:30:05|");
  });

  it("writes a custom separator", () => {
    const result = paste("|", "14:30", { separator: "." });
    expect(show(result.value, result.caret)).toBe("14.30|");
  });
});
