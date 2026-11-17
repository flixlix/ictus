import { afterEach, describe, expect, it, vi } from "vitest";
import { bindDateTimeMask } from "../src/datetime.js";

function createInput(value = ""): HTMLInputElement {
  const input = document.createElement("input");
  input.value = value;
  document.body.appendChild(input);
  input.focus();
  input.setSelectionRange(value.length, value.length);
  return input;
}

function typeKey(input: HTMLInputElement, key: string) {
  return input.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("bindDateTimeMask", () => {
  it("types through the date into the time", () => {
    const input = createInput();
    bindDateTimeMask(input);
    for (const key of "111220260945") typeKey(input, key);
    expect(input.value).toBe("11.12.2026 09:45");
    expect(input.selectionStart).toBe(16);
  });

  it("handles the space key and leaves other keys alone", () => {
    const input = createInput("11.12.2026");
    bindDateTimeMask(input);
    expect(typeKey(input, " ")).toBe(false);
    expect(input.value).toBe("11.12.2026 ");
    expect(typeKey(input, "Tab")).toBe(true);
  });

  it("passes options and calls onValueChange", () => {
    const onValueChange = vi.fn();
    const input = createInput("2026/12/11, 09.45");
    bindDateTimeMask(input, {
      mode: "ymd",
      separator: "/",
      timeSeparator: ".",
      joiner: ", ",
      precision: "second",
      onValueChange,
    });
    typeKey(input, "6");
    expect(input.value).toBe("2026/12/11, 09.45.06");
    expect(onValueChange).toHaveBeenCalledWith("2026/12/11, 09.45.06");
  });

  it("normalizes pasted ISO strings", () => {
    const input = createInput();
    bindDateTimeMask(input);
    const event = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => "2026-12-11T09:45" },
    });
    input.dispatchEvent(event);
    expect(input.value).toBe("11.12.2026 09:45");
  });

  it("unbinds listeners", () => {
    const input = createInput();
    const unbind = bindDateTimeMask(input);
    unbind();
    typeKey(input, "9");
    expect(input.value).toBe("");
  });
});
