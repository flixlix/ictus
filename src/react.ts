import { useCallback, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, KeyboardEvent, RefObject } from "react";
import { apply, applyPaste, dateStatus, isDateMaskKey, parseDate } from "./index.js";
import type { DateStatus } from "./index.js";

export type UseDateFieldMaskOptions = {
  separator?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onParsedChange?: (date: Date | undefined) => void;
  min?: Date;
  max?: Date;
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
  status: DateStatus;
  isoValue: string;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
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
  const {
    separator,
    defaultValue = "",
    onValueChange,
    onParsedChange,
    min,
    max,
    step = 0,
  } = options;
  const ref = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(defaultValue);
  const parsed = useMemo(
    () => parseDate(value, { min, max }),
    [value, min, max],
  );
  const status = useMemo(() => dateStatus(value), [value]);
  const isoValue = iso(parsed);
  const prevIso = useRef(isoValue);

  const commit = useCallback(
    (next: { value: string; caret: number }) => {
      setValue(next.value);
      onValueChange?.(next.value);
      const d = parseDate(next.value, { min, max });
      const k = iso(d);
      if (k !== prevIso.current) {
        prevIso.current = k;
        onParsedChange?.(d);
      }
      const caret = next.caret;
      requestAnimationFrame(() => {
        ref.current?.setSelectionRange(caret, caret);
      });
    },
    [onValueChange, onParsedChange, min, max],
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
    status,
    isoValue,
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
    hiddenInputProps: { type: "hidden", value: isoValue },
  };
}
