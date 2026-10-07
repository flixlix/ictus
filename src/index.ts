export type DateFieldMode = "dmy" | "mdy" | "ymd";

export type ApplyInput = {
  value: string;
  caret: number;
  selectionEnd?: number;
  key: string;
  separator?: string;
  mode?: DateFieldMode;
  step?: number;
};

export type ApplyPasteInput = {
  value: string;
  caret: number;
  selectionEnd?: number;
  pasted: string;
  separator?: string;
  mode?: DateFieldMode;
};

export type ApplyResult = {
  value: string;
  caret: number;
};

const SEPARATOR_KEYS = new Set([".", "/", "-"]);

type GroupIndex = 0 | 1 | 2;

type GroupSpec = {
  width: number;
  max: number | null;
  overflowFirst: ReadonlySet<string>;
  kind: "day" | "month" | "year";
};

type Groups = readonly [GroupSpec, GroupSpec, GroupSpec];

const DAY: GroupSpec = {
  width: 2,
  max: 31,
  overflowFirst: new Set(["4", "5", "6", "7", "8", "9"]),
  kind: "day",
};

const MONTH: GroupSpec = {
  width: 2,
  max: 12,
  overflowFirst: new Set(["2", "3", "4", "5", "6", "7", "8", "9"]),
  kind: "month",
};

const YEAR: GroupSpec = {
  width: 4,
  max: null,
  overflowFirst: new Set(),
  kind: "year",
};

function groupsForMode(mode: DateFieldMode): Groups {
  switch (mode) {
    case "dmy":
      return [DAY, MONTH, YEAR];
    case "mdy":
      return [MONTH, DAY, YEAR];
    case "ymd":
      return [YEAR, MONTH, DAY];
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function resolveMode(mode: DateFieldMode | undefined): DateFieldMode {
  return mode ?? "dmy";
}

function isDigit(key: string): boolean {
  return key.length === 1 && key >= "0" && key <= "9";
}

export function isDateMaskKey(key: string): boolean {
  return isDigit(key) || SEPARATOR_KEYS.has(key) || key === "Backspace" || key === "Delete";
}

type Parsed = {
  digits: [string, string, string];
  seps: [boolean, boolean];
  groupIndex: GroupIndex;
  offset: number;
};

function parseState(value: string, caret: number, sep: string, groups: Groups): Parsed {
  const digits: [string, string, string] = ["", "", ""];
  const seps: [boolean, boolean] = [false, false];
  let i = 0;
  let active: GroupIndex = 0;
  let assigned = false;
  let offset = 0;

  for (const g of [0, 1, 2] as const) {
    const start = i;
    const spec = groups[g];
    while (i < value.length && value[i] !== sep && digits[g].length < spec.width) {
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

    if (g < 2 && i < value.length && value[i] === sep) {
      if (g === 0) seps[0] = true;
      else seps[1] = true;
      if (caret > i) {
        active = (g + 1) as GroupIndex;
        assigned = true;
        offset = 0;
      }
      i += 1;
    }
  }

  return { digits, seps, groupIndex: active, offset };
}

function assemble(
  digits: [string, string, string],
  seps: [boolean, boolean],
  sep: string,
): string {
  let out = digits[0];
  if (seps[0]) out += sep;
  out += digits[1];
  if (seps[1]) out += sep;
  out += digits[2];
  return out;
}

function caretAt(
  digits: [string, string, string],
  seps: [boolean, boolean],
  sep: string,
  groupIndex: GroupIndex,
  afterTrailingSep: boolean,
): number {
  let pos = 0;
  if (groupIndex >= 1) {
    pos += digits[0].length;
    if (seps[0]) pos += sep.length;
  }
  if (groupIndex >= 2) {
    pos += digits[1].length;
    if (seps[1]) pos += sep.length;
  }
  pos += digits[groupIndex].length;
  if (afterTrailingSep && groupIndex === 0 && seps[0]) pos += sep.length;
  if (afterTrailingSep && groupIndex === 1 && seps[1]) pos += sep.length;
  return pos;
}

function nextGroup(index: GroupIndex): GroupIndex | undefined {
  if (index === 0) return 1;
  if (index === 1) return 2;
  return undefined;
}

function setSep(seps: [boolean, boolean], index: GroupIndex): void {
  if (index === 0) seps[0] = true;
  if (index === 1) seps[1] = true;
}

function insertDigit(
  value: string,
  caret: number,
  digit: string,
  sep: string,
  groups: Groups,
): ApplyResult {
  const state = parseState(value, caret, sep, groups);
  const digits = state.digits;
  const seps = state.seps;
  let g: GroupIndex | undefined = state.groupIndex;
  let offset = state.offset;

  while (g !== undefined && digits[g].length >= groups[g].width) {
    if (g === 2) return { value, caret };
    setSep(seps, g);
    g = nextGroup(g);
    if (g !== undefined) offset = digits[g].length;
  }

  if (g === undefined) return { value, caret };

  const spec = groups[g];
  const current = digits[g];
  const at = Math.min(Math.max(offset, 0), current.length);

  if (current.length === 0 && spec.overflowFirst.has(digit)) {
    digits[g] = `0${digit}`;
    if (g < 2) setSep(seps, g);
    return {
      value: assemble(digits, seps, sep),
      caret: caretAt(digits, seps, sep, g, g < 2),
    };
  }

  const next = current.slice(0, at) + digit + current.slice(at);
  if (spec.max !== null && Number(next) > spec.max) {
    return { value, caret };
  }

  digits[g] = next;
  const complete = digits[g].length >= spec.width && g < 2;
  if (complete) setSep(seps, g);

  return {
    value: assemble(digits, seps, sep),
    caret: caretAt(digits, seps, sep, g, complete),
  };
}

function commitSeparator(
  value: string,
  caret: number,
  sep: string,
  groups: Groups,
): ApplyResult {
  const { digits, seps, groupIndex } = parseState(value, caret, sep, groups);
  if (digits[groupIndex].length === 0 || groupIndex === 2) {
    return { value, caret };
  }
  digits[groupIndex] = digits[groupIndex].padStart(groups[groupIndex].width, "0");
  setSep(seps, groupIndex);
  return {
    value: assemble(digits, seps, sep),
    caret: caretAt(digits, seps, sep, groupIndex, true),
  };
}

function clampIndex(value: string, index: number): number {
  return Math.min(Math.max(index, 0), value.length);
}

function dropRejected(value: string, caret: number, sep: string): ApplyResult {
  let out = "";
  let nextCaret = 0;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === undefined) break;
    if (!isDigit(ch) && ch !== sep) continue;
    out += ch;
    if (i < caret) nextCaret += 1;
  }
  return { value: out, caret: nextCaret };
}

function todaySeed(kind: GroupSpec["kind"]): number {
  const now = new Date();
  switch (kind) {
    case "day":
      return now.getDate();
    case "month":
      return now.getMonth() + 1;
    case "year":
      return now.getFullYear();
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function stepGroup(
  value: string,
  caret: number,
  delta: number,
  sep: string,
  groups: Groups,
): ApplyResult {
  const { digits, seps, groupIndex: g, offset } = parseState(value, caret, sep, groups);
  const beforeLen = digits[g].length;
  const kind = groups[g].kind;
  let n = beforeLen === 0 ? todaySeed(kind) : Number(digits[g]);
  n += delta;
  if (kind === "year") {
    n = Math.min(9999, Math.max(1, n));
  } else {
    const max = kind === "day" ? 31 : 12;
    n = ((((n - 1) % max) + max) % max) + 1;
  }
  digits[g] = String(n).padStart(groups[g].width, "0");
  if (digits[1] || seps[1] || digits[2]) seps[0] = true;
  if (digits[2]) seps[1] = true;
  const afterLen = digits[g].length;
  const groupEnd = caretAt(digits, seps, sep, g, false);
  const nextCaret =
    beforeLen === 0
      ? groupEnd
      : groupEnd - afterLen + Math.min(offset, afterLen);
  return {
    value: assemble(digits, seps, sep),
    caret: nextCaret,
  };
}

export function apply(input: ApplyInput): ApplyResult {
  let { value, caret, key } = input;
  const separator = input.separator || ".";
  const mode = resolveMode(input.mode);
  const groups = groupsForMode(mode);
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
      return dropRejected(value, caret, separator);
    }
  } else {
    caret = start;
  }

  if (key === "Backspace") {
    if (caret === 0) return dropRejected(value, caret, separator);
    return dropRejected(
      value.slice(0, caret - 1) + value.slice(caret),
      caret - 1,
      separator,
    );
  }

  if (key === "Delete") {
    if (caret >= value.length) return dropRejected(value, caret, separator);
    return dropRejected(
      value.slice(0, caret) + value.slice(caret + 1),
      caret,
      separator,
    );
  }

  if (SEPARATOR_KEYS.has(key)) {
    return commitSeparator(value, caret, separator, groups);
  }

  if (isDigit(key)) {
    return insertDigit(value, caret, key, separator, groups);
  }

  return { value, caret };
}

const ISO_PASTE_RE = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/;

function keysForMode(mode: DateFieldMode, day: string, month: string, year: string): string[] {
  switch (mode) {
    case "dmy":
      return [...day, ".", ...month, ".", ...year];
    case "mdy":
      return [...month, ".", ...day, ".", ...year];
    case "ymd":
      return [...year, ".", ...month, ".", ...day];
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function normalizePastedKeys(pasted: string, mode: DateFieldMode): string[] {
  const text = pasted.trim();
  if (!text) return [];

  const iso = ISO_PASTE_RE.exec(text);
  if (iso?.[1] && iso[2] && iso[3]) {
    return keysForMode(mode, iso[3], iso[2], iso[1]);
  }

  const keys: string[] = [];
  for (const ch of text) {
    if (isDigit(ch) || SEPARATOR_KEYS.has(ch)) keys.push(ch);
  }
  return keys;
}

export function applyPaste(input: ApplyPasteInput): ApplyResult {
  const separator = input.separator || ".";
  const mode = resolveMode(input.mode);
  const keys = normalizePastedKeys(input.pasted, mode);
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
    const next = apply({
      value,
      caret,
      selectionEnd: i === 0 ? selectionEnd : caret,
      key,
      separator,
      mode,
    });
    value = next.value;
    caret = next.caret;
    selectionEnd = caret;
  }

  return { value, caret };
}

const PARSE_DMY_MDY = /^(\d{2})[./-](\d{2})[./-](\d{4})$/;
const PARSE_YMD = /^(\d{4})[./-](\d{2})[./-](\d{2})$/;
const PARSE_DMY_MDY_YY = /^(\d{2})[./-](\d{2})[./-](\d{2})$/;
const PARSE_YMD_YY = /^(\d{2})[./-](\d{2})[./-](\d{2})$/;

const DEFAULT_YY_PIVOT = 50;

export type YyExpand = {
  pivot?: number;
};

export type ParseDateOptions = {
  mode?: DateFieldMode;
  yyExpand?: YyExpand;
  min?: Date;
  max?: Date;
};

export type FormatDateOptions = {
  mode?: DateFieldMode;
  yyExpand?: YyExpand;
};

export function expandTwoDigitYear(
  yy: number,
  pivot: number = DEFAULT_YY_PIVOT,
): number {
  return yy < pivot ? 2000 + yy : 1900 + yy;
}

function localDayTime(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function calendarDate(
  day: number,
  month: number,
  year: number,
): Date | undefined {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

function parseModeParts(
  masked: string,
  mode: DateFieldMode,
  yyExpand: YyExpand | undefined,
): Date | undefined {
  switch (mode) {
    case "dmy": {
      const match4 = PARSE_DMY_MDY.exec(masked);
      if (match4?.[1] && match4[2] && match4[3]) {
        return calendarDate(Number(match4[1]), Number(match4[2]), Number(match4[3]));
      }
      if (yyExpand !== undefined) {
        const match2 = PARSE_DMY_MDY_YY.exec(masked);
        if (match2?.[1] && match2[2] && match2[3]) {
          const year = expandTwoDigitYear(
            Number(match2[3]),
            yyExpand.pivot ?? DEFAULT_YY_PIVOT,
          );
          return calendarDate(Number(match2[1]), Number(match2[2]), year);
        }
      }
      return undefined;
    }
    case "mdy": {
      const match4 = PARSE_DMY_MDY.exec(masked);
      if (match4?.[1] && match4[2] && match4[3]) {
        return calendarDate(Number(match4[2]), Number(match4[1]), Number(match4[3]));
      }
      if (yyExpand !== undefined) {
        const match2 = PARSE_DMY_MDY_YY.exec(masked);
        if (match2?.[1] && match2[2] && match2[3]) {
          const year = expandTwoDigitYear(
            Number(match2[3]),
            yyExpand.pivot ?? DEFAULT_YY_PIVOT,
          );
          return calendarDate(Number(match2[2]), Number(match2[1]), year);
        }
      }
      return undefined;
    }
    case "ymd": {
      const match4 = PARSE_YMD.exec(masked);
      if (match4?.[1] && match4[2] && match4[3]) {
        return calendarDate(Number(match4[3]), Number(match4[2]), Number(match4[1]));
      }
      if (yyExpand !== undefined) {
        const match2 = PARSE_YMD_YY.exec(masked);
        if (match2?.[1] && match2[2] && match2[3]) {
          const year = expandTwoDigitYear(
            Number(match2[1]),
            yyExpand.pivot ?? DEFAULT_YY_PIVOT,
          );
          return calendarDate(Number(match2[3]), Number(match2[2]), year);
        }
      }
      return undefined;
    }
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function normalizeParseArgs(
  modeOrOptions?: DateFieldMode | ParseDateOptions,
): ParseDateOptions {
  if (modeOrOptions === undefined) return {};
  if (typeof modeOrOptions === "string") return { mode: modeOrOptions };
  return modeOrOptions;
}

export function parseDate(
  masked: string,
  modeOrOptions: DateFieldMode | ParseDateOptions = {},
): Date | undefined {
  const options = normalizeParseArgs(modeOrOptions);
  const mode = resolveMode(options.mode);
  const date = parseModeParts(masked, mode, options.yyExpand);
  if (!date) return undefined;

  const { min, max } = options;
  const time = date.getTime();
  if (min !== undefined && time < localDayTime(min)) return undefined;
  if (max !== undefined && time > localDayTime(max)) return undefined;
  return date;
}

export type DateStatus = "empty" | "incomplete" | "invalid" | "valid";

function looksComplete(masked: string, mode: DateFieldMode): boolean {
  switch (mode) {
    case "dmy":
    case "mdy":
      return PARSE_DMY_MDY.test(masked);
    case "ymd":
      return PARSE_YMD.test(masked);
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function dateStatus(
  masked: string,
  modeOrOptions: DateFieldMode | ParseDateOptions = {},
): DateStatus {
  if (masked === "") return "empty";
  const options = normalizeParseArgs(modeOrOptions);
  const mode = resolveMode(options.mode);
  const date = parseDate(masked, options);
  if (date) return "valid";
  if (looksComplete(masked, mode)) return "invalid";
  return "incomplete";
}

function normalizeFormatArgs(
  separatorOrOptions?: string | FormatDateOptions,
  maybeOptions?: FormatDateOptions | DateFieldMode,
): { separator: string; options: FormatDateOptions } {
  if (typeof separatorOrOptions === "object" && separatorOrOptions !== null) {
    return { separator: ".", options: separatorOrOptions };
  }
  const separator =
    typeof separatorOrOptions === "string" ? separatorOrOptions : ".";
  if (typeof maybeOptions === "string") {
    return { separator, options: { mode: maybeOptions } };
  }
  return { separator, options: maybeOptions ?? {} };
}

export function formatDate(
  date: Date,
  separatorOrOptions: string | FormatDateOptions = ".",
  maybeOptions?: FormatDateOptions | DateFieldMode,
): string {
  const { separator, options } = normalizeFormatArgs(
    separatorOrOptions,
    maybeOptions,
  );
  const mode = resolveMode(options.mode);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const fullYear = date.getFullYear();

  if (options.yyExpand !== undefined && (mode === "dmy" || mode === "mdy")) {
    const pivot = options.yyExpand.pivot ?? DEFAULT_YY_PIVOT;
    const yy = ((fullYear % 100) + 100) % 100;
    if (expandTwoDigitYear(yy, pivot) === fullYear) {
      const yyText = String(yy).padStart(2, "0");
      if (mode === "dmy") {
        return `${day}${separator}${month}${separator}${yyText}`;
      }
      return `${month}${separator}${day}${separator}${yyText}`;
    }
  }

  const year = String(fullYear).padStart(4, "0");
  switch (mode) {
    case "dmy":
      return `${day}${separator}${month}${separator}${year}`;
    case "mdy":
      return `${month}${separator}${day}${separator}${year}`;
    case "ymd":
      return `${year}${separator}${month}${separator}${day}`;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export { bindDateMask } from "./bind.js";
export type { BindDateMaskOptions } from "./bind.js";
