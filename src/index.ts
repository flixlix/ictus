export type DateFieldMode = "dmy" | "mdy" | "ymd";

export type ApplyInput = {
  value: string;
  caret: number;
  selectionEnd?: number;
  key: string;
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
};

type Groups = readonly [GroupSpec, GroupSpec, GroupSpec];

const DAY: GroupSpec = {
  width: 2,
  max: 31,
  overflowFirst: new Set(["4", "5", "6", "7", "8", "9"]),
};

const MONTH: GroupSpec = {
  width: 2,
  max: 12,
  overflowFirst: new Set(["2", "3", "4", "5", "6", "7", "8", "9"]),
};

const YEAR: GroupSpec = {
  width: 4,
  max: null,
  overflowFirst: new Set(),
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

export function apply(input: ApplyInput): ApplyResult {
  let { value, caret, key } = input;
  const separator = input.separator || ".";
  const mode = resolveMode(input.mode);
  const groups = groupsForMode(mode);
  const from = clampIndex(value, caret);
  const to = clampIndex(value, input.selectionEnd ?? caret);
  const start = Math.min(from, to);
  const end = Math.max(from, to);

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

function calendarDate(year: number, month: number, day: number): Date | undefined {
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

const PARSE_DMY_MDY = /^(\d{2})[./-](\d{2})[./-](\d{4})$/;
const PARSE_YMD = /^(\d{4})[./-](\d{2})[./-](\d{2})$/;

export function parseDate(masked: string, mode: DateFieldMode = "dmy"): Date | undefined {
  switch (mode) {
    case "dmy": {
      const match = PARSE_DMY_MDY.exec(masked);
      if (!match?.[1] || !match[2] || !match[3]) return undefined;
      return calendarDate(Number(match[3]), Number(match[2]), Number(match[1]));
    }
    case "mdy": {
      const match = PARSE_DMY_MDY.exec(masked);
      if (!match?.[1] || !match[2] || !match[3]) return undefined;
      return calendarDate(Number(match[3]), Number(match[1]), Number(match[2]));
    }
    case "ymd": {
      const match = PARSE_YMD.exec(masked);
      if (!match?.[1] || !match[2] || !match[3]) return undefined;
      return calendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
    }
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function formatDate(
  date: Date,
  separator = ".",
  mode: DateFieldMode = "dmy",
): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).padStart(4, "0");
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
