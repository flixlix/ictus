import { useCallback, useMemo, useRef, useState } from "react";
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

export type UseDateFieldMaskReturn = {
  ref: RefObject<HTMLInputElement | null>;
  value: string;
  parsed: Date | undefined;
  isoValue: string;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  inputProps: DateFieldInputProps;
  hiddenInputProps: { type: "hidden"; value: string };
};

function noopChange(_event: ChangeEvent<HTMLInputElement>) {}

function iso(date: Date | undefined) {
  return date
    ? `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`
    : "";
}

export function useDateFieldMask(
  options: UseDateFieldMaskOptions = {},
): UseDateFieldMaskReturn {
  const { separator, defaultValue = "", onValueChange, onParsedChange } = options;
  const ref = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(defaultValue);
  const parsed = useMemo(() => parseDate(value), [value]);
  const isoValue = iso(parsed);
  const prev = useRef(isoValue);

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
      const d = parseDate(next.value);
      const k = iso(d);
      if (k !== prev.current) {
        prev.current = k;
        onParsedChange?.(d);
      }
      requestAnimationFrame(() => {
        ref.current?.setSelectionRange(next.caret, next.caret);
      });
    },
    [separator, onValueChange, onParsedChange],
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
    hiddenInputProps: { type: "hidden", value: isoValue },
  };
}
