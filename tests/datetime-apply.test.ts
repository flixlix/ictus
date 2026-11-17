import { describe, expect, it } from "vitest";
import {
  applyDateTime,
  applyDateTimePaste,
  isDateTimeMaskKey,
} from "../src/datetime.js";
import type { DateTimeFieldOptions } from "../src/datetime.js";

function show(value: string, caret: number): string {
  return `${value.slice(0, caret)}|${value.slice(caret)}`;
}

function parse(marked: string): { value: string; caret: number } {
  const caret = marked.indexOf("|");
  return { value: marked.replace("|", ""), caret };
}

function press(marked: string, key: string, extra: Partial<Parameters<typeof applyDateTime>[0]> = {}) {
  const { value, caret } = parse(marked);
  const next = applyDateTime({ value, caret, key, ...extra });
  return show(next.value, next.caret);
}

function type(keys: string, options: DateTimeFieldOptions = {}) {
  let value = "";
  let caret = 0;
  for (const key of keys) {
    const next = applyDateTime({ value, caret, key, ...options });
    value = next.value;
    caret = next.caret;
  }
  return show(value, caret);
}

describe("applyDateTime", () => {
  it("types a full date and time from digits only", () => {
    expect(type("111220260945")).toBe("11.12.2026 09:45|");
  });

  it("adds the joiner once the year is complete", () => {
    expect(type("11122026")).toBe("11.12.2026 |");
  });

  it("keeps date overflow rules", () => {
    expect(type("4")).toBe("04.|");
    expect(type("39")).toBe("03.09.|");
  });

  it("keeps time overflow rules after the joiner", () => {
    expect(type("111220269")).toBe("11.12.2026 09:|");
    expect(type("1112202624")).toBe("11.12.2026 02:4|");
  });

  it.each([
    ["11.12.2026|", "0", "11.12.2026 0|"],
    ["11.12.2026|", " ", "11.12.2026 |"],
    ["11.12.202|", " ", "11.12.202|"],
    ["11.12.2026 |", " ", "11.12.2026 |"],
    ["11.12.2026 09:4|", " ", "11.12.2026 09:4|"],
    ["11.12.2026 09:45|", "1", "11.12.2026 09:45|"],
    ["11.12.2026 1|", ":", "11.12.2026 01:|"],
    ["11.12.2026 1|", ".", "11.12.2026 01:|"],
    ["1|", ".", "01.|"],
    ["1|", ":", "1|"],
    ["11.12.2026| 09:45", "3", "11.12.2026| 09:45"],
    ["11.12.2026| ", "9", "11.12.2026 09:|"],
  ])("%s + %j → %s", (before, key, after) => {
    expect(press(before, key)).toBe(after);
  });

  it("supports mode, precision and custom separators", () => {
    expect(type("20261211094530", { mode: "ymd", precision: "second" })).toBe(
      "2026.12.11 09:45:30|",
    );
    expect(
      type("121120260945", { mode: "mdy", separator: "/", timeSeparator: ".", joiner: ", " }),
    ).toBe("12/11/2026, 09.45|");
  });

  it("commits a multi-character joiner with space", () => {
    expect(press("11.12.2026|", " ", { joiner: ", " })).toBe("11.12.2026, |");
  });

  describe("deletion", () => {
    it.each([
      ["11.12.2026 |", "11.12.2026|"],
      ["11.12.2026 0|", "11.12.2026 |"],
      ["11.12.2026 |09:45", "11.12.202| 09:45"],
      ["11.12.2026 09:|", "11.12.2026 09|"],
    ])("Backspace %s → %s", (before, after) => {
      expect(press(before, "Backspace")).toBe(after);
    });

    it.each([
      ["11.12.2026| ", "11.12.2026|"],
      ["11.12.2026| 09:45", "11.12.2026| 9:45"],
      ["11.1|2.2026 09:45", "11.1|.2026 09:45"],
    ])("Delete %s → %s", (before, after) => {
      expect(press(before, "Delete")).toBe(after);
    });

    it("Ctrl+Backspace clears the time group or the year at the boundary", () => {
      expect(press("11.12.2026 09:45|", "Backspace", { ctrlKey: true })).toBe(
        "11.12.2026 09:|",
      );
      expect(press("11.12.2026 |09:45", "Backspace", { ctrlKey: true })).toBe(
        "11.12.| 09:45",
      );
      expect(press("11.12.2026 |", "Backspace", { metaKey: true })).toBe("11.12.|");
    });

    it("Ctrl+Delete at the date end clears the hour", () => {
      expect(press("11.12.2026| 09:45", "Delete", { ctrlKey: true })).toBe(
        "11.12.2026| 45",
      );
    });

    it("Shift+Backspace clears everything", () => {
      expect(press("11.12.2026 09:4|5", "Backspace", { shiftKey: true })).toBe("|");
    });

    it("deletes a selection across the joiner", () => {
      const next = applyDateTime({
        value: "11.12.2026 09:45",
        caret: 8,
        selectionEnd: 13,
        key: "Backspace",
      });
      expect(show(next.value, next.caret)).toBe("11.12.20| :45");

      const all = applyDateTime({
        value: "11.12.2026 09:45",
        caret: 0,
        selectionEnd: 16,
        key: "Delete",
      });
      expect(all).toEqual({ value: "", caret: 0 });

      const tail = applyDateTime({
        value: "11.12.2026 09:45",
        caret: 10,
        selectionEnd: 16,
        key: "Backspace",
      });
      expect(show(tail.value, tail.caret)).toBe("11.12.2026|");
    });

    it("replaces a selected time with a typed digit", () => {
      const next = applyDateTime({
        value: "11.12.2026 09:45",
        caret: 11,
        selectionEnd: 16,
        key: "7",
      });
      expect(show(next.value, next.caret)).toBe("11.12.2026 07:|");
    });
  });

  describe("arrow step", () => {
    it("steps the group under the caret", () => {
      expect(press("11.1|2.2026 09:45", "ArrowUp", { step: 1 })).toBe(
        "11.0|1.2026 09:45",
      );
      expect(press("11.12.2026 09:4|5", "ArrowDown", { step: 5 })).toBe(
        "11.12.2026 09:4|0",
      );
      expect(press("11.12.2026 09|:45", "ArrowUp", { step: 1 })).toBe(
        "11.12.2026 10|:45",
      );
    });

    it("ignores arrows when step is off", () => {
      expect(press("11.12.2026 09|:45", "ArrowUp")).toBe("11.12.2026 09|:45");
    });
  });
});

describe("isDateTimeMaskKey", () => {
  it.each(["0", "9", ".", "/", "-", ":", " ", "Backspace", "Delete"])("%j", (key) => {
    expect(isDateTimeMaskKey(key)).toBe(true);
  });

  it.each(["a", "T", "ArrowUp", "Tab", ","])("rejects %j", (key) => {
    expect(isDateTimeMaskKey(key)).toBe(false);
  });
});

describe("applyDateTimePaste", () => {
  function paste(marked: string, pasted: string, options: DateTimeFieldOptions = {}) {
    const { value, caret } = parse(marked);
    const next = applyDateTimePaste({ value, caret, pasted, ...options });
    return show(next.value, next.caret);
  }

  it.each([
    ["11.12.2026 09:45", "11.12.2026 09:45|"],
    ["11/12/2026 9:45", "11.12.2026 09:45|"],
    ["2026-12-11T09:45", "11.12.2026 09:45|"],
    ["2026-12-11T09:45:30.000Z", "11.12.2026 09:45|"],
    ["2026-12-11", "11.12.2026 |"],
    ["  11.12.2026   09:45  ", "11.12.2026 09:45|"],
    ["11.12 09:45", "11.12.|"],
    ["hello", "|"],
  ])("pastes %j", (pasted, after) => {
    expect(paste("|", pasted)).toBe(after);
  });

  it("pastes ISO into ymd seconds", () => {
    expect(paste("|", "2026-12-11T09:45:30", { mode: "ymd", precision: "second" })).toBe(
      "2026.12.11 09:45:30|",
    );
  });

  it("pastes a time into the time part", () => {
    expect(paste("11.12.2026 |", "9:45")).toBe("11.12.2026 09:45|");
    expect(paste("11.12.2026 |", "945")).toBe("11.12.2026 09:45|");
  });

  it("pastes a time at the end of a complete date", () => {
    expect(paste("11.12.2026|", "09:45")).toBe("11.12.2026 09:45|");
  });

  it("ignores a time pasted into an incomplete date", () => {
    expect(paste("11.12|", "09:45")).toBe("11.12|");
  });

  it("replaces a full selection", () => {
    const next = applyDateTimePaste({
      value: "01.01.2020 00:00",
      caret: 0,
      selectionEnd: 16,
      pasted: "2026-12-11 09:45",
    });
    expect(next).toEqual({ value: "11.12.2026 09:45", caret: 16 });
  });
});
