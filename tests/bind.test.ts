import { afterEach, describe, expect, it, vi } from "vitest";
import { bindDateMask } from "../src/bind.js";

function createInput(value = ""): HTMLInputElement {
  const input = document.createElement("input");
  input.value = value;
  document.body.appendChild(input);
  input.focus();
  input.setSelectionRange(value.length, value.length);
  return input;
}

function typeKey(
  input: HTMLInputElement,
  key: string,
  mods?: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean },
) {
  return input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ctrlKey: mods?.ctrlKey,
      metaKey: mods?.metaKey,
      shiftKey: mods?.shiftKey,
    }),
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("bindDateMask", () => {
  it("overflow-pads and places the caret", () => {
    const input = createInput();
    bindDateMask(input);
    typeKey(input, "4");
    expect(input.value).toBe("04.");
    expect(input.selectionStart).toBe(3);
    expect(input.selectionEnd).toBe(3);
  });

  it("spills an overflowing second day digit into the month", () => {
    const input = createInput();
    bindDateMask(input);
    typeKey(input, "3");
    typeKey(input, "9");
    expect(input.value).toBe("03.09.");
    expect(input.selectionStart).toBe(6);
  });

  it("writes a custom separator", () => {
    const input = createInput();
    bindDateMask(input, { separator: "/" });
    typeKey(input, "4");
    expect(input.value).toBe("04/");
  });

  it("calls onValueChange", () => {
    const onValueChange = vi.fn();
    const input = createInput();
    bindDateMask(input, { onValueChange });
    typeKey(input, "4");
    expect(onValueChange).toHaveBeenCalledWith("04.");
  });

  it("clears when the whole value is selected and deleted", () => {
    const input = createInput("11.12.2026");
    bindDateMask(input);
    input.setSelectionRange(0, input.value.length);
    typeKey(input, "Backspace");
    expect(input.value).toBe("");
  });

  it("Ctrl+Backspace clears the active group", () => {
    const input = createInput("11.12.2026");
    bindDateMask(input);
    input.setSelectionRange(input.value.length, input.value.length);
    typeKey(input, "Backspace", { ctrlKey: true });
    expect(input.value).toBe("11.12.");
  });

  it("Shift+Backspace clears the whole value", () => {
    const input = createInput("11.12.2026");
    bindDateMask(input);
    input.setSelectionRange(input.value.length, input.value.length);
    typeKey(input, "Backspace", { shiftKey: true });
    expect(input.value).toBe("");
  });

  it("leaves arrows and letters to the browser", () => {
    const input = createInput("11");
    bindDateMask(input);
    expect(typeKey(input, "ArrowLeft")).toBe(true);
    expect(typeKey(input, "ArrowUp")).toBe(true);
    expect(typeKey(input, "a")).toBe(true);
    expect(input.value).toBe("11");
  });

  it("steps the current group when step is set", () => {
    const input = createInput("15.12.2026");
    bindDateMask(input, { step: 1 });
    input.setSelectionRange(2, 2);
    typeKey(input, "ArrowUp");
    expect(input.value).toBe("16.12.2026");
    expect(input.selectionStart).toBe(2);
  });

  it("prevents default for mask keys", () => {
    const input = createInput();
    bindDateMask(input);
    const event = new KeyboardEvent("keydown", {
      key: "4",
      bubbles: true,
      cancelable: true,
    });
    const prevented = !input.dispatchEvent(event) || event.defaultPrevented;
    expect(prevented).toBe(true);
  });

  it("uses getValue and setValue when provided", () => {
    let owned = "11";
    const input = createInput(owned);
    bindDateMask(input, {
      getValue: () => owned,
      setValue: (value) => {
        owned = value;
        input.value = value;
      },
    });
    typeKey(input, "1");
    expect(owned).toBe("11.1");
    expect(input.value).toBe("11.1");
  });

  it("applies pasted digits through the mask", () => {
    const input = createInput();
    bindDateMask(input);
    const event = new Event("paste", { bubbles: true, cancelable: true }) as Event & {
      clipboardData?: { getData: (type: string) => string };
    };
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => "4" },
    });
    input.dispatchEvent(event);
    expect(input.value).toBe("04.");
    expect(input.selectionStart).toBe(3);
  });

  it("unsubscribe removes keydown handling", () => {
    const input = createInput();
    const unbind = bindDateMask(input);
    unbind();
    typeKey(input, "4");
    expect(input.value).toBe("");
  });
});
