import { apply, applyPaste, parseDate, formatDate, isDateMaskKey } from "./index.js";
import type { DateFieldMode, YyExpand } from "./index.js";
import {
  applyTime,
  applyTimePaste,
  formatTime,
  isTimeMaskKey,
  parseTime,
} from "./time.js";
import type { TimeFieldPrecision } from "./time.js";

export type DateTimeFieldOptions = {
  separator?: string;
  timeSeparator?: string;
  joiner?: string;
  mode?: DateFieldMode;
  precision?: TimeFieldPrecision;
};

export type ApplyDateTimeInput = DateTimeFieldOptions & {
  value: string;
  caret: number;
  selectionEnd?: number;
  key: string;
  step?: number;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

export type ApplyDateTimePasteInput = DateTimeFieldOptions & {
  value: string;
  caret: number;
  selectionEnd?: number;
  pasted: string;
};

export type ApplyDateTimeResult = {
  value: string;
  caret: number;
};

export type ParseDateTimeOptions = {
  joiner?: string;
  mode?: DateFieldMode;
  precision?: TimeFieldPrecision;
  yyExpand?: YyExpand;
  min?: Date;
  max?: Date;
};

export type FormatDateTimeOptions = DateTimeFieldOptions;

export type DateTimeStatus = "empty" | "incomplete" | "invalid" | "valid";

type Resolved = {
  separator: string;
  timeSeparator: string;
  joiner: string;
  mode: DateFieldMode | undefined;
  precision: TimeFieldPrecision | undefined;
};

type Parts = {
  date: string;
  time: string;
  joined: boolean;
  timeStart: number;
};

function resolve(options: DateTimeFieldOptions): Resolved {
  return {
    separator: options.separator || ".",
    timeSeparator: options.timeSeparator || ":",
    joiner: options.joiner || " ",
    mode: options.mode,
    precision: options.precision,
  };
}

export function isDateTimeMaskKey(key: string): boolean {
  return key === " " || isDateMaskKey(key) || isTimeMaskKey(key);
}

function split(value: string, joiner: string): Parts {
  const at = value.indexOf(joiner);
  if (at < 0) {
    return { date: value, time: "", joined: false, timeStart: value.length };
  }
  return {
    date: value.slice(0, at),
    time: value.slice(at + joiner.length),
    joined: true,
    timeStart: at + joiner.length,
  };
}

function join(date: string, time: string, joined: boolean, joiner: string): string {
  return date + (joined || time ? joiner : "") + time;
}

function digitCount(text: string): number {
  let n = 0;
  for (const ch of text) if (ch >= "0" && ch <= "9") n += 1;
  return n;
}

function dateComplete(date: string): boolean {
  return digitCount(date) >= 8;
}

function onDate(
  r: Resolved,
  date: string,
  caret: number,
  key: string,
  extra: Partial<ApplyDateTimeInput>,
) {
  return apply({
    value: date,
    caret,
    key,
    separator: r.separator,
    mode: r.mode,
    step: extra.step,
    ctrlKey: extra.ctrlKey,
    metaKey: extra.metaKey,
    shiftKey: extra.shiftKey,
  });
}

function onTime(
  r: Resolved,
  time: string,
  caret: number,
  key: string,
  extra: Partial<ApplyDateTimeInput>,
) {
  return applyTime({
    value: time,
    caret,
    key,
    separator: r.timeSeparator,
    precision: r.precision,
    step: extra.step,
    ctrlKey: extra.ctrlKey,
    metaKey: extra.metaKey,
    shiftKey: extra.shiftKey,
  });
}

function withDate(
  r: Resolved,
  p: Parts,
  next: ApplyDateTimeResult,
  joined: boolean = p.joined,
): ApplyDateTimeResult {
  return { value: join(next.value, p.time, joined, r.joiner), caret: next.caret };
}

function withTime(r: Resolved, p: Parts, next: ApplyDateTimeResult): ApplyDateTimeResult {
  return {
    value: join(p.date, next.value, true, r.joiner),
    caret: p.date.length + r.joiner.length + next.caret,
  };
}

function removeRange(
  value: string,
  start: number,
  end: number,
  joiner: string,
): ApplyDateTimeResult {
  const p = split(value, joiner);
  const dateLen = p.date.length;
  const date = p.date.slice(0, Math.min(start, dateLen)) + p.date.slice(Math.min(end, dateLen));
  if (!p.joined) return { value: date, caret: start };
  const t0 = Math.max(start - p.timeStart, 0);
  const t1 = Math.max(end - p.timeStart, 0);
  const time = p.time.slice(0, t0) + p.time.slice(t1);
  const joinerHit = start < p.timeStart && end > dateLen;
  const joined = time.length > 0 || !joinerHit;
  const out = join(date, time, joined, joiner);
  return { value: out, caret: Math.min(start, out.length) };
}

export function applyDateTime(input: ApplyDateTimeInput): ApplyDateTimeResult {
  const r = resolve(input);
  const { key } = input;
  const step = input.step ?? 0;
  const from = Math.min(Math.max(input.caret, 0), input.value.length);
  const to = Math.min(Math.max(input.selectionEnd ?? input.caret, 0), input.value.length);
  let start = Math.min(from, to);
  const end = Math.max(from, to);
  const isDelete = key === "Backspace" || key === "Delete";
  const isStep = step > 0 && (key === "ArrowUp" || key === "ArrowDown");
  let value = input.value;

  if (isDelete && input.shiftKey) return { value: "", caret: 0 };

  if (end > start && !isStep) {
    const removed = removeRange(value, start, end, r.joiner);
    if (isDelete) return removed;
    value = removed.value;
    start = removed.caret;
  }

  const p = split(value, r.joiner);
  const caret = start;
  const inTime = p.joined && caret >= p.timeStart;
  const ctrlLike = Boolean(input.ctrlKey || input.metaKey);

  if (inTime) {
    const tCaret = caret - p.timeStart;
    if (key === "Backspace" && tCaret === 0) {
      if (ctrlLike) {
        return withDate(r, p, onDate(r, p.date, p.date.length, key, input), p.time.length > 0);
      }
      if (p.time.length === 0) return { value: p.date, caret: p.date.length };
      return withDate(r, p, onDate(r, p.date, p.date.length, key, input));
    }
    return withTime(r, p, onTime(r, p.time, tCaret, key, input));
  }

  const dCaret = Math.min(caret, p.date.length);
  const atDateEnd = dCaret === p.date.length;

  if (key === "Delete" && atDateEnd && p.joined) {
    if (p.time.length === 0) return { value: p.date, caret: dCaret };
    const next = onTime(r, p.time, 0, key, input);
    return { value: join(p.date, next.value, true, r.joiner), caret: dCaret };
  }

  if (key === " " || key === r.joiner) {
    if (!atDateEnd || !dateComplete(p.date)) return { value, caret };
    return { value: join(p.date, p.time, true, r.joiner), caret: p.date.length + r.joiner.length };
  }

  if (isTimeMaskKey(key) && !isDateMaskKey(key)) return { value, caret };

  const isDigit = key.length === 1 && key >= "0" && key <= "9";
  const next = onDate(r, p.date, dCaret, key, input);

  if (isDigit && next.value === p.date && atDateEnd && dateComplete(p.date)) {
    const timed = onTime(r, p.time, 0, key, input);
    if (p.joined && timed.value === p.time) return { value, caret };
    return withTime(r, p, timed);
  }

  if (
    isDigit &&
    !p.joined &&
    next.caret === next.value.length &&
    dateComplete(next.value)
  ) {
    return {
      value: next.value + r.joiner,
      caret: next.value.length + r.joiner.length,
    };
  }

  return withDate(r, p, next);
}

const TIME_SPLIT_RE = /[\sTt]+/;

export function applyDateTimePaste(input: ApplyDateTimePasteInput): ApplyDateTimeResult {
  const r = resolve(input);
  let value = input.value;
  let caret = Math.min(Math.max(input.caret, 0), value.length);
  const text = input.pasted.trim();
  const at = text.search(TIME_SPLIT_RE);
  const p = split(value, r.joiner);
  const caretInTime = p.joined && caret >= p.timeStart;
  const timeOnly = at < 0 && (caretInTime || text.includes(":"));

  const dateKeys = timeOnly
    ? ""
    : applyPaste({ value: "", caret: 0, pasted: at < 0 ? text : text.slice(0, at), mode: r.mode })
        .value;
  const timeText = timeOnly ? text : at < 0 ? "" : text.slice(at).replace(TIME_SPLIT_RE, "");
  const timeKeys = timeText
    ? applyTimePaste({ value: "", caret: 0, pasted: timeText, precision: r.precision }).value
    : "";
  const keys = [...dateKeys, ...(dateKeys && timeKeys ? " " : ""), ...timeKeys];
  if (keys.length === 0) return { value, caret };

  let selectionEnd = input.selectionEnd;
  if (timeOnly && !caretInTime) {
    if (!dateComplete(p.date)) return { value, caret };
    value = join(p.date, p.time, true, r.joiner);
    caret = p.date.length + r.joiner.length;
    selectionEnd = undefined;
  }

  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]!;
    const next = applyDateTime({
      ...r,
      value,
      caret,
      selectionEnd: i === 0 ? selectionEnd : caret,
      key,
    });
    if (key === " " && next.value === value && next.caret === caret) {
      const q = split(value, r.joiner);
      if (!q.joined || caret < q.timeStart) break;
    }
    value = next.value;
    caret = next.caret;
  }
  return { value, caret };
}

export function parseDateTime(
  masked: string,
  options: ParseDateTimeOptions = {},
): Date | undefined {
  const p = split(masked, options.joiner || " ");
  if (!p.joined) return undefined;
  const date = parseDate(p.date, { mode: options.mode, yyExpand: options.yyExpand });
  const time = parseTime(p.time, { precision: options.precision });
  if (!date || !time) return undefined;
  const result = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.hours,
    time.minutes,
    time.seconds,
  );
  const stamp = result.getTime();
  if (options.min !== undefined && stamp < options.min.getTime()) return undefined;
  if (options.max !== undefined && stamp > options.max.getTime()) return undefined;
  return result;
}

export function dateTimeStatus(
  masked: string,
  options: ParseDateTimeOptions = {},
): DateTimeStatus {
  if (masked === "") return "empty";
  if (parseDateTime(masked, options)) return "valid";
  const p = split(masked, options.joiner || " ");
  const timeDigits = options.precision === "second" ? 6 : 4;
  const complete =
    p.joined &&
    dateComplete(p.date) &&
    digitCount(p.time) >= timeDigits;
  return complete ? "invalid" : "incomplete";
}

export function formatDateTime(
  date: Date,
  options: FormatDateTimeOptions = {},
): string {
  const r = resolve(options);
  return (
    formatDate(date, r.separator, { mode: r.mode }) +
    r.joiner +
    formatTime(date, r.timeSeparator, { precision: r.precision })
  );
}

export function isoDateTime(
  date: Date | undefined,
  precision: TimeFieldPrecision = "minute",
): string {
  if (!date) return "";
  return `${formatDate(date, "-", { mode: "ymd" })}T${formatTime(date, ":", { precision })}`;
}

export { bindDateTimeMask } from "./bind-datetime.js";
export type { BindDateTimeMaskOptions } from "./bind-datetime.js";
