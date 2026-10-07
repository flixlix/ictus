import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDateFieldMask } from "../src/react.js";

afterEach(cleanup);

function DateInput({
  separator,
  mode,
  defaultValue,
  value,
  onValueChange,
  onParsedChange,
  min,
  max,
  step,
}: {
  separator?: string;
  mode?: "dmy" | "mdy" | "ymd";
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onParsedChange?: (date: Date | undefined) => void;
  min?: Date;
  max?: Date;
  step?: number;
}) {
  const { inputProps, hiddenInputProps, isoValue, parsed, status } =
    useDateFieldMask({
      separator,
      mode,
      defaultValue,
      value,
      onValueChange,
      onParsedChange,
      min,
      max,
      step,
    });
  return (
    <>
      <input aria-label="date" {...inputProps} />
      <input aria-label="iso" {...hiddenInputProps} />
      <output>{parsed ? parsed.toDateString() : "incomplete"}</output>
      <span data-testid="status">{status}</span>
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

  it("spills an overflowing second day digit into the month", () => {
    render(<DateInput />);
    const input = screen.getByLabelText("date") as HTMLInputElement;
    typeKey("3");
    typeKey("9");
    expect(input.value).toBe("03.09.");
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
    expect(screen.getByTestId("status").textContent).toBe("valid");
    typeKey("Backspace");
    expect(screen.getByRole("status").textContent).toBe("incomplete");
    expect(screen.getByTestId("status").textContent).toBe("incomplete");
  });

  it("exposes dateStatus on the return value", () => {
    render(<DateInput />);
    expect(screen.getByTestId("status").textContent).toBe("empty");
    typeKey("4");
    expect(screen.getByTestId("status").textContent).toBe("incomplete");
  });

  it("treats an out-of-range complete date as incomplete", () => {
    render(
      <DateInput
        defaultValue="11.12.2026"
        min={new Date(2020, 0, 1)}
        max={new Date(2020, 11, 31)}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe("incomplete");
  });

  it("parses a complete date within min and max", () => {
    render(
      <DateInput
        defaultValue="15.06.2020"
        min={new Date(2020, 0, 1)}
        max={new Date(2020, 11, 31)}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(/Jun 15/);
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

  it("pastes a slash-separated date into the mask", async () => {
    render(<DateInput />);
    const input = screen.getByLabelText("date") as HTMLInputElement;
    fireEvent.paste(input, {
      clipboardData: { getData: () => "11/12/2026" },
    });
    expect(input.value).toBe("11.12.2026");
    await nextFrame();
    expect(input.selectionStart).toBe(10);
    expect(input.selectionEnd).toBe(10);
  });

  it("pastes an ISO date remapped to day-month-year", () => {
    render(<DateInput />);
    const input = screen.getByLabelText("date") as HTMLInputElement;
    fireEvent.paste(input, {
      clipboardData: { getData: () => "2026-12-11" },
    });
    expect(input.value).toBe("11.12.2026");
  });

  it("replaces a selected range on paste", () => {
    render(<DateInput defaultValue="11.12.2026" />);
    const input = screen.getByLabelText("date") as HTMLInputElement;
    input.setSelectionRange(0, input.value.length);
    fireEvent.paste(input, {
      clipboardData: { getData: () => "01-02-2025" },
    });
    expect(input.value).toBe("01.02.2025");
  });

  it("leaves ArrowUp/ArrowDown to the browser when step is off", () => {
    render(<DateInput defaultValue="11" />);
    const input = screen.getByLabelText("date");
    const up = fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(up).toBe(true);
    expect((input as HTMLInputElement).value).toBe("11");
  });

  it("steps the current group when step is set", async () => {
    render(<DateInput defaultValue="15.12.2026" step={1} />);
    const input = screen.getByLabelText("date") as HTMLInputElement;
    input.setSelectionRange(2, 2);
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.value).toBe("16.12.2026");
    await nextFrame();
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(2);
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


  it("uses controlled value as the source of truth", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <DateInput value="11" onValueChange={onValueChange} />,
    );
    const input = screen.getByLabelText("date") as HTMLInputElement;
    expect(input.value).toBe("11");
    typeKey("1");
    expect(onValueChange).toHaveBeenCalledWith("11.1");
    expect(input.value).toBe("11");
    rerender(<DateInput value="11.1" onValueChange={onValueChange} />);
    expect(input.value).toBe("11.1");
  });

  it("updates when the parent drives controlled value", () => {
    function Controlled() {
      const [value, setValue] = useState("");
      const { inputProps } = useDateFieldMask({
        value,
        onValueChange: setValue,
      });
      return (
        <>
          <input aria-label="date" {...inputProps} />
          <button type="button" onClick={() => setValue("04.09.2026")}>
            set
          </button>
        </>
      );
    }
    render(<Controlled />);
    const input = screen.getByLabelText("date") as HTMLInputElement;
    typeKey("4");
    expect(input.value).toBe("04.");
    fireEvent.click(screen.getByRole("button", { name: "set" }));
    expect(input.value).toBe("04.09.2026");
  });

  it("does not pad year first in ymd mode", () => {
    render(<DateInput separator="/" mode="ymd" />);
    typeKey("2");
    expect((screen.getByLabelText("date") as HTMLInputElement).value).toBe("2");
  });

  it("applies mdy overflow rules to the first group", () => {
    render(<DateInput separator="/" mode="mdy" />);
    const input = screen.getByLabelText("date") as HTMLInputElement;
    typeKey("4");
    expect(input.value).toBe("04/");
    typeKey("9");
    expect(input.value).toBe("04/09/");
  });

  it("parses mdy defaultValue", () => {
    render(<DateInput separator="/" mode="mdy" defaultValue="12/11/2026" />);
    expect(screen.getByRole("status").textContent).toMatch(/Dec 11/);
  });

});
