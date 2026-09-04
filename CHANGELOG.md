# ictus

## 0.1.2

### Patch Changes

- Insert day and month digits at the caret instead of always appending, so typing `1` before a `2` becomes December and typing `2` before a `1` is ignored.

## 0.1.1

### Patch Changes

- Clear the field when a selection is deleted. `apply` only saw a collapsed caret, so select-all + Backspace was a no-op at index 0.

## 0.1.0

### Minor Changes

- Headless as-you-type mask for a single day-month-year input. Zero-dependency `apply` / `parseDate` / `formatDate` machine, optional React hook, and docs.
