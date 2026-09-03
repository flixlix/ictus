import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDateFieldMask } from "../src/react.js";

afterEach(cleanup);

function DateInput({
  separator,
  defaultValue,
  onValueChange,
}: {
  separator?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const { inputProps, parsed } = useDateFieldMask({
    separator,
    defaultValue,
    onValueChange,
  });
  return (
    <>
      <input aria-label="date" {...inputProps} />
      <output>{parsed ? parsed.toDateString() : "incomplete"}</output>
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
