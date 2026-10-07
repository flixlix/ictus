# ictus

Headless as-you-type behavior for a single `<input>` date field. One string, day-month-year. No UI, no calendar, no React in the core.

Segmented date fields already own overflow-advance, but they replace the input with contentEditable spinbuttons. This library is a tiny, zero-dependency state machine other design systems can attach to their own Input primitive.

## Size and speed

Measured on this repo (`pnpm measure`). Min+gzip is what a bundler ships.

| Entry | minify | gzip |
| --- | ---: | ---: |
| `ictus` | 5.2 kB | **2.2 kB** |
| `ictus/react` (react external) | 1.5 kB | **0.8 kB** |

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
import {
  apply,
  applyPaste,
  parseDate,
  dateStatus,
  formatDate,
  expandTwoDigitYear,
  isDateMaskKey,
  bindDateMask,
} from "ictus";

apply({
  value: string,          // current masked value
  caret: number,          // selection start (or collapsed caret)
  selectionEnd?: number,  // selection end, defaults to caret
  key: string,            // digit, `.` `/` `-`, Backspace, Delete
  separator?: string,     // default '.'
  step?: number,          // default 0: ignore ArrowUp/ArrowDown
}): { value: string; caret: number }

applyPaste({
  value: string,
  caret: number,
  selectionEnd?: number,
  pasted: string,         // clipboard text
  separator?: string,
}): { value: string; caret: number }

parseDate(masked: string, options?: {
  yyExpand?: { pivot?: number };
  min?: Date;
  max?: Date;
}): Date | undefined
dateStatus(masked: string): "empty" | "incomplete" | "invalid" | "valid"
formatDate(date: Date, separator?: string, options?: { yyExpand?: { pivot?: number } }): string
expandTwoDigitYear(yy: number, pivot?: number): number
isDateMaskKey(key: string): boolean

bindDateMask(input: HTMLInputElement, options?: {
  separator?: string;
  step?: number;              // default 0: ignore ArrowUp/ArrowDown
  onValueChange?: (value: string) => void;
  getValue?: () => string;
  setValue?: (value: string) => void;
}): () => void               // unsubscribe
```

`applyPaste` normalizes common clipboard shapes (`11/12/2026`, `11-12-2026`, `11.12.2026`, digit-only `11122026`, ISO `2026-12-11`) into the mask via the same group and overflow rules as `apply`. Non-date characters are ignored. ISO year-month-day with separators is remapped to day-month-year; digit-only strings stay DMY order.

`parseDate` returns a **local** `Date` (`new Date(year, monthIndex, day)`) only for a complete, calendar-valid triple. Optional `min` / `max` reject complete dates outside that local calendar-day range (still `undefined`). Partial and impossible strings stay in the input and parse to `undefined` without range checks. Reject never clears the box; selecting the value and deleting does.

`dateStatus` classifies a masked string for UI feedback: `""` → `empty`, a partial mask → `incomplete`, a complete `dd{sep}mm{sep}yyyy` that is not a calendar date → `invalid`, and a value `parseDate` accepts → `valid`.

`formatDate` writes `dd{sep}mm{sep}yyyy` from the date's local calendar parts.

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
import { bindDateMask } from "ictus";

const input = document.querySelector("input");
const unbind = bindDateMask(input, {
  separator: ".",
  // step: 1, // optional; off by default
  onValueChange: (value) => console.log(value),
});

// later: unbind();
```

`bindDateMask` wires `keydown` (and paste) to `apply`, writes the result back to the input, and restores the caret. It returns a cleanup function that removes the listeners. Pass `getValue` / `setValue` when the masked string is owned outside the DOM.

For a one-off keystroke without attaching listeners, call `apply` and `isDateMaskKey` yourself.

Live demos and the full API live in [`docs/`](docs/) (`pnpm docs`).

## React

`react` is an optional peer. The core stays zero-dependency.

```tsx
import { useDateFieldMask } from "ictus/react";

function DateInput() {
  const { inputProps, hiddenInputProps, isoValue, parsed, status } =
    useDateFieldMask({
    separator: ".",
    min: new Date(1900, 0, 1),
    max: new Date(2100, 11, 31),
    // step: 1, // optional; off by default
    onValueChange: (value) => console.log(value, parsed, status),
    onParsedChange: (date) => console.log(date),
  });

  return (
    <>
      <input {...inputProps} />
      <input name="date" {...hiddenInputProps} />
    </>
  );
}
```

Pass `value` for controlled mode (with `onValueChange` to update parent state). Omit `value` and use `defaultValue` for uncontrolled mode.

```tsx
function ControlledDateInput() {
  const [value, setValue] = useState("");
  const { inputProps, parsed } = useDateFieldMask({
    value,
    onValueChange: setValue,
  });

  return <input {...inputProps} />;
}
```

`inputProps` is `ref`, `value`, `onKeyDown`, `onPaste` (`preventDefault` + `applyPaste`), a no-op `onChange` (value is owned by `apply` / `applyPaste`), `inputMode="numeric"`, `autoComplete="off"`, and `spellCheck={false}`. The hook restores the caret after React commits. `parsed` is a local `Date` or `undefined`. `status` is the same classification as `dateStatus`. Pass `step` to enable ArrowUp/ArrowDown segment increment; it stays off when omitted.

`onParsedChange` runs when the parsed calendar day changes (`undefined` ↔ `Date`, or a different day)—not on every keystroke while the value stays incomplete. `isoValue` is `YYYY-MM-DD` when `parsed` is set, otherwise `""`. `hiddenInputProps` is `{ type: "hidden", value: isoValue }` for a native form field you can spread and name yourself.

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
