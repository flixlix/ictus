export type TimeFieldPrecision = "minute" | "second";

export type TimeValue = {
  hours: number;
  minutes: number;
  seconds: number;
};

export type ApplyTimeInput = {
  value: string;
  caret: number;
  selectionEnd?: number;
  key: string;
  separator?: string;
  precision?: TimeFieldPrecision;
  step?: number;
};

export type ApplyTimePasteInput = {
  value: string;
  caret: number;
  selectionEnd?: number;
  pasted: string;
  separator?: string;
  precision?: TimeFieldPrecision;
};

export type ApplyTimeResult = {
  value: string;
  caret: number;
};

export type ParseTimeOptions = {
  precision?: TimeFieldPrecision;
  min?: TimeValue;
  max?: TimeValue;
};

export type FormatTimeOptions = {
  precision?: TimeFieldPrecision;
};

const SEPARATOR_KEYS = new Set([".", ":", "-"]);

type GroupKind = "hour" | "minute" | "second";

type GroupSpec = {
  width: 2;
  max: number;
  overflowFirst: ReadonlySet<string>;
  kind: GroupKind;
};

const HOUR: GroupSpec = {
  width: 2,
  max: 23,
  overflowFirst: new Set(["3", "4", "5", "6", "7", "8", "9"]),
  kind: "hour",
};

const MINUTE: GroupSpec = {
  width: 2,
  max: 59,
  overflowFirst: new Set(["6", "7", "8", "9"]),
  kind: "minute",
};

const SECOND: GroupSpec = {
  width: 2,
  max: 59,
  overflowFirst: new Set(["6", "7", "8", "9"]),
  kind: "second",
};

function resolvePrecision(precision: TimeFieldPrecision | undefined): TimeFieldPrecision {
  return precision ?? "minute";
}

function groupsForPrecision(precision: TimeFieldPrecision): GroupSpec[] {
  switch (precision) {
    case "minute":
      return [HOUR, MINUTE];
    case "second":
      return [HOUR, MINUTE, SECOND];
    default: {
      const _exhaustive: never = precision;
      return _exhaustive;
    }
  }
}

function lastGroupIndex(groups: GroupSpec[]): number {
  return groups.length - 1;
}

function isDigit(key: string): boolean {
  return key.length === 1 && key >= "0" && key <= "9";
}

export function isTimeMaskKey(key: string): boolean {
  return isDigit(key) || SEPARATOR_KEYS.has(key) || key === "Backspace" || key === "Delete";
}

type Parsed = {
  digits: string[];
  seps: boolean[];
  groupIndex: number;
  offset: number;
};

function parseState(value: string, caret: number, sep: string, groups: GroupSpec[]): Parsed {
  const digits = groups.map(() => "");
  const seps = groups.slice(0, -1).map(() => false);
  let i = 0;
  let active = 0;
  let assigned = false;
  let offset = 0;
  const last = lastGroupIndex(groups);

  for (let g = 0; g < groups.length; g += 1) {
    const start = i;
    const spec = groups[g];
    if (spec === undefined) continue;
    while (i < value.length && value[i] !== sep && digits[g]!.length < spec.width) {
      const ch = value[i];
      if (ch === undefined) break;
      digits[g] += ch;
      i += 1;
    }

    if (caret >= start && caret <= i) {
      if (!assigned) {
        active = g;
        assigned = true;
      }
      if (active === g) offset = caret - start;
    }

    if (g < last && i < value.length && value[i] === sep) {
      seps[g] = true;
      if (caret > i) {
        active = g + 1;
        assigned = true;
        offset = 0;
      }
      i += 1;
    }
  }

  return { digits, seps, groupIndex: active, offset };
}

function assemble(digits: string[], seps: boolean[], sep: string): string {
  let out = digits[0] ?? "";
  for (let g = 0; g < seps.length; g += 1) {
    if (seps[g]) out += sep;
    out += digits[g + 1] ?? "";
  }
  return out;
}

function caretAt(
  digits: string[],
  seps: boolean[],
  sep: string,
  groupIndex: number,
  afterTrailingSep: boolean,
): number {
  let pos = 0;
  for (let g = 0; g < groupIndex; g += 1) {
    pos += (digits[g] ?? "").length;
    if (seps[g]) pos += sep.length;
  }
  pos += (digits[groupIndex] ?? "").length;
  if (afterTrailingSep && seps[groupIndex]) pos += sep.length;
  return pos;
}

function insertDigit(
  value: string,
  caret: number,
  digit: string,
  sep: string,
  groups: GroupSpec[],
): ApplyTimeResult {
  const state = parseState(value, caret, sep, groups);
  const digits = state.digits;
  const seps = state.seps;
  let g: number | undefined = state.groupIndex;
  let offset = state.offset;
  const last = lastGroupIndex(groups);

  while (g !== undefined && (digits[g] ?? "").length >= groups[g]!.width) {
    if (g === last) return { value, caret };
    seps[g] = true;
    g = g + 1;
    if (g !== undefined) offset = (digits[g] ?? "").length;
  }

  if (g === undefined) return { value, caret };

  const spec = groups[g]!;
  const current = digits[g] ?? "";
  const at = Math.min(Math.max(offset, 0), current.length);

  if (current.length === 0 && spec.overflowFirst.has(digit)) {
    digits[g] = `0${digit}`;
    if (g < last) seps[g] = true;
    return {
      value: assemble(digits, seps, sep),
      caret: caretAt(digits, seps, sep, g, g < last),
    };
  }

  const next = current.slice(0, at) + digit + current.slice(at);
  if (Number(next) > spec.max) {
    return { value, caret };
  }

  digits[g] = next;
  const complete = digits[g]!.length >= spec.width && g < last;
  if (complete) seps[g] = true;

  return {
    value: assemble(digits, seps, sep),
    caret: caretAt(digits, seps, sep, g, complete),
  };
}

function commitSeparator(
  value: string,
  caret: number,
  sep: string,
  groups: GroupSpec[],
): ApplyTimeResult {
  const { digits, seps, groupIndex } = parseState(value, caret, sep, groups);
  const last = lastGroupIndex(groups);
  if ((digits[groupIndex] ?? "").length === 0 || groupIndex === last) {
    return { value, caret };
  }
  digits[groupIndex] = digits[groupIndex]!.padStart(groups[groupIndex]!.width, "0");
  seps[groupIndex] = true;
  return {
    value: assemble(digits, seps, sep),
    caret: caretAt(digits, seps, sep, groupIndex, true),
  };
}

function clampIndex(value: string, index: number): number {
  return Math.min(Math.max(index, 0), value.length);
}

function nowSeed(kind: GroupKind): number {
  const now = new Date();
  switch (kind) {
    case "hour":
      return now.getHours();
    case "minute":
      return now.getMinutes();
    case "second":
      return now.getSeconds();
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function wrapUnit(n: number, maxInclusive: number): number {
  const size = maxInclusive + 1;
  return ((n % size) + size) % size;
}

function stepGroup(
  value: string,
  caret: number,
  delta: number,
  sep: string,
  groups: GroupSpec[],
): ApplyTimeResult {
  const { digits, seps, groupIndex: g, offset } = parseState(value, caret, sep, groups);
  const beforeLen = (digits[g] ?? "").length;
  const kind = groups[g]!.kind;
  let n = beforeLen === 0 ? nowSeed(kind) : Number(digits[g]);
  n += delta;
  n = wrapUnit(n, groups[g]!.max);
  digits[g] = String(n).padStart(groups[g]!.width, "0");
  for (let i = 0; i < seps.length; i += 1) {
    if (digits.slice(i + 1).some((d) => d.length > 0) || seps.slice(i + 1).some(Boolean)) {
      seps[i] = true;
    }
  }
  const afterLen = digits[g]!.length;
  const groupEnd = caretAt(digits, seps, sep, g, false);
  const nextCaret =
    beforeLen === 0 ? groupEnd : groupEnd - afterLen + Math.min(offset, afterLen);
  return {
    value: assemble(digits, seps, sep),
    caret: nextCaret,
  };
}

export function applyTime(input: ApplyTimeInput): ApplyTimeResult {
  let { value, caret, key } = input;
  const separator = input.separator || ":";
  const precision = resolvePrecision(input.precision);
  const groups = groupsForPrecision(precision);
  const step = input.step ?? 0;
  const from = clampIndex(value, caret);
  const to = clampIndex(value, input.selectionEnd ?? caret);
  const start = Math.min(from, to);
  const end = Math.max(from, to);

  if (step > 0 && (key === "ArrowUp" || key === "ArrowDown")) {
    const delta = key === "ArrowUp" ? step : -step;
    return stepGroup(value, start, delta, separator, groups);
  }

  if (end > start) {
    value = value.slice(0, start) + value.slice(end);
    caret = start;
    if (key === "Backspace" || key === "Delete") {
      return { value, caret };
    }
  } else {
    caret = start;
  }

  if (key === "Backspace") {
    if (caret === 0) return { value, caret };
    return {
      value: value.slice(0, caret - 1) + value.slice(caret),
      caret: caret - 1,
    };
  }

  if (key === "Delete") {
    if (caret >= value.length) return { value, caret };
    return {
      value: value.slice(0, caret) + value.slice(caret + 1),
      caret,
    };
  }

  if (SEPARATOR_KEYS.has(key)) {
    return commitSeparator(value, caret, separator, groups);
  }

  if (isDigit(key)) {
    return insertDigit(value, caret, key, separator, groups);
  }

  return { value, caret };
}

function normalizePastedKeys(pasted: string): string[] {
  const text = pasted.trim();
  if (!text) return [];
  const keys: string[] = [];
  for (const ch of text) {
    if (isDigit(ch) || SEPARATOR_KEYS.has(ch)) keys.push(ch);
  }
  return keys;
}

export function applyTimePaste(input: ApplyTimePasteInput): ApplyTimeResult {
  const separator = input.separator || ":";
  const precision = resolvePrecision(input.precision);
  const keys = normalizePastedKeys(input.pasted);
  if (keys.length === 0) {
    return {
      value: input.value,
      caret: clampIndex(input.value, input.caret),
    };
  }

  let value = input.value;
  let caret = input.caret;
  let selectionEnd = input.selectionEnd;

  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (key === undefined) continue;
    const next = applyTime({
      value,
      caret,
      selectionEnd: i === 0 ? selectionEnd : caret,
      key,
      separator,
      precision,
    });
    value = next.value;
    caret = next.caret;
    selectionEnd = caret;
  }

  return { value, caret };
}

const PARSE_MINUTE = /^(\d{2})[.:-](\d{2})$/;
const PARSE_SECOND = /^(\d{2})[.:-](\d{2})[.:-](\d{2})$/;

function totalSeconds(time: TimeValue): number {
  return time.hours * 3600 + time.minutes * 60 + time.seconds;
}

function clockTime(
  hours: number,
  minutes: number,
  seconds: number,
): TimeValue | undefined {
  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return undefined;
  }
  return { hours, minutes, seconds };
}

export function parseTime(
  masked: string,
  options: ParseTimeOptions = {},
): TimeValue | undefined {
  const precision = resolvePrecision(options.precision);
  let time: TimeValue | undefined;

  switch (precision) {
    case "minute": {
      const match = PARSE_MINUTE.exec(masked);
      if (match?.[1] && match[2]) {
        time = clockTime(Number(match[1]), Number(match[2]), 0);
      }
      break;
    }
    case "second": {
      const match = PARSE_SECOND.exec(masked);
      if (match?.[1] && match[2] && match[3]) {
        time = clockTime(Number(match[1]), Number(match[2]), Number(match[3]));
      }
      break;
    }
    default: {
      const _exhaustive: never = precision;
      return _exhaustive;
    }
  }

  if (!time) return undefined;

  const { min, max } = options;
  const seconds = totalSeconds(time);
  if (min !== undefined && seconds < totalSeconds(min)) return undefined;
  if (max !== undefined && seconds > totalSeconds(max)) return undefined;
  return time;
}

export type TimeStatus = "empty" | "incomplete" | "invalid" | "valid";

function looksComplete(masked: string, precision: TimeFieldPrecision): boolean {
  switch (precision) {
    case "minute":
      return PARSE_MINUTE.test(masked);
    case "second":
      return PARSE_SECOND.test(masked);
    default: {
      const _exhaustive: never = precision;
      return _exhaustive;
    }
  }
}

export function timeStatus(
  masked: string,
  options: ParseTimeOptions = {},
): TimeStatus {
  if (masked === "") return "empty";
  const precision = resolvePrecision(options.precision);
  const time = parseTime(masked, options);
  if (time) return "valid";
  if (looksComplete(masked, precision)) return "invalid";
  return "incomplete";
}

function partsFrom(dateOrTime: Date | TimeValue): TimeValue {
  if (dateOrTime instanceof Date) {
    return {
      hours: dateOrTime.getHours(),
      minutes: dateOrTime.getMinutes(),
      seconds: dateOrTime.getSeconds(),
    };
  }
  return dateOrTime;
}

export function formatTime(
  dateOrTime: Date | TimeValue,
  separatorOrOptions: string | FormatTimeOptions = ":",
  maybeOptions?: FormatTimeOptions,
): string {
  const separator =
    typeof separatorOrOptions === "string" ? separatorOrOptions : ":";
  const options =
    typeof separatorOrOptions === "object" && separatorOrOptions !== null
      ? separatorOrOptions
      : (maybeOptions ?? {});
  const precision = resolvePrecision(options.precision);
  const { hours, minutes, seconds } = partsFrom(dateOrTime);
  const h = String(hours).padStart(2, "0");
  const m = String(minutes).padStart(2, "0");
  switch (precision) {
    case "minute":
      return `${h}${separator}${m}`;
    case "second": {
      const s = String(seconds).padStart(2, "0");
      return `${h}${separator}${m}${separator}${s}`;
    }
    default: {
      const _exhaustive: never = precision;
      return _exhaustive;
    }
  }
}

export function isoTime(time: TimeValue | undefined, precision: TimeFieldPrecision = "minute"): string {
  if (!time) return "";
  return formatTime(time, ":", { precision });
}

export { bindTimeMask } from "./bind-time.js";
export type { BindTimeMaskOptions } from "./bind-time.js";
