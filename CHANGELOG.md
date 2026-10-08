# ictus

## 1.1.0

### Minor Changes

- [#19](https://github.com/flixlix/ictus/pull/19) [`c7d837b`](https://github.com/flixlix/ictus/commit/c7d837b73cd4ed37483df5b7ebb80d4193d7aac0) Thanks [@flixlix](https://github.com/flixlix)! - Add a headless 24-hour time mask via `ictus/time` (`applyTime`, `bindTimeMask`, and `useTimeFieldMask`).

### Patch Changes

- [#22](https://github.com/flixlix/ictus/pull/22) [`bd49a7c`](https://github.com/flixlix/ictus/commit/bd49a7c53cda0135f96ad43bf211ecfab6989b27) Thanks [@flixlix](https://github.com/flixlix)! - Prevent Backspace/Delete from leaving non-mask characters in date and time mask state when the DOM value was polluted.

- [#26](https://github.com/flixlix/ictus/pull/26) [`5804ce9`](https://github.com/flixlix/ictus/commit/5804ce94d72739d7844ef174d0fcbc3955078d13) Thanks [@flixlix](https://github.com/flixlix)! - Ctrl/Cmd+Backspace and Ctrl/Cmd+Delete clear a date or time group; Shift+Backspace and Shift+Delete clear the whole value. Plain Backspace and Delete still remove one character.

- [#25](https://github.com/flixlix/ictus/pull/25) [`5de584e`](https://github.com/flixlix/ictus/commit/5de584e74643b4465145889f879dfa1c9d797a94) Thanks [@flixlix](https://github.com/flixlix)! - When a second digit would push a day, month, or hour past its max, pad the group and spill the digit into the next one (`3` then `9` → `03.09.|`), including the same idea for time and `mdy` / `ymd`.

- [#22](https://github.com/flixlix/ictus/pull/22) [`a01ad69`](https://github.com/flixlix/ictus/commit/a01ad69ed92fddfcd6d99b62fa1aa831f50161d3) Thanks [@flixlix](https://github.com/flixlix)! - Ignore separator keys inside an already-complete date or time group that already has its separator (same no-op as a rejected digit).

- [#24](https://github.com/flixlix/ictus/pull/24) [`5233585`](https://github.com/flixlix/ictus/commit/5233585057fd1a2cdc8956a419087f219b2b8db4) Thanks [@flixlix](https://github.com/flixlix)! - Keep the caret after a digit inserted in the middle of a group (notably the year), so typing `19` at `14.10.|26` becomes `14.10.19|26` instead of appending at the end.

## 1.0.0

### Major Changes

- [#14](https://github.com/flixlix/ictus/pull/14) [`cc170e8`](https://github.com/flixlix/ictus/commit/cc170e8cb873ee230aed5e48b23d0c911c21d8bb) Thanks [@flixlix](https://github.com/flixlix)! - First stable release.

### Minor Changes

- [#4](https://github.com/flixlix/ictus/pull/4) [`765df77`](https://github.com/flixlix/ictus/commit/765df77c0e509e6113fabd8b8be582f5bb1fcec0) Thanks [@flixlix](https://github.com/flixlix)! - Add applyPaste and React onPaste handling so clipboard dates normalize into the mask.

- [#7](https://github.com/flixlix/ictus/pull/7) [`6138cd7`](https://github.com/flixlix/ictus/commit/6138cd791af810378d98d6b1b65d43fab4733dc8) Thanks [@flixlix](https://github.com/flixlix)! - Add bindDateMask to attach the date mask to a plain HTMLInputElement.

- [#11](https://github.com/flixlix/ictus/pull/11) [`560df0c`](https://github.com/flixlix/ictus/commit/560df0c62eae05f215f18e005f025c7096fe7409) Thanks [@flixlix](https://github.com/flixlix)! - Support controlled value mode on useDateFieldMask alongside defaultValue.

- [#6](https://github.com/flixlix/ictus/pull/6) [`f5df83a`](https://github.com/flixlix/ictus/commit/f5df83a9cb0c202de4fd74cf1600f084a3ca2d91) Thanks [@flixlix](https://github.com/flixlix)! - Add a status helper that classifies a masked date as empty, incomplete, invalid, or valid.

- [#12](https://github.com/flixlix/ictus/pull/12) [`5b82b77`](https://github.com/flixlix/ictus/commit/5b82b779b5add00d3dc99258747036d5cc7341de) Thanks [@flixlix](https://github.com/flixlix)! - Add explicit dmy/mdy/ymd field order modes to apply, parseDate, formatDate, and the React hook.

- [#8](https://github.com/flixlix/ictus/pull/8) [`f0cf7b6`](https://github.com/flixlix/ictus/commit/f0cf7b6526cc510825f21e698d69f526eaa55013) Thanks [@flixlix](https://github.com/flixlix)! - Support optional min and max bounds when parsing complete masked dates.

- [#9](https://github.com/flixlix/ictus/pull/9) [`0eff08d`](https://github.com/flixlix/ictus/commit/0eff08dc1dc6e5e4fad8973fd5948867bb386652) Thanks [@flixlix](https://github.com/flixlix)! - Add onParsedChange and form-ready ISO/hidden input helpers to useDateFieldMask.

- [#6](https://github.com/flixlix/ictus/pull/6) [`7cd62b9`](https://github.com/flixlix/ictus/commit/7cd62b9346860ba88194005559ea1ea43ceabdc1) Thanks [@flixlix](https://github.com/flixlix)! - Add optional apply step for ArrowUp/ArrowDown segment increment, off by default.

## 0.1.2

### Patch Changes

- Insert day and month digits at the caret instead of always appending, so typing `1` before a `2` becomes December and typing `2` before a `1` is ignored.

## 0.1.1

### Patch Changes

- Clear the field when a selection is deleted. `apply` only saw a collapsed caret, so select-all + Backspace was a no-op at index 0.

## 0.1.0

### Minor Changes

- Headless as-you-type mask for a single day-month-year input. Zero-dependency `apply` / `parseDate` / `formatDate` machine, optional React hook, and docs.
