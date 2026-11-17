import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDateTimeFieldMask } from "../src/react.js";
import type { UseDateTimeFieldMaskOptions } from "../src/react.js";

afterEach(cleanup);

function DateTimeInput(props: UseDateTimeFieldMaskOptions) {
  const { inputProps, hiddenInputProps, isoValue, status } = useDateTimeFieldMask(props);
  return (
    <>
      <input aria-label="datetime" {...inputProps} />
      <input aria-label="iso" {...hiddenInputProps} />
      <span data-testid="status">{status}</span>
      <span data-testid="iso-value">{isoValue}</span>
    </>
  );
}

function typeKeys(keys: string) {
  for (const key of keys) {
    fireEvent.keyDown(screen.getByLabelText("datetime"), { key });
  }
}

describe("useDateTimeFieldMask", () => {
  it("types a date and time", () => {
    render(<DateTimeInput />);
    const input = screen.getByLabelText("datetime") as HTMLInputElement;
    typeKeys("11122026");
    expect(input.value).toBe("11.12.2026 ");
    expect(screen.getByTestId("status").textContent).toBe("incomplete");
    typeKeys("0945");
    expect(input.value).toBe("11.12.2026 09:45");
    expect(screen.getByTestId("status").textContent).toBe("valid");
    expect(screen.getByTestId("iso-value").textContent).toBe("2026-12-11T09:45");
    expect(screen.getByLabelText("iso")).toHaveProperty("value", "2026-12-11T09:45");
  });

  it("calls onParsedChange once a full value appears", () => {
    const onParsedChange = vi.fn();
    render(<DateTimeInput onParsedChange={onParsedChange} />);
    typeKeys("111220260945");
    expect(onParsedChange).toHaveBeenCalledTimes(1);
    expect(onParsedChange.mock.calls[0]?.[0]).toEqual(new Date(2026, 11, 11, 9, 45));
  });

  it("respects min and max", () => {
    render(
      <DateTimeInput
        defaultValue="11.12.2026 18:00"
        max={new Date(2026, 11, 11, 17, 30)}
      />,
    );
    expect(screen.getByTestId("iso-value").textContent).toBe("");
  });

  it("supports controlled value and options", () => {
    function Controlled() {
      const [value, setValue] = useState("");
      return (
        <DateTimeInput
          value={value}
          onValueChange={setValue}
          mode="ymd"
          separator="-"
          joiner=", "
          precision="second"
        />
      );
    }
    render(<Controlled />);
    const input = screen.getByLabelText("datetime") as HTMLInputElement;
    typeKeys("20261211094530");
    expect(input.value).toBe("2026-12-11, 09:45:30");
    expect(screen.getByTestId("iso-value").textContent).toBe("2026-12-11T09:45:30");
  });

  it("normalizes paste", () => {
    render(<DateTimeInput />);
    const input = screen.getByLabelText("datetime") as HTMLInputElement;
    fireEvent.paste(input, { clipboardData: { getData: () => "2026-12-11T09:45" } });
    expect(input.value).toBe("11.12.2026 09:45");
  });
});
