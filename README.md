# ictus

Headless as-you-type behavior for a single `<input>` date field. One string, day-month-year. No UI, no calendar, no React in the core.

Segmented date fields already own overflow-advance, but they replace the input with contentEditable spinbuttons. This library is a tiny, zero-dependency state machine other design systems can attach to their own Input primitive.

## Size and speed

Measured on this repo (`pnpm measure`). Min+gzip is what a bundler ships.

| Entry | minify | gzip |
| --- | ---: | ---: |
| `ictus` | 2.4 kB | **1.1 kB** |
| `ictus/react` (react external) | 0.7 kB | **0.4 kB** |

`apply` is **0.1–0.2 µs** per keystroke (~5–8 million ops/s). Typing a full `11.12.2026` is about **2 µs**. `parseDate` is about **0.4 µs**. A 16 ms frame is tens of thousands of keystrokes; the work is a walk over at most ten characters, no DOM, no allocations beyond the returned `{ value, caret }`.

## Docs

Live docs: [ictus.luca-felix.com](https://ictus.luca-felix.com). Locally, `pnpm docs`.

## Install

```bash
npm install ictus
```

## Groups

| Group | Width | First digit | Second digit |
| --- | --- | --- | --- |
| Day | 2 | `4–9` → `0N.` · `0–3` stay | max 31 (`32–39` ignored) |
| Month | 2 | `2–9` → `0N.` · `0–1` stay | max 12 (`13–19` ignored) |
| Year | 4 | never pad | any 4 digits until parse |

The separator is configurable (default `.`). Typing `.`, `/`, or `-` commits the current group and writes the configured separator.

## API

```ts
<<<<<<< HEAD
import { apply, applyPaste, parseDate, formatDate, isDateMaskKey } from "ictus";
=======
import {
  apply,
  parseDate,
  formatDate,
  expandTwoDigitYear,
  isDateMaskKey,
} from "ictus";
>>>>>>> origin/main

apply({
  value: string,          // current masked value
  caret: number,          // selection start (or collapsed caret)
  selectionEnd?: number,  // selection end, defaults to caret
  key: string,            // digit, `.` `/` `-`, Backspace, Delete
  separator?: string,     // default '.'
  step?: number,          // default 0: ignore ArrowUp/ArrowDown
}): { value: string; caret: number }

<<<<<<< HEAD
applyPaste({
  value: string,
  caret: number,
  selectionEnd?: number,
  pasted: string,         // clipboard text
  separator?: string,
}): { value: string; caret: number }

parseDate(masked: string): Date | undefined
formatDate(date: Date, separator?: string): string
=======
parseDate(masked: string, options?: { yyExpand?: { pivot?: number } }): Date | undefined
formatDate(date: Date, separator?: string, options?: { yyExpand?: { pivot?: number } }): string
expandTwoDigitYear(yy: number, pivot?: number): number
>>>>>>> origin/main
isDateMaskKey(key: string): boolean
```

`applyPaste` normalizes common clipboard shapes (`11/12/2026`, `11-12-2026`, `11.12.2026`, digit-only `11122026`, ISO `2026-12-11`) into the mask via the same group and overflow rules as `apply`. Non-date characters are ignored. ISO year-month-day with separators is remapped to day-month-year; digit-only strings stay DMY order.

`parseDate` returns a **local** `Date` (`new Date(year, monthIndex, day)`) only for a complete, calendar-valid triple. Partial and impossible strings stay in the input and parse to `undefined`. Reject never clears the box; selecting the value and deleting does.

By default the year group must be four digits. Pass `yyExpand` to also accept a complete `dd{sep}mm{sep}yy` mask and expand the two-digit year. The pivot (default `50`) chooses the century: `yy < pivot` → `2000 + yy`, otherwise `1900 + yy`. So with the default pivot, `00–49` → `2000–2049` and `50–99` → `1950–1999`. Four-digit years are unchanged when `yyExpand` is set. The as-you-type mask still uses a width-4 year group; expansion is opt-in on parse/format only.

`formatDate` writes `dd{sep}mm{sep}yyyy` from the date's local calendar parts. With `yyExpand`, years that round-trip through that pivot are written as two digits; years outside the window stay four digits.

`expandTwoDigitYear` is the same pivot rule used by `parseDate` / `formatDate`.

### Optional arrow step

`step` defaults to `0` (off). When `step > 0`, `ArrowUp` / `ArrowDown` increment or decrement the caret’s current group by `step`. Day wraps in 1–31, month wraps in 1–12, year clamps to 0001–9999. An empty group seeds from today’s local day/month/year, then steps. Partial groups are treated as their typed integer and padded to width. The caret keeps its offset inside the group (clamped if the width changes). An empty group that seeds from today still places the caret at the end of that group. Left/Right, Home/End, and Page keys are not handled. Do not set `role="spinbutton"` on the input.

`isDateMaskKey` does **not** include arrow keys. Callers that opt in must treat them as handled themselves:

```ts
const step = 1;
if (
  isDateMaskKey(event.key) ||
  (step > 0 && (event.key === "ArrowUp" || event.key === "ArrowDown"))
) {
  event.preventDefault();
  // apply({ ..., key: event.key, step })
}
```

## Acceptance table

`separator = '.'`. `|` is the caret after the keystroke.

| Before | Key | After |
| --- | --- | --- |
| `\|` | `4` | `04.\|` |
| `\|` | `1` | `1\|` |
| `1\|` | `.` | `01.\|` |
| `13\|` | `.` | `13.\|` |
| `\|` | `.` | `\|` |
| `04.\|` | `.` | `04.\|` |
| `04.\|` | `9` | `04.09.\|` |
| `3\|` | `9` | `3\|` |
| `04.1\|` | `3` | `04.1\|` |
| `04.\|2.2026` | `1` | `04.12.\|2026` |
| `04.\|1.2026` | `2` | `04.\|1.2026` |
| `11\|` | `1` | `11.1\|` |
| `11.12.\|` | `⌫` | `11.12\|` |

Empty current group + separator is a no-op (`Blank + . → ""`). Backspace/Delete remove one visible character, including a trailing separator. A selected range is deleted (select-all + delete clears the field).

## Vanilla `<input>`

```js
import { apply, applyPaste, isDateMaskKey } from "ictus";

const step = 0; // set > 0 to enable ArrowUp/ArrowDown segment step
const input = document.querySelector("input");
input.addEventListener("keydown", (event) => {
  if (
    !isDateMaskKey(event.key) &&
    !(step > 0 && (event.key === "ArrowUp" || event.key === "ArrowDown"))
  ) {
    return;
  }
  event.preventDefault();
  const next = apply({
    value: input.value,
    caret: input.selectionStart ?? 0,
    selectionEnd: input.selectionEnd ?? undefined,
    key: event.key,
    step,
  });
  input.value = next.value;
  input.setSelectionRange(next.caret, next.caret);
});

input.addEventListener("paste", (event) => {
  event.preventDefault();
  const next = applyPaste({
    value: input.value,
    caret: input.selectionStart ?? 0,
    selectionEnd: input.selectionEnd ?? undefined,
    pasted: event.clipboardData?.getData("text") ?? "",
  });
  input.value = next.value;
  input.setSelectionRange(next.caret, next.caret);
});
```

Live demos and the full API live in [`docs/`](docs/) (`pnpm docs`).

## React

`react` is an optional peer. The core stays zero-dependency.

```tsx
import { useDateFieldMask } from "ictus/react";

function DateInput() {
  const { inputProps, parsed } = useDateFieldMask({
    separator: ".",
    // step: 1, // optional; off by default
    onValueChange: (value) => console.log(value, parsed),
  });

  return <input {...inputProps} />;
}
```

`inputProps` is `ref`, `value`, `onKeyDown`, `onPaste` (`preventDefault` + `applyPaste`), a no-op `onChange` (value is owned by `apply` / `applyPaste`), `inputMode="numeric"`, `autoComplete="off"`, and `spellCheck={false}`. The hook restores the caret after React commits. `parsed` is a local `Date` or `undefined`. Pass `step` to enable ArrowUp/ArrowDown segment increment; it stays off when omitted.

## Releasing

This repo uses [Changesets](https://changesets.dev). On a branch with a user-facing change:

```bash
pnpm changeset
```

Merging to `main` opens a Version Packages PR. Merging that PR publishes to npm and creates a GitHub release.

Publishing needs an `NPM_TOKEN` repository secret. In the repo’s Actions settings, enable **Allow GitHub Actions to create and approve pull requests**.

## Out of scope

Segmented/spinbutton fields. Calendar/popover. Locale-driven field order. Time, date-time, ranges. IME / non-Latin numerals. Wrapping Maskito, IMask, Cleave, React Aria, or `@internationalized/date`.

v0 is `dd.mm.yyyy` only. `mm/dd/yyyy` and `yyyy/mm/dd` can come later.
