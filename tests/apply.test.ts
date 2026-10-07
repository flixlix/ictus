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

function type(before: string, key: string, separator?: string) {
  const { value, caret, selectionEnd } = at(before);
  return apply({ value, caret, selectionEnd, key, separator });
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
    ["11.12.|", "Backspace", "11.1|"],
    ["11.|12.2026", "Backspace", "1|12.2026"],
    ["04.|", "Backspace", "0|"],
    ["11.1|", "Backspace", "11.|"],
    ["11.12|", "Backspace", "11.1|"],
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
    ["04/09/|", "Backspace", "/", "04/0|"],
    ["11/12/|", "2", "/", "11/12/2|"],
  ] as const)("%s + %s (separator %s) → %s", (before, key, separator, after) => {
    const result = type(before, key, separator);
    expect(show(result.value, result.caret)).toBe(after);
  });
});

describe("group-aware Backspace", () => {
  it.each([
    ["11.|", "Backspace", "1|"],
    ["01.|", "Backspace", "0|"],
    ["11.12.|", "Backspace", "11.1|"],
    ["11.02.|", "Backspace", "11.0|"],
    ["11.|12.2026", "Backspace", "1|12.2026"],
    ["04.|09.2026", "Backspace", "0|09.2026"],
    ["11.12.|2026", "Backspace", "11.1|2026"],
    ["11.12.|2", "Backspace", "11.1|2"],
    ["11/12/|", "Backspace", "11/1|"],
    ["11/|12/2026", "Backspace", "1|12/2026"],
    ["11-12-|", "Backspace", "11-1|"],
    ["11-|12-2026", "Backspace", "1|12-2026"],
  ] as const)("%s + %s → %s", (before, key, after) => {
    const separator = before.includes("/") ? "/" : before.includes("-") ? "-" : ".";
    const result = type(before, key, separator);
    expect(show(result.value, result.caret)).toBe(after);
  });

  it.each([
    ["1|", "Backspace", "|"],
    ["11|", "Backspace", "1|"],
    ["11.1|", "Backspace", "11.|"],
    ["11.12|", "Backspace", "11.1|"],
    ["11.12.2|", "Backspace", "11.12.|"],
    ["11.12.2026|", "Backspace", "11.12.202|"],
    ["0|4.12.2026", "Backspace", "|4.12.2026"],
    ["04.1|2.2026", "Backspace", "04.|2.2026"],
    ["04.12.2|026", "Backspace", "04.12.|026"],
  ] as const)("mid-group %s + %s → %s", (before, key, after) => {
    const result = type(before, key);
    expect(show(result.value, result.caret)).toBe(after);
  });

  it.each([
    ["|", "Backspace", "|"],
    ["|11.12.2026", "Backspace", "|11.12.2026"],
    ["11.12.2026|", "Delete", "11.12.2026|"],
    ["11.|12.2026", "Delete", "11.|2.2026"],
    ["11.12.|", "Delete", "11.12.|"],
    ["04|.", "Delete", "04|"],
  ] as const)("edges %s + %s → %s", (before, key, after) => {
    const result = type(before, key);
    expect(show(result.value, result.caret)).toBe(after);
  });

  it.each([
    ["|11.12.2026|", "Backspace", "|"],
    ["|11.12.2026|", "Delete", "|"],
    ["11.|12|.2026", "Backspace", "11.|.2026"],
    ["11.|12|.2026", "Delete", "11.|.2026"],
    ["1|1.12.2026|", "Backspace", "1|"],
    ["11.|1|2.2026", "Backspace", "11.|2.2026"],
  ] as const)("selection %s + %s → %s", (before, key, after) => {
    const result = type(before, key);
    expect(show(result.value, result.caret)).toBe(after);
  });

  it("does not steal Delete at a separator", () => {
    const result = type("11.|12.2026", "Delete");
    expect(show(result.value, result.caret)).toBe("11.|2.2026");
  });

  it("group-aware Backspace then digit retypes into the shortened group", () => {
    let state = type("11.12.|", "Backspace");
    expect(show(state.value, state.caret)).toBe("11.1|");
    state = apply({ value: state.value, caret: state.caret, key: "2" });
    expect(show(state.value, state.caret)).toBe("11.12.|");
  });

  it("two group-aware Backspaces unwind month then day", () => {
    let state = type("11.12.|", "Backspace");
    expect(show(state.value, state.caret)).toBe("11.1|");
    state = apply({ value: state.value, caret: state.caret, key: "Backspace" });
    expect(show(state.value, state.caret)).toBe("11.|");
    state = apply({ value: state.value, caret: state.caret, key: "Backspace" });
    expect(show(state.value, state.caret)).toBe("1|");
  });
});
