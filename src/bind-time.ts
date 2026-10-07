import { applyTime, applyTimePaste, isTimeMaskKey } from "./time.js";
import type { TimeFieldPrecision } from "./time.js";

export type BindTimeMaskOptions = {
  separator?: string;
  precision?: TimeFieldPrecision;
  step?: number;
  onValueChange?: (value: string) => void;
  getValue?: () => string;
  setValue?: (value: string) => void;
};

export function bindTimeMask(
  input: HTMLInputElement,
  options: BindTimeMaskOptions = {},
): () => void {
  const { separator, precision, onValueChange, step = 0 } = options;
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
      !isTimeMaskKey(event.key) &&
      !(step > 0 && (event.key === "ArrowUp" || event.key === "ArrowDown"))
    ) {
      return;
    }
    event.preventDefault();
    write(
      applyTime({
        value: getValue(),
        caret: input.selectionStart ?? 0,
        selectionEnd: input.selectionEnd ?? undefined,
        key: event.key,
        separator,
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
      applyTimePaste({
        value: getValue(),
        caret: input.selectionStart ?? 0,
        selectionEnd: input.selectionEnd ?? undefined,
        pasted: event.clipboardData?.getData("text") ?? "",
        separator,
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
