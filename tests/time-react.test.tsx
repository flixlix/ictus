import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTimeFieldMask } from "../src/react.js";
import type { TimeValue } from "../src/time.js";

afterEach(cleanup);

function TimeInput({
  separator,
  precision,
  defaultValue,
  value,
  onValueChange,
  onParsedChange,
  min,
  max,
  step,
}: {
  separator?: string;
  precision?: "minute" | "second";
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onParsedChange?: (time: TimeValue | undefined) => void;
  min?: TimeValue;
  max?: TimeValue;
  step?: number;
}) {
  const { inputProps, hiddenInputProps, isoValue, parsed, status } =
    useTimeFieldMask({
      separator,
      precision,
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
      <input aria-label="time" {...inputProps} />
      <input aria-label="iso" {...hiddenInputProps} />
      <output>
        {parsed
          ? `${parsed.hours}:${parsed.minutes}:${parsed.seconds}`
          : "incomplete"}
      </output>
      <span data-testid="status">{status}</span>
      <span data-testid="iso-value">{isoValue}</span>
    </>
  );
}

function typeKey(key: string) {
  fireEvent.keyDown(screen.getByLabelText("time"), { key });
}

describe("useTimeFieldMask", () => {
  it("overflow-pads and advances", () => {
    render(<TimeInput />);
    const input = screen.getByLabelText("time") as HTMLInputElement;
    typeKey("9");
    expect(input.value).toBe("09:");
    expect(screen.getByTestId("status").textContent).toBe("incomplete");
  });

  it("parses a complete time and exposes isoValue", () => {
    render(<TimeInput defaultValue="14:30" />);
    expect(screen.getByTestId("status").textContent).toBe("valid");
    expect(screen.getByTestId("iso-value").textContent).toBe("14:30");
    expect(screen.getByLabelText("iso")).toHaveProperty("value", "14:30");
  });

  it("calls onParsedChange when a complete time appears", () => {
    const onParsedChange = vi.fn();
    render(<TimeInput onParsedChange={onParsedChange} />);
    typeKey("1");
    typeKey("4");
    typeKey("3");
    typeKey("0");
    expect(onParsedChange).toHaveBeenCalledTimes(1);
    expect(onParsedChange.mock.calls[0]?.[0]).toEqual({
      hours: 14,
      minutes: 30,
      seconds: 0,
    });
  });

  it("supports controlled value", () => {
    function Controlled() {
      const [value, setValue] = useState("");
      return <TimeInput value={value} onValueChange={setValue} />;
    }
    render(<Controlled />);
    const input = screen.getByLabelText("time") as HTMLInputElement;
    typeKey("9");
    expect(input.value).toBe("09:");
  });

  it("supports seconds precision", () => {
    render(<TimeInput precision="second" defaultValue="14:30:05" />);
    expect(screen.getByTestId("iso-value").textContent).toBe("14:30:05");
  });
});
