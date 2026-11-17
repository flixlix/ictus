import { applyDateTime, applyDateTimePaste, isDateTimeMaskKey } from "./datetime.js";
import type { DateTimeFieldOptions } from "./datetime.js";

export type BindDateTimeMaskOptions = DateTimeFieldOptions & {
  step?: number;
  onValueChange?: (value: string) => void;
  getValue?: () => string;
  setValue?: (value: string) => void;
};

export function bindDateTimeMask(
  input: HTMLInputElement,
  options: BindDateTimeMaskOptions = {},
): () => void {
  const { separator, timeSeparator, joiner, mode, precision, onValueChange, step = 0 } = options;
  const getValue = options.getValue ?? (() => input.value);
  const setValue =
    options.setValue ??
    ((value: string) => {
      input.value = value;
    });

  const write = (next: { value: string; caret: number }): void => {
    setValue(next.value);
    input.setSelectionRange(next.caret, next.caret);
    onValueChange?.(next.value);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (
      !isDateTimeMaskKey(event.key) &&
      !(step > 0 && (event.key === "ArrowUp" || event.key === "ArrowDown"))
    ) {
      return;
    }
    event.preventDefault();
    write(
      applyDateTime({
        value: getValue(),
        caret: input.selectionStart ?? 0,
        selectionEnd: input.selectionEnd ?? undefined,
        key: event.key,
        separator,
        timeSeparator,
        joiner,
        mode,
        precision,
        step,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      }),
    );
  };

  const onPaste = (event: ClipboardEvent): void => {
    event.preventDefault();
    write(
      applyDateTimePaste({
        value: getValue(),
        caret: input.selectionStart ?? 0,
        selectionEnd: input.selectionEnd ?? undefined,
        pasted: event.clipboardData?.getData("text") ?? "",
        separator,
        timeSeparator,
        joiner,
        mode,
        precision,
      }),
    );
  };

  input.addEventListener("keydown", onKeyDown);
  input.addEventListener("paste", onPaste);

  return () => {
    input.removeEventListener("keydown", onKeyDown);
    input.removeEventListener("paste", onPaste);
  };
}
