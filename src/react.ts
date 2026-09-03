import { useCallback, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";
import { apply, isDateMaskKey, parseDate } from "./index.js";

export type UseDateFieldMaskOptions = {
  separator?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

export type DateFieldInputProps = {
  ref: RefObject<HTMLInputElement | null>;
  value: string;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
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
  inputProps: DateFieldInputProps;
};

function noopChange(_event: ChangeEvent<HTMLInputElement>) {}

export function useDateFieldMask(
  options: UseDateFieldMaskOptions = {},
): UseDateFieldMaskReturn {
  const { separator, defaultValue = "", onValueChange } = options;
  const ref = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(defaultValue);
  const parsed = useMemo(() => parseDate(value), [value]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!isDateMaskKey(event.key)) return;
      event.preventDefault();
      const next = apply({
        value: event.currentTarget.value,
        caret: event.currentTarget.selectionStart ?? 0,
        key: event.key,
        separator,
      });
      setValue(next.value);
      onValueChange?.(next.value);
      const caret = next.caret;
      requestAnimationFrame(() => {
        ref.current?.setSelectionRange(caret, caret);
      });
    },
    [separator, onValueChange],
  );

  return {
    ref,
    value,
    parsed,
    onKeyDown,
    inputProps: {
      ref,
      value,
      onKeyDown,
      onChange: noopChange,
      inputMode: "numeric",
      autoComplete: "off",
      spellCheck: false,
    },
  };
}
