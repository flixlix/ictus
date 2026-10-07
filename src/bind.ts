import { apply, applyPaste, isDateMaskKey } from "./index.js";
import type { DateFieldMode } from "./index.js";

export type BindDateMaskOptions = {
  separator?: string;
  mode?: DateFieldMode;
  step?: number;
  onValueChange?: (value: string) => void;
  getValue?: () => string;
  setValue?: (value: string) => void;
};

export function bindDateMask(
  input: HTMLInputElement,
  options: BindDateMaskOptions = {},
): () => void {
  const { separator, mode, onValueChange, step = 0 } = options;
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
      !isDateMaskKey(event.key) &&
      !(step > 0 && (event.key === "ArrowUp" || event.key === "ArrowDown"))
    ) {
      return;
    }
    event.preventDefault();
    write(
      apply({
        value: getValue(),
        caret: input.selectionStart ?? 0,
        selectionEnd: input.selectionEnd ?? undefined,
        key: event.key,
        separator,
        mode,
        step,
      }),
    );
  };

  const onPaste = (event: ClipboardEvent): void => {
    event.preventDefault();
    write(
      applyPaste({
        value: getValue(),
        caret: input.selectionStart ?? 0,
        selectionEnd: input.selectionEnd ?? undefined,
        pasted: event.clipboardData?.getData("text") ?? "",
        separator,
        mode,
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
