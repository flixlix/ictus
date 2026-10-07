import { useCallback, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, KeyboardEvent, RefObject } from "react";
import { apply, applyPaste, isDateMaskKey, parseDate } from "./index.js";

export type UseDateFieldMaskOptions = {
  separator?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  step?: number;
};

export type DateFieldInputProps = {
  ref: RefObject<HTMLInputElement | null>;
  value: string;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  inputMode: "numeric";
  autoComplete: "off";
  spellCheck: false;
};

export type UseDateFieldMaskReturn = {
  ref: RefObject<HTMLInputElement | null>;
  value: string;
  parsed: Date | undefined;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  inputProps: DateFieldInputProps;
};

function noopChange(_event: ChangeEvent<HTMLInputElement>) {}

export function useDateFieldMask(
  options: UseDateFieldMaskOptions = {},
): UseDateFieldMaskReturn {
  const { separator, defaultValue = "", onValueChange, step = 0 } = options;
  const ref = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(defaultValue);
  const parsed = useMemo(() => parseDate(value), [value]);

  const commit = useCallback(
    (next: { value: string; caret: number }) => {
      setValue(next.value);
      onValueChange?.(next.value);
      const caret = next.caret;
      requestAnimationFrame(() => {
        ref.current?.setSelectionRange(caret, caret);
      });
    },
    [onValueChange],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;
      const isStepArrow =
        step > 0 && (event.key === "ArrowUp" || event.key === "ArrowDown");
      if (!isDateMaskKey(event.key) && !isStepArrow) return;
      event.preventDefault();
      commit(
        apply({
          value: event.currentTarget.value,
          caret: event.currentTarget.selectionStart ?? 0,
          selectionEnd: event.currentTarget.selectionEnd ?? undefined,
          key: event.key,
          separator,
          step,
        }),
      );
    },
    [separator, commit, step],
  );

  const onPaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      commit(
        applyPaste({
          value: event.currentTarget.value,
          caret: event.currentTarget.selectionStart ?? 0,
          selectionEnd: event.currentTarget.selectionEnd ?? undefined,
          pasted: event.clipboardData.getData("text"),
          separator,
        }),
      );
    },
    [separator, commit],
  );

  return {
    ref,
    value,
    parsed,
    onKeyDown,
    onPaste,
    inputProps: {
      ref,
      value,
      onKeyDown,
      onPaste,
      onChange: noopChange,
      inputMode: "numeric",
      autoComplete: "off",
      spellCheck: false,
    },
  };
}
