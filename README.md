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
import { apply, parseDate, formatDate, isDateMaskKey } from "ictus";

apply({
  value: string,          // current masked value
  caret: number,          // selection start (or collapsed caret)
  selectionEnd?: number,  // selection end, defaults to caret
  key: string,            // digit, `.` `/` `-`, Backspace, Delete
  separator?: string,     // default '.'
}): { value: string; caret: number }

parseDate(masked: string): Date | undefined
formatDate(date: Date, separator?: string): string
isDateMaskKey(key: string): boolean
```

`parseDate` returns a **local** `Date` (`new Date(year, monthIndex, day)`) only for a complete, calendar-valid triple. Partial and impossible strings stay in the input and parse to `undefined`. Reject never clears the box; selecting the value and deleting does.

`formatDate` writes `dd{sep}mm{sep}yyyy` from the date's local calendar parts.

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
| `11\|` | `1` | `11.1\|` |
| `11.12.\|` | `⌫` | `11.12\|` |

Empty current group + separator is a no-op (`Blank + . → ""`). Backspace/Delete remove one visible character, including a trailing separator. A selected range is deleted (select-all + delete clears the field).

## Vanilla `<input>`

```js
import { apply, isDateMaskKey } from "ictus";

const input = document.querySelector("input");
input.addEventListener("keydown", (event) => {
  if (!isDateMaskKey(event.key)) return;
  event.preventDefault();
  const next = apply({
    value: input.value,
    caret: input.selectionStart ?? 0,
    selectionEnd: input.selectionEnd ?? undefined,
    key: event.key,
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
    onValueChange: (value) => console.log(value, parsed),
  });

  return <input {...inputProps} />;
}
```

`inputProps` is `ref`, `value`, `onKeyDown`, a no-op `onChange` (value is owned by `apply`), `inputMode="numeric"`, `autoComplete="off"`, and `spellCheck={false}`. The hook restores the caret after React commits. `parsed` is a local `Date` or `undefined`.

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
