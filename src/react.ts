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
import {
  applyDateTime,
  applyDateTimePaste,
  dateTimeStatus,
  isDateTimeMaskKey,
  isoDateTime,
  parseDateTime,
} from "./datetime.js";
import type { DateTimeStatus } from "./datetime.js";

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

export type UseDateTimeFieldMaskOptions = {
  separator?: string;
  timeSeparator?: string;
  joiner?: string;
  mode?: DateFieldMode;
  precision?: TimeFieldPrecision;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onParsedChange?: (date: Date | undefined) => void;
  min?: Date;
  max?: Date;
  step?: number;
};

export type UseDateTimeFieldMaskReturn = {
  ref: RefObject<HTMLInputElement | null>;
  value: string;
  parsed: Date | undefined;
  status: DateTimeStatus;
  isoValue: string;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  inputProps: DateFieldInputProps;
  hiddenInputProps: { type: "hidden"; value: string };
};

type Edit = { value: string; caret: number; selectionEnd?: number };

type MaskConfig<P, S> = {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onParsedChange?: (parsed: P | undefined) => void;
  step: number;
  deps: unknown[];
  isKey: (key: string) => boolean;
  key: (edit: Edit & { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => {
    value: string;
    caret: number;
  };
  paste: (edit: Edit & { pasted: string }) => { value: string; caret: number };
  parse: (value: string) => P | undefined;
  status: (value: string) => S;
  iso: (parsed: P | undefined) => string;
};

function noopChange(_event: ChangeEvent<HTMLInputElement>) {}

function iso(date: Date | undefined) {
  return date
    ? `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`
    : "";
}

function useMask<P, S>(config: MaskConfig<P, S>) {
  const { value: valueProp, defaultValue = "", onValueChange, onParsedChange, step, deps } =
    config;
  const isControlled = valueProp !== undefined;
  const ref = useRef<HTMLInputElement | null>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = isControlled ? valueProp : uncontrolledValue;
  const parsed = useMemo(() => config.parse(value), [value, ...deps]);
  const status = useMemo(() => config.status(value), [value, ...deps]);
  const isoValue = config.iso(parsed);
  const prevIso = useRef(isoValue);

  const commit = useCallback(
    (next: { value: string; caret: number }) => {
      if (!isControlled) {
        setUncontrolledValue(next.value);
      }
      onValueChange?.(next.value);
      const d = config.parse(next.value);
      const k = config.iso(d);
      if (k !== prevIso.current) {
        prevIso.current = k;
        onParsedChange?.(d);
      }
      const caret = next.caret;
      requestAnimationFrame(() => {
        ref.current?.setSelectionRange(caret, caret);
      });
    },
    [isControlled, onValueChange, onParsedChange, ...deps],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;
      const isStepArrow =
        step > 0 && (event.key === "ArrowUp" || event.key === "ArrowDown");
      if (!config.isKey(event.key) && !isStepArrow) return;
      event.preventDefault();
      commit(
        config.key({
          value: event.currentTarget.value,
          caret: event.currentTarget.selectionStart ?? 0,
          selectionEnd: event.currentTarget.selectionEnd ?? undefined,
          key: event.key,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        }),
      );
    },
    [commit, step, ...deps],
  );

  const onPaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      commit(
        config.paste({
          value: event.currentTarget.value,
          caret: event.currentTarget.selectionStart ?? 0,
          selectionEnd: event.currentTarget.selectionEnd ?? undefined,
          pasted: event.clipboardData.getData("text"),
        }),
      );
    },
    [commit, ...deps],
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
      inputMode: "numeric" as const,
      autoComplete: "off" as const,
      spellCheck: false as const,
    },
    hiddenInputProps: { type: "hidden" as const, value: isoValue },
  };
}

export function useDateFieldMask(
  options: UseDateFieldMaskOptions = {},
): UseDateFieldMaskReturn {
  const { separator, mode, min, max, step = 0 } = options;
  return useMask<Date, DateStatus>({
    ...options,
    step,
    deps: [separator, mode, min, max],
    isKey: isDateMaskKey,
    key: (edit) => apply({ ...edit, separator, mode, step }),
    paste: (edit) => applyPaste({ ...edit, separator, mode }),
    parse: (value) => parseDate(value, { mode, min, max }),
    status: (value) => dateStatus(value, { mode }),
    iso,
  });
}

export function useTimeFieldMask(
  options: UseTimeFieldMaskOptions = {},
): UseTimeFieldMaskReturn {
  const { separator, precision = "minute", min, max, step = 0 } = options;
  return useMask<TimeValue, TimeStatus>({
    ...options,
    step,
    deps: [separator, precision, min, max],
    isKey: isTimeMaskKey,
    key: (edit) => applyTime({ ...edit, separator, precision, step }),
    paste: (edit) => applyTimePaste({ ...edit, separator, precision }),
    parse: (value) => parseTime(value, { precision, min, max }),
    status: (value) => timeStatus(value, { precision }),
    iso: (time) => isoTime(time, precision),
  });
}

export function useDateTimeFieldMask(
  options: UseDateTimeFieldMaskOptions = {},
): UseDateTimeFieldMaskReturn {
  const {
    separator,
    timeSeparator,
    joiner,
    mode,
    precision = "minute",
    min,
    max,
    step = 0,
  } = options;
  const field = { separator, timeSeparator, joiner, mode, precision };
  const parseOpts = { joiner, mode, precision, min, max };
  return useMask<Date, DateTimeStatus>({
    ...options,
    step,
    deps: [separator, timeSeparator, joiner, mode, precision, min, max],
    isKey: isDateTimeMaskKey,
    key: (edit) => applyDateTime({ ...edit, ...field, step }),
    paste: (edit) => applyDateTimePaste({ ...edit, ...field }),
    parse: (value) => parseDateTime(value, parseOpts),
    status: (value) => dateTimeStatus(value, { joiner, mode, precision }),
    iso: (date) => isoDateTime(date, precision),
  });
}
