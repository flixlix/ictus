import { useCallback, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, KeyboardEvent, RefObject } from "react";
import {
  apply,
  applyPaste,
  dateStatus,
  isDateMaskKey,
  parseDate,
} from "./index.js";
import type { DateFieldMode, DateStatus } from "./index.js";
import {
  applyTime,
  applyTimePaste,
  isTimeMaskKey,
  isoTime,
  parseTime,
  timeStatus,
} from "./time.js";
import type { TimeFieldPrecision, TimeStatus, TimeValue } from "./time.js";

export type UseDateFieldMaskOptions = {
  separator?: string;
  mode?: DateFieldMode;
  defaultValue?: string;
  value?: string;
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
    mode,
    defaultValue = "",
    value: valueProp,
    onValueChange,
    onParsedChange,
    min,
    max,
    step = 0,
  } = options;
  const isControlled = valueProp !== undefined;
  const ref = useRef<HTMLInputElement | null>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = isControlled ? valueProp : uncontrolledValue;
  const parseOpts = { mode, min, max };
  const parsed = useMemo(
    () => parseDate(value, parseOpts),
    [value, mode, min, max],
  );
  const status = useMemo(() => dateStatus(value, { mode }), [value, mode]);
  const isoValue = iso(parsed);
  const prevIso = useRef(isoValue);

  const commit = useCallback(
    (next: { value: string; caret: number }) => {
      if (!isControlled) {
        setUncontrolledValue(next.value);
      }
      onValueChange?.(next.value);
      const d = parseDate(next.value, { mode, min, max });
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
    [isControlled, onValueChange, onParsedChange, mode, min, max],
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
          mode,
          step,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        }),
      );
    },
    [separator, mode, commit, step],
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
          mode,
        }),
      );
    },
    [separator, mode, commit],
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

export type UseTimeFieldMaskOptions = {
  separator?: string;
  precision?: TimeFieldPrecision;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onParsedChange?: (time: TimeValue | undefined) => void;
  min?: TimeValue;
  max?: TimeValue;
  step?: number;
};

export type UseTimeFieldMaskReturn = {
  ref: RefObject<HTMLInputElement | null>;
  value: string;
  parsed: TimeValue | undefined;
  status: TimeStatus;
  isoValue: string;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  inputProps: DateFieldInputProps;
  hiddenInputProps: { type: "hidden"; value: string };
};

export function useTimeFieldMask(
  options: UseTimeFieldMaskOptions = {},
): UseTimeFieldMaskReturn {
  const {
    separator,
    precision = "minute",
    defaultValue = "",
    value: valueProp,
    onValueChange,
    onParsedChange,
    min,
    max,
    step = 0,
  } = options;
  const isControlled = valueProp !== undefined;
  const ref = useRef<HTMLInputElement | null>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = isControlled ? valueProp : uncontrolledValue;
  const parseOpts = { precision, min, max };
  const parsed = useMemo(
    () => parseTime(value, parseOpts),
    [value, precision, min, max],
  );
  const status = useMemo(
    () => timeStatus(value, { precision }),
    [value, precision],
  );
  const isoValue = isoTime(parsed, precision);
  const prevIso = useRef(isoValue);

  const commit = useCallback(
    (next: { value: string; caret: number }) => {
      if (!isControlled) {
        setUncontrolledValue(next.value);
      }
      onValueChange?.(next.value);
      const t = parseTime(next.value, { precision, min, max });
      const k = isoTime(t, precision);
      if (k !== prevIso.current) {
        prevIso.current = k;
        onParsedChange?.(t);
      }
      const caret = next.caret;
      requestAnimationFrame(() => {
        ref.current?.setSelectionRange(caret, caret);
      });
    },
    [isControlled, onValueChange, onParsedChange, precision, min, max],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;
      const isStepArrow =
        step > 0 && (event.key === "ArrowUp" || event.key === "ArrowDown");
      if (!isTimeMaskKey(event.key) && !isStepArrow) return;
      event.preventDefault();
      commit(
        applyTime({
          value: event.currentTarget.value,
          caret: event.currentTarget.selectionStart ?? 0,
          selectionEnd: event.currentTarget.selectionEnd ?? undefined,
          key: event.key,
          separator,
          precision,
          step,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        }),
      );
    },
    [separator, precision, commit, step],
  );

  const onPaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      commit(
        applyTimePaste({
          value: event.currentTarget.value,
          caret: event.currentTarget.selectionStart ?? 0,
          selectionEnd: event.currentTarget.selectionEnd ?? undefined,
          pasted: event.clipboardData.getData("text"),
          separator,
          precision,
        }),
      );
    },
    [separator, precision, commit],
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
