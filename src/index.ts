export type ApplyInput = {
  value: string;
  caret: number;
  key: string;
  separator?: string;
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

const GROUPS: readonly [GroupSpec, GroupSpec, GroupSpec] = [
  { width: 2, max: 31, overflowFirst: new Set(["4", "5", "6", "7", "8", "9"]) },
  { width: 2, max: 12, overflowFirst: new Set(["2", "3", "4", "5", "6", "7", "8", "9"]) },
  { width: 4, max: null, overflowFirst: new Set() },
];

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
};

function parseState(value: string, caret: number, sep: string): Parsed {
  const digits: [string, string, string] = ["", "", ""];
  const seps: [boolean, boolean] = [false, false];
  let i = 0;
  let active: GroupIndex = 0;
  let assigned = false;

  for (const g of [0, 1, 2] as const) {
    const start = i;
    const spec = GROUPS[g];
    while (i < value.length && value[i] !== sep && digits[g].length < spec.width) {
      const ch = value[i];
      if (ch === undefined) break;
      digits[g] += ch;
      i += 1;
    }

    if (!assigned && caret >= start && caret <= i) {
      active = g;
      assigned = true;
    }

    if (g < 2 && i < value.length && value[i] === sep) {
      if (g === 0) seps[0] = true;
      else seps[1] = true;
      if (caret > i) {
        active = (g + 1) as GroupIndex;
        assigned = true;
      }
      i += 1;
    }
  }

  return { digits, seps, groupIndex: active };
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
): ApplyResult {
  const state = parseState(value, caret, sep);
  const digits = state.digits;
  const seps = state.seps;
  let g: GroupIndex | undefined = state.groupIndex;

  while (g !== undefined && digits[g].length >= GROUPS[g].width) {
    if (g === 2) return { value, caret };
    setSep(seps, g);
    g = nextGroup(g);
  }

  if (g === undefined) return { value, caret };

  const spec = GROUPS[g];
  const current = digits[g];

  if (current.length === 0 && spec.overflowFirst.has(digit)) {
    digits[g] = `0${digit}`;
    if (g < 2) setSep(seps, g);
    return {
      value: assemble(digits, seps, sep),
      caret: caretAt(digits, seps, sep, g, g < 2),
    };
  }

  if (current.length > 0 && spec.max !== null && Number(current + digit) > spec.max) {
    return { value, caret };
  }

  digits[g] = current + digit;
  const complete = digits[g].length >= spec.width && g < 2;
  if (complete) setSep(seps, g);

  return {
    value: assemble(digits, seps, sep),
    caret: caretAt(digits, seps, sep, g, complete),
  };
}

function commitSeparator(value: string, caret: number, sep: string): ApplyResult {
  const { digits, seps, groupIndex } = parseState(value, caret, sep);
  if (digits[groupIndex].length === 0 || groupIndex === 2) {
    return { value, caret };
  }

  digits[groupIndex] = digits[groupIndex].padStart(GROUPS[groupIndex].width, "0");
  setSep(seps, groupIndex);

  return {
    value: assemble(digits, seps, sep),
    caret: caretAt(digits, seps, sep, groupIndex, true),
  };
}

export function apply(input: ApplyInput): ApplyResult {
  const { value, caret, key } = input;
  const separator = input.separator || ".";

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
    return commitSeparator(value, caret, separator);
  }

  if (isDigit(key)) {
    return insertDigit(value, caret, key, separator);
  }

  return { value, caret };
}

const PARSE_RE = /^(\d{2})[./-](\d{2})[./-](\d{4})$/;

export function parseDate(masked: string): Date | undefined {
  const match = PARSE_RE.exec(masked);
  if (!match?.[1] || !match[2] || !match[3]) return undefined;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
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

export function formatDate(date: Date, separator = "."): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).padStart(4, "0");
  return `${day}${separator}${month}${separator}${year}`;
}
