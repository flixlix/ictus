import { describe, expect, it } from "vitest";
import { applyPaste } from "../src/index.js";

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

function paste(before: string, pasted: string, separator?: string) {
  const { value, caret, selectionEnd } = at(before);
  return applyPaste({ value, caret, selectionEnd, pasted, separator });
}

describe("applyPaste", () => {
  it.each([
    ["|", "11/12/2026", "11.12.2026|"],
    ["|", "11-12-2026", "11.12.2026|"],
    ["|", "11.12.2026", "11.12.2026|"],
    ["|", "11122026", "11.12.2026|"],
    ["|", "2026-12-11", "11.12.2026|"],
    ["|", "2026/12/11", "11.12.2026|"],
    ["|", "2026.1.5", "05.01.2026|"],
    ["|", "  11 / 12 / 2026  ", "11.12.2026|"],
    ["|", "foo11.12.2026bar", "11.12.2026|"],
    ["|", "4", "04.|"],
    ["|", "", "|"],
    ["|", "abc", "|"],
    ["11.|", "122026", "11.12.2026|"],
    ["|11.12.2026|", "01-02-2025", "01.02.2025|"],
    ["|11.12.2026|", "2025-02-01", "01.02.2025|"],
  ] as const)("%s paste %s → %s", (before, pasted, after) => {
    const result = paste(before, pasted);
    expect(show(result.value, result.caret)).toBe(after);
  });

  it.each([
    ["|", "11/12/2026", "/", "11/12/2026|"],
    ["|", "2026-12-11", "/", "11/12/2026|"],
    ["|", "11122026", "-", "11-12-2026|"],
  ] as const)("%s paste %s (separator %s) → %s", (before, pasted, separator, after) => {
    const result = paste(before, pasted, separator);
    expect(show(result.value, result.caret)).toBe(after);
  });
});
