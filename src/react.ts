import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";
import { apply, isDateMaskKey, parseDate } from "./index.js";

export type UseDateFieldMaskOptions = {
  separator?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onParsedChange?: (date: Date | undefined) => void;
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

export type DateFieldHiddenInputProps = {
  type: "hidden";
  value: string;
};

export type UseDateFieldMaskReturn = {
  ref: RefObject<HTMLInputElement | null>;
  value: string;
  parsed: Date | undefined;
  isoValue: string;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  inputProps: DateFieldInputProps;
  hiddenInputProps: DateFieldHiddenInputProps;
};

function noopChange(_event: ChangeEvent<HTMLInputElement>) {}

function toIsoValue(date: Date | undefined): string {
  if (!date) return "";
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useDateFieldMask(
  options: UseDateFieldMaskOptions = {},
): UseDateFieldMaskReturn {
  const { separator, defaultValue = "", onValueChange, onParsedChange } = options;
  const ref = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(defaultValue);
  const parsed = useMemo(() => parseDate(value), [value]);
  const isoValue = toIsoValue(parsed);
  const prevParsedKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    const nextKey = toIsoValue(parsed);
    if (prevParsedKey.current === undefined) {
      prevParsedKey.current = nextKey;
      return;
    }
    if (prevParsedKey.current === nextKey) return;
    prevParsedKey.current = nextKey;
    onParsedChange?.(parsed);
  }, [parsed, onParsedChange]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!isDateMaskKey(event.key)) return;
      event.preventDefault();
      const next = apply({
        value: event.currentTarget.value,
        caret: event.currentTarget.selectionStart ?? 0,
        selectionEnd: event.currentTarget.selectionEnd ?? undefined,
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
    isoValue,
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
    hiddenInputProps: {
      type: "hidden",
      value: isoValue,
    },
  };
}
