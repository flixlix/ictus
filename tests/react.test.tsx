import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDateFieldMask } from "../src/react.js";

afterEach(cleanup);

function DateInput({
  separator,
  defaultValue,
  onValueChange,
  onParsedChange,
}: {
  separator?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onParsedChange?: (date: Date | undefined) => void;
}) {
  const { inputProps, hiddenInputProps, isoValue, parsed } = useDateFieldMask({
    separator,
    defaultValue,
    onValueChange,
    onParsedChange,
  });
  return (
    <>
      <input aria-label="date" {...inputProps} />
      <input aria-label="iso" {...hiddenInputProps} />
      <output>{parsed ? parsed.toDateString() : "incomplete"}</output>
      <span data-testid="iso-value">{isoValue}</span>
    </>
  );
}

function typeKey(key: string) {
  fireEvent.keyDown(screen.getByLabelText("date"), { key });
}

async function nextFrame() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

describe("useDateFieldMask", () => {
  it("overflow-pads and places the caret", async () => {
    render(<DateInput />);
    const input = screen.getByLabelText("date") as HTMLInputElement;
    typeKey("4");
    expect(input.value).toBe("04.");
    await nextFrame();
    expect(input.selectionStart).toBe(3);
    expect(input.selectionEnd).toBe(3);
  });

  it("rejects an impossible second day digit", () => {
    render(<DateInput />);
    const input = screen.getByLabelText("date") as HTMLInputElement;
    typeKey("3");
    typeKey("9");
    expect(input.value).toBe("3");
  });

  it("writes a custom separator", () => {
    render(<DateInput separator="/" />);
    typeKey("4");
    expect((screen.getByLabelText("date") as HTMLInputElement).value).toBe("04/");
  });

  it("starts from defaultValue", () => {
    render(<DateInput defaultValue="11" />);
    typeKey("1");
    expect((screen.getByLabelText("date") as HTMLInputElement).value).toBe("11.1");
  });

  it("parses only a complete calendar date", () => {
    render(<DateInput defaultValue="11.12.2026" />);
    expect(screen.getByRole("status").textContent).toMatch(/Dec 11/);
    typeKey("Backspace");
    expect(screen.getByRole("status").textContent).toBe("incomplete");
  });

  it("calls onValueChange", () => {
    const onValueChange = vi.fn();
    render(<DateInput onValueChange={onValueChange} />);
    typeKey("4");
    expect(onValueChange).toHaveBeenCalledWith("04.");
  });

  it("exposes isoValue and hiddenInputProps when complete", () => {
    render(<DateInput defaultValue="11.12.2026" />);
    expect(screen.getByTestId("iso-value").textContent).toBe("2026-12-11");
    const hidden = screen.getByLabelText("iso") as HTMLInputElement;
    expect(hidden.type).toBe("hidden");
    expect(hidden.value).toBe("2026-12-11");
    typeKey("Backspace");
    expect(screen.getByTestId("iso-value").textContent).toBe("");
    expect(hidden.value).toBe("");
  });

  it("calls onParsedChange when the calendar day changes", () => {
    const onParsedChange = vi.fn();
    render(
      <DateInput defaultValue="11.12.202" onParsedChange={onParsedChange} />,
    );
    expect(onParsedChange).not.toHaveBeenCalled();
    typeKey("6");
    expect(onParsedChange).toHaveBeenCalledTimes(1);
    const date = onParsedChange.mock.calls[0]?.[0] as Date;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(11);
    expect(date.getDate()).toBe(11);
    typeKey("Backspace");
    expect(onParsedChange).toHaveBeenCalledTimes(2);
    expect(onParsedChange).toHaveBeenLastCalledWith(undefined);
  });

  it("does not call onParsedChange for incomplete keystrokes", () => {
    const onParsedChange = vi.fn();
    render(<DateInput onParsedChange={onParsedChange} />);
    typeKey("1");
    typeKey("1");
    typeKey(".");
    expect(onParsedChange).not.toHaveBeenCalled();
  });

  it("clears when the whole value is selected and deleted", () => {
    render(<DateInput defaultValue="11.12.2026" />);
    const input = screen.getByLabelText("date") as HTMLInputElement;
    input.setSelectionRange(0, input.value.length);
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(input.value).toBe("");
  });

  it("leaves arrows and letters to the browser", () => {
    render(<DateInput defaultValue="11" />);
    const input = screen.getByLabelText("date");
    const arrow = fireEvent.keyDown(input, { key: "ArrowLeft" });
    const letter = fireEvent.keyDown(input, { key: "a" });
    expect(arrow).toBe(true);
    expect(letter).toBe(true);
    expect((input as HTMLInputElement).value).toBe("11");
  });

  it("spreads inputProps onto a controlled field", () => {
    function Wrapper() {
      const { inputProps } = useDateFieldMask();
      const [extra, setExtra] = useState("");
      return (
        <>
          <input aria-label="date" {...inputProps} />
          <button type="button" onClick={() => setExtra(inputProps.value)}>
            save
          </button>
          <span>{extra}</span>
        </>
      );
    }
    render(<Wrapper />);
    typeKey("1");
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    expect(screen.getByText("1")).toBeTruthy();
  });
});
