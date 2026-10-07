import { afterEach, describe, expect, it, vi } from "vitest";
import { bindTimeMask } from "../src/time.js";

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

describe("bindTimeMask", () => {
  it("overflow-pads and places the caret", () => {
    const input = createInput();
    bindTimeMask(input);
    typeKey(input, "9");
    expect(input.value).toBe("09:");
    expect(input.selectionStart).toBe(3);
    expect(input.selectionEnd).toBe(3);
  });

  it("spills an overflowing second hour digit into the minute", () => {
    const input = createInput();
    bindTimeMask(input);
    typeKey(input, "2");
    typeKey(input, "4");
    expect(input.value).toBe("02:4");
  });

  it("writes a custom separator", () => {
    const input = createInput();
    bindTimeMask(input, { separator: "." });
    typeKey(input, "9");
    expect(input.value).toBe("09.");
  });

  it("calls onValueChange", () => {
    const onValueChange = vi.fn();
    const input = createInput();
    bindTimeMask(input, { onValueChange });
    typeKey(input, "9");
    expect(onValueChange).toHaveBeenCalledWith("09:");
  });

  it("supports seconds precision", () => {
    const input = createInput("14:30");
    bindTimeMask(input, { precision: "second" });
    input.setSelectionRange(5, 5);
    typeKey(input, ":");
    expect(input.value).toBe("14:30:");
    typeKey(input, "6");
    expect(input.value).toBe("14:30:06");
  });

  it("unbinds listeners", () => {
    const input = createInput();
    const unbind = bindTimeMask(input);
    unbind();
    typeKey(input, "9");
    expect(input.value).toBe("");
  });
});
