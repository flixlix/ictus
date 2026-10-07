import { apply, isDateMaskKey } from "./index.js";

export type BindDateMaskOptions = {
  separator?: string;
  step?: number;
  onValueChange?: (value: string) => void;
  getValue?: () => string;
  setValue?: (value: string) => void;
};

export function bindDateMask(
  input: HTMLInputElement,
  options: BindDateMaskOptions = {},
): () => void {
  const { separator, onValueChange, step = 0 } = options;
  const getValue = options.getValue ?? (() => input.value);
  const setValue =
    options.setValue ??
    ((value: string) => {
      input.value = value;
    });

  const commit = (key: string): void => {
    const next = apply({
      value: getValue(),
      caret: input.selectionStart ?? 0,
      selectionEnd: input.selectionEnd ?? undefined,
      key,
      separator,
      step,
    });
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
    commit(event.key);
  };

  const onPaste = (event: ClipboardEvent): void => {
    const text = event.clipboardData?.getData("text") ?? "";
    const keys = [...text].filter((ch) => isDateMaskKey(ch));
    if (keys.length === 0) return;
    event.preventDefault();
    for (const key of keys) {
      commit(key);
    }
  };

  input.addEventListener("keydown", onKeyDown);
  input.addEventListener("paste", onPaste);

  return () => {
    input.removeEventListener("keydown", onKeyDown);
    input.removeEventListener("paste", onPaste);
  };
}
