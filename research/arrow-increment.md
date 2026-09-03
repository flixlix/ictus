# Arrow increment for a single date input

## Verdict

**Do not steal arrows.** Increment-on-arrow is a spinbutton convention, not a text-field convention. Every first-party source that increments day/month/year with ArrowUp/ArrowDown does so on *segmented* spinbuttons (or a native date widget that *is* those spinbuttons). APG’s own single-`<input>` date examples leave Up/Down alone on the textbox. Maskito Date — the closest first-party single-input date mask — has no date-segment step at all; its Time kit adds arrow stepping only as an opt-in defaulting to off. WCAG does not require or forbid the behavior. Shipping it on ictus’s caret-owned `<input>` would change the widget class without the ARIA, focus model, or wrap semantics that make increment legitimate elsewhere. Optional later, off by default, only if a caller explicitly opts in.

## What platforms and libraries actually do

### 1. W3C ARIA Authoring Practices Guide

APG has no “date input” pattern that increment a single text field. Date entry appears in three places, and they disagree on what arrows mean.

**Spinbutton Pattern** ([Keyboard Interaction](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/)): Up Arrow increases the value; Down Arrow decreases it; Home/End go to min/max; Page Up/Down are optional larger steps. That contract applies to an element with `role="spinbutton"`, typically “the only focusable component” of a value-plus-buttons widget. If the spinbutton’s text field also allows direct editing, APG requires *standard single-line text editing keys* and then says, in the same note: **“Be sure that JavaScript does not interfere with browser-provided text editing functions by capturing key events for the keys used to perform them.”** ([Spinbutton Pattern, Keyboard Interaction, Note 2.4](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/)).

**Deprecated Date Picker Spin Button Example** ([Keyboard Support](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/examples/datepicker-spinbuttons/)): three *separate* `role="spinbutton"` elements (Day, Month, Year), wrapped in `role="group"`. Down Arrow decreases one step and **wraps** (first day → last day of month; January → December). Up Arrow increases one step and wraps the other way. Page Down/Up move 5 steps with wrap. Home/End go to min/max. The example is **deprecated**; APG says to use the Quantity Spin Button instead and points date-picking at the dialog/combobox examples.

**Date Picker Dialog Example** ([About This Example](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) and [Keyboard Support](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)): a plain `<input type="text" placeholder="mm/dd/yyyy">` plus a “Choose Date” button. The textbox gets `aria-describedby` for the format string. **No increment keys are defined on the text input.** Arrow keys are documented only inside the calendar *grid* (Up/Down = previous/next week). The input is a textbox, not a spinbutton.

**Date Picker Combobox Example** ([Keyboard Support, Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-datepicker/)): **Down Arrow / Alt+Down Arrow open the date-picker dialog.** They do not increment a date part. Stealing Down Arrow on a text date field would collide with this APG combobox convention if a caller later attaches a calendar.

**Keyboard Interface practice** ([Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)): Tab moves between components; arrows move *inside* composites. A single `<input>` is not a composite. Arrow keys on a textbox are caret/selection keys unless the author has changed the role.

**Implication for ictus:** APG increment applies to spinbutton *segments*, which APG itself deprecated for dates. The APG pattern that uses one text input does not increment on arrows. Down Arrow is already reserved by the combobox-datepicker for “open calendar.”

### 2. WHATWG HTML, MDN, Chromium, Gecko

**WHATWG HTML, Date state (`type=date`)** ([§4.10.5.1.7](https://html.spec.whatwg.org/multipage/input.html#date-state-(type=date))): if mutable, “the user agent should allow the user to change the date.” The UA must not set a non-empty value that is not a valid date string. The UA *may* provide a selection UI. **No key is named.** `step` is in days; default step is 1 day; step scale factor is 86,400,000 ms. Presentation format vs wire format (`YYYY-MM-DD`) is left to the UA ([Forms intro](https://html.spec.whatwg.org/multipage/forms.html)).

**WHATWG on spinbox vs text** ([`type=number` note](https://html.spec.whatwg.org/multipage/input.html)): use a spinbox only when being off by one is a minor mistake. If incrementing the last digit would make the value “as wrong as getting every digit incorrect,” use `type=text`. A typed `dd.mm.yyyy` string is closer to that warning than to a number spinner.

**MDN `<input type="date">`** ([Technical summary](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date)): implicit ARIA role is **“no corresponding role.”** Keyboard increment of day/month/year is **not documented**. `step` is described as days jumped when “the date is incremented,” not as per-field ArrowUp. `HTMLInputElement.stepUp()` / `stepDown()` ([MDN `stepDown()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/stepDown)) step the *whole date* by `step` days and clamp to `min`/`max`.

**MDN `spinbutton` role** ([Keyboard interactions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/spinbutton_role)): Up/Right increase one step; Down/Left decrease; Page Up/Down optional; Home/End min/max. MDN also states: HTML `<input type="date">` “has 3 nested spin buttons, one each for month, day, and year,” and recommends native date/time inputs over a custom `spinbutton` role.

**Chromium / Blink** (`third_party/blink/renderer/core/html/forms/date_time_field_element.cc`, fetched from [chromium.googlesource.com](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/html/forms/date_time_field_element.cc)): the native date control is **not one text field**. Each part is a `DateTimeFieldElement`. `Initialize` sets `role="spinbutton"`, `aria-valuemin`, `aria-valuemax`, `aria-label`, and (when valued) `aria-valuenow` / `aria-valuetext`. Comment in source: “On accessibility, DateTimeFieldElement acts like spin button.” Keyboard mapping is physical-to-logical:

- Inline start/end (Left/Right in LTR horizontal) move focus to the previous/next *field*.
- Line-over / line-under (Up/Down in LTR horizontal) call `StepUp()` / `StepDown()` on the focused field.
- Backspace/Delete call `SetEmptyValue`.

A 2023 Chromium commit ([8f94931](https://github.com/chromium/chromium/commit/8f94931ade48178701884d7403957b176f00e043)) restates the vertical-writing-mode variant: Down moves to the next field, Up to the previous, Left steps down, Right steps up. Horizontal LTR is the inverse mapping: **Up/Down step the focused spinbutton; Left/Right move between fields.**

**Gecko** (`toolkit/content/widgets/datetimebox.js` on [searchfox.org/mozilla-central](https://searchfox.org/mozilla-central/rev/2e355fa82aaa87e8424a9927c8136be184eeb6c7/toolkit/content/widgets/datetimebox.js)): again a multi-field edit, not one string. `handleKeyboardNav`: ArrowUp → `incrementFieldValue(field, 1)`; ArrowDown → `incrementFieldValue(field, -1)`; Page Up/Down use `pginterval`; Home/End set min/max (no-op on year). **Empty field:** “Use current date if field is empty” — year/month/day seed from `new Date()`. **Wrap:** `if (value > max) value -= max - min + 1; else if (value < min) value += max - min + 1`. Left/Right are not this handler; they move between fields elsewhere in the widget.

**Implication for ictus:** browsers that increment on arrows do it on *nested spinbuttons* with `role="spinbutton"` and Left/Right as field navigation. They are not a single caret-owned `<input type="text">`. WHATWG does not require authors to recreate that on a text mask. `stepUp()` on `type=date` steps the whole calendar date by days, which is a different product than incrementing the caret’s group.

### 3. React Aria DateField / `@internationalized/date` / Adobe RAC

Official docs ([DateField](https://react-spectrum.adobe.com/react-aria/DateField.html), [useDateField](https://react-spectrum.adobe.com/react-aria/useDateField.html)): “Each part of a date value is displayed in an individually editable segment.” There is no “single input” mode. Form submission uses a **hidden** `<input>`. Arrow increment is not listed as a DateField *prop*; it is built into the segment.

Source (`packages/@react-aria/datepicker/src/useDateSegment.ts` at [4e3af379](https://raw.githubusercontent.com/adobe/react-spectrum/4e3af379e569faac3b374e0ed5a98b2a19cd92c3/packages/%40react-aria/datepicker/src/useDateSegment.ts)):

- File comment: users edit “by typing or using the arrow keys to increment and decrement.”
- Each segment uses `useSpinButton` with `onIncrement` → `state.increment(segment.type)`, `onDecrement` → `state.decrement(segment.type)`, plus page/min/max variants.
- `caretColor: 'transparent'` — there is no caret to move.
- `contentEditable` on the segment; `role` comes from spinbutton (`role: 'spinbutton'`, `aria-valuenow` / `valuetext` / `valuemin` / `valuemax`) except iOS VoiceOver, where the role is forced to `textbox` because “spinbuttons cannot be focused with VoiceOver on iOS.”

`useSpinButton` ([same commit](https://raw.githubusercontent.com/adobe/react-spectrum/4e3af379e569faac3b374e0ed5a98b2a19cd92c3/packages/%40react-aria/spinbutton/src/useSpinButton.ts)): ArrowUp/`Up` → `preventDefault` + `onIncrement`; ArrowDown/`Down` → `preventDefault` + `onDecrement`; Page Up/Down and Home/End as in APG. Live-announces the new `aria-valuetext` (empty → the word “Empty”).

Adobe’s own issue [#6590](https://github.com/adobe/react-spectrum/issues/6590) (first-party tracker): Up/Down increment *the focused segment only*; wrapping 59 seconds does **not** carry into minutes. Maintainers called cross-segment carry an opt-in they might accept, not the default. This is wrap-within-segment, not calendar-add.

**Is it required?** The DateField API table has no flag to disable increment. For a *segmented spinbutton field*, increment is part of the spinbutton contract. React Aria does not claim it is required — or even meaningful — on a single `<input>`. ictus’s README states the library exists because those segments “replace the input.”

### 4. Zag / Ark UI Date Input

Official Zag docs ([Date Input](https://zagjs.com/components/date-input)): “typing into **segmented** input fields (month, day, year, …).” Built on `@internationalized/date`. Hidden `<input>` for forms. No documented “single string” mode.

Official Ark UI docs ([Date Input](https://ark-ui.com/docs/components/date-input), Accessibility): “**Complies with the Spinbutton WAI-ARIA design pattern.**” Segments are `<span>`s, not one text control.

Zag machine source (`packages/machines/date-input/src/date-input.machine.ts` on [github.com/chakra-ui/zag](https://raw.githubusercontent.com/chakra-ui/zag/main/packages/machines/date-input/src/date-input.machine.ts)): `invokeOnSegmentAdjust` runs `displayValue.cycle(type, amount, placeholderValue, …)` for the **active** segment. Comment: “Prefer the active segment: focus moves in a raf, so ArrowUp/Down can land on the previous segment’s element.” Changelog / PR [#2671](https://github.com/chakra-ui/zag/pull/2671): ArrowUp/Down on empty segments start from `placeholderValue`; live region announces “Month, 02” / “Day, Empty” on typing and Arrow Up/Down.

**Implication:** same as React Aria — increment is required *because the focused node is a spinbutton segment*. Zag does not increment a caret inside one `<input>`.

### 5. Apple Human Interface Guidelines and AppKit/UIKit

**HIG Pickers** ([developer.apple.com/design/human-interface-guidelines/pickers](https://developer.apple.com/design/human-interface-guidelines/pickers)): date pickers let people choose a date/time with touch, keyboard, or pointing device. Styles: inline, compact, wheels. Wheels “also support data entry through built-in or external keyboards.” macOS has **textual** and **graphical** styles; textual is for limited space and *specific* typed values. The page does **not** prescribe ArrowUp/ArrowDown increment on a date *text field*.

**HIG Steppers** page exists ([/steppers](https://developer.apple.com/design/human-interface-guidelines/steppers)) as a *separate* control from text fields. AppKit `NSStepperCell` ([docs](https://developer.apple.com/documentation/appkit/nssteppercell)) has `increment`, `minValue`/`maxValue`, and `valueWraps` — that is the stepper, not the field editor.

**`NSDatePicker`** ([docs](https://developer.apple.com/documentation/appkit/nsdatepicker)): a control with `datePickerStyle`, optional `presentsCalendarOverlay` “when editing a calendar element within a **text-field style** date picker.” No keyboard table for ArrowUp increment. First-party docs do not say a macOS/iOS *text field* must steal vertical arrows.

**`UIDatePicker`** ([docs](https://developer.apple.com/documentation/uikit/uidatepicker)): wheel / compact / inline calendar. WWDC20 session “Design with iOS pickers, menus and actions” describes typing a time on the new picker instead of spinning wheels — **digit entry**, not arrow increment.

**Text fields + `NSDateFormatter`** (Apple archive, [Managing Text Fields and Text Views](https://developer.apple.com/library/archive/documentation/StringsTextFonts/Conceptual/TextAndWebiPhoneOS/ManageTextFieldTextViews/ManageTextFieldTextViews.html)): a text field with a date formatter is an alternative to `UIDatePicker`. Users type a formatted string. No arrow-step API is specified.

**Implication:** Apple treats increment as a stepper/picker-wheel behavior. A textual date field is for typing. HIG does not require ictus-style arrow increment.

### 6. Material Design 3 / Android

**M3 Date pickers** ([guidelines](https://m3.material.io/components/date-pickers/guidelines), [specs](https://m3.material.io/components/date-pickers/specs)): modal **date input** is an outlined **text field** plus Confirm/Cancel. Specs list “Outlined text field” as the input part. No keyboard table assigns ArrowUp/Down to increment day/month/year.

**M3 Dialogs accessibility** ([keyboard navigation](https://m3.material.io/components/dialogs/accessibility)): Tab / Shift+Tab / Space / Enter / Escape. Not arrow-step on the text field.

**Android Compose `DatePicker`** ([API](https://developer.android.com/reference/kotlin/androidx/compose/material3/DatePicker.composable), [date pickers](https://developer.android.com/develop/ui/compose/components/datepickers)): “manual entry of dates using the **numbers on a keyboard**.” `DisplayMode.Input` focuses a text field. Official docs do not document ArrowUp/Down stepping in input mode. Calendar-grid keyboard (Tab in/out, arrows through dates) is a different surface ([Compose Material3 release notes](https://developer.android.com/jetpack/androidx/releases/compose-material3)).

**Implication:** Google’s first-party date *input* is a text field for digits. Increment-on-arrow is not part of that guidance.

### 7. Windows / WinUI / Fluent

**Date picker** ([learn.microsoft.com — Date picker](https://learn.microsoft.com/en-us/windows/apps/design/controls/date-picker)): “pick a localized date value using touch, mouse, or keyboard.” The control is **three combo-style fields** (day, month, year), not one text box. Enter “Displays the picker UI” ([Keyboard interactions](https://learn.microsoft.com/en-us/windows/apps/develop/input/keyboard-interactions)). Inner navigation uses arrow keys the way ComboBox/ListView do — change the *selected item in the open picker*, not a caret in a mask.

**Keyboard interactions** (same page): “Arrow keys expose control-specific inner navigation.” Example for `TextBox`: “**Move caret inside TextBox.**” Example for `Slider`: modify the value. Windows therefore treats vertical arrows as **caret keys in a text box** and **value keys in a discrete selector**.

**Implication:** Fluent increment lives on the DatePicker’s segmented combinators, not on a single-line text field. A WinUI `TextBox` keeps arrows for the caret.

### 8. Maskito Date (comparison only — ictus is not wrapping it)

**Date kit API** ([maskito.dev/kit/date/API](https://maskito.dev/kit/date/API/)): `mode`, `separator` (default `.`), `min`, `max`. **No `step`.** Arrow increment is not a Date-kit feature.

**Time kit** ([maskito.dev/kit/time](https://maskito.dev/kit/time/), “Arrows stepping”): `step` “allows you to increment/decrement time segments by pressing ArrowUp/ArrowDown.” **`step === 0` (default) disables this.** DateTime kit exposes `timeStep` only — date segments still do not step ([DateTime](https://maskito.dev/kit/date-time/), “Time segments stepping via arrows”).

First-party issue [#2275](https://github.com/taiga-family/maskito/issues/2275): a maintainer said Time already has `step`, and “the same property could be added for Date mask” as a contribution — i.e. it is **not** shipped today.

**Implication:** the production single-`<input>` date mask closest to ictus **does not** increment date parts on arrows. Where Maskito did add arrow stepping (time), it is **opt-in, default off**, because a single input still owns a caret (see their fix for caret jump on ArrowUp/Down, changelog around #1478).

### 9. Native macOS / iOS / Android date fields

Covered above: `NSDatePicker` text-field style, `UIDatePicker` compact/inline/wheels, Android `DatePicker` input mode. None of the first-party pages prescribe ArrowUp/Down increment on a *single text field*. Native *web* `type=date` increment is the Chromium/Gecko spinbutton-field UI, not a mask over `<input type="text">`.

### 10. WCAG 2.2

**2.1.1 Keyboard (Level A)** ([Understanding](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), [normative](https://www.w3.org/TR/WCAG22/#keyboard)): all functionality must be operable through a keyboard interface. Sufficient technique includes “Using HTML form controls.” A labeled `<input>` that accepts digits already meets this. Understanding text: platforms have conventions; **following them is a best practice; “deviating from these conventions does _not_ fail the normative requirement.”** 2.1.1 therefore **neither requires nor forbids** stealing ArrowUp/Down.

**2.1.2 No Keyboard Trap (Level A)** ([Understanding](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html)): focus must be able to leave with unmodified arrows, Tab, or another standard exit. Incrementing in place on a single input does not create a trap *if Tab still leaves*. It does mean unmodified arrows are no longer a “standard exit” *inside* the field — usually irrelevant in a one-line input, but it is a reason not to also steal Left/Right.

**4.1.2 Name, Role, Value (Level A)** ([Understanding](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)): standard HTML controls meet this when used according to spec. If a script *re-purposes* a textbox to behave like a spinbutton, the control needs a programmatically determinable role and user-settable value (`aria-valuenow` / `valuemin` / `valuemax` or equivalent). Failure **F86** is “not providing names for each part of a multi-part form field.” A single named `<input>` is one component. Three logical groups without names are fine *as one textbox*; they become an F86 problem if you treat them as three spinbuttons without exposing three names.

**Accessible name:** APG date textboxes use a `<label>` plus `aria-describedby` for `mm/dd/yyyy`. Increment does not change that. What it *does* change is the role: a textbox that silently mutates on ArrowUp will still be announced as a text field unless you add `spinbutton` (which you cannot honestly do for three groups in one node).

## Conflicts with a single `<input>`

**Caret.** ictus is one string, collapsed caret, `parseState` already knows `groupIndex`. In a single-line `<input type="text">`, ArrowLeft/Right move the caret; ArrowUp/Down typically jump to start/end of the value (or no-op). That is browser text-editing, which APG spinbutton Note 2.4 says not to intercept. Stealing Up/Down removes those caret jumps. Stealing Left/Right (as Chromium date *fields* do) would break ordinary editing and must not happen.

**`isDateMaskKey`.** Today it is only digits, `.` `/` `-`, Backspace, Delete ([`src/index.ts`](../src/index.ts)). Callers (`src/react.ts`, README vanilla snippet) `preventDefault` only for those keys and let the browser handle the rest. Adding ArrowUp/Down to `isDateMaskKey` would make every existing caller steal arrows without opting in.

**Screen readers / ARIA.** A textbox has no `aria-valuenow`. Incrementing without a live announcement is silent to many AT users. Adding `role="spinbutton"` on the whole input lies about the value (one number vs three groups) and invites VO “stepper” increment commands that will not match ([React Aria #8591](https://github.com/adobe/react-spectrum/issues/8591) documents VO Control+Option+Arrow vs raw Arrow mismatches even *with* real spinbuttons). Segmented libraries solve this with per-segment `spinbutton` + `aria-label` (“Day”, “Month”, “Year”) and a live region. That is the architecture ictus v0 put out of scope.

**Form semantics.** Native `type="date"` is a UA widget (three spinbuttons + picker), implicit role “no corresponding role.” ictus callers use a text input (`inputMode="numeric"`). Keeping text semantics means digits remain the way to change the value. Changing semantics means becoming a date *widget*, which is React Aria/Zag, not a mask.

**IME / AT tools.** `useDateSegment` already special-cases composition (Pinyin, Android). Intercepting ArrowUp/Down during IME candidate selection is a known footgun. ictus’s README lists IME as out of scope; stealing arrows would pull that scope in.

**Calendar / combobox.** APG combobox-datepicker binds Down Arrow to “open dialog.” If a design system later wraps ictus with a popover, a core that `preventDefault`s ArrowDown will block that pattern.

**Single `<input>` vs segmented spinbuttons.** This is the fork that decides the answer:

| | Segmented spinbuttons (APG deprecated example, Chromium/Gecko `type=date`, React Aria, Zag/Ark) | Single `<input>` (APG datepicker-dialog textbox, Maskito Date, ictus) |
| --- | --- | --- |
| Focus target | One segment / field | Whole string |
| ArrowUp/Down | Increment focused part | Caret / unused; Maskito Time only if `step > 0` |
| ArrowLeft/Right | Previous/next segment | Caret |
| Role | `spinbutton` (+ group) | textbox |
| Empty + Up | Seed from now / placeholder (Gecko, Zag) | n/a |
| Wrap | Yes (APG example, Gecko `max-min+1`) | n/a |
| Caret | Hidden / none | Owned by the mask |

Increment is specified for the left column. ictus is the right column.

## If we added it

Only as an **opt-in** that does **not** change default `isDateMaskKey`. Closest first-party shape is Maskito Time’s `step` (default `0` = off) plus Gecko/APG wrap rules for the focused part.

**API (minimal):**

```ts
apply({
  value, caret, key, separator,
  step?: number, // default 0: ignore ArrowUp/ArrowDown
})
```

Callers who want increment pass `step: 1` and treat `ArrowUp`/`ArrowDown` as handled *in that call site*, e.g. `isDateMaskKey(key) || (step > 0 && (key === "ArrowUp" || key === "ArrowDown"))`. Do not fold arrows into `isDateMaskKey` itself.

**Behavior rules, matching the strongest primary sources (APG deprecated date spinbuttons + Gecko `datetimebox.js` + React Aria `useSpinButton`):**

1. **Which field is current?** The group already selected by `parseState` (`caret` inside that group, or the group after a separator the caret has passed). Same as digit insertion. Do not invent a “selected segment” highlight unless the product becomes segmented.
2. **Keys.** ArrowUp = +`step`; ArrowDown = −`step`. Do not handle ArrowLeft/Right, Page Up/Down, Home, or End in v1 of this option (Home/End are caret keys in a textbox; Page keys are optional even for spinbuttons).
3. **Wrap, do not clamp** for day (1–31) and month (1–12), matching APG date spinbuttons and Gecko (`value -= max - min + 1`). Year: Gecko does not wrap on Home/End; wrap is poorly defined for 0001–9999 — **clamp year** or no-op at 0001/9999 rather than jumping millennia.
4. **Empty group.** Gecko seeds from *today’s* corresponding part; Zag seeds from `placeholderValue`. For a mask with no placeholder date, seed day/month/year from `new Date()` local parts (Gecko), then apply +1/−1, then pad to the group width and write separators if needed so the string stays a coherent mask. Do not increment an empty group into a lone `"1"` without padding — that fights ictus’s overflow-advance table.
5. **Partial group** (e.g. `"1|"`). Treat as the integer already typed (Gecko `getFieldValue`), then wrap in 1–31 / 1–12, then pad to width (`01` / `02`) so increment does not leave an illegal one-digit day next to a separator.
6. **Caret after increment.** Stay at the end of the *same* group (do not advance). Maskito Time had to fix “cursor jump to the next segment” on arrows; do not repeat that. Left/Right remain the browser’s caret keys.
7. **Impossible calendar dates** (`31.02.2026`). ictus already allows partial/impossible strings and only `parseDate` rejects them. Increment should not auto-correct 31 February into 03 March (that is calendar-add, which React Aria #6590 rejected as default). Wrap day against 31, not against the month’s length, unless a later option opts into `@internationalized/date`-style cycling.
8. **ARIA.** Do not set `role="spinbutton"` on the `<input>`. If a caller wants announcements, they add their own live region; the core stays a string machine.
9. **IME.** If `isComposing`, do not handle arrows (leave them to the IME).

Even with that shape, default remains: **arrows are not ictus keys.**

## Sources

- https://www.w3.org/WAI/ARIA/apg/
- https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/
- https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/examples/datepicker-spinbuttons/
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/
- https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-datepicker/
- https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- https://html.spec.whatwg.org/multipage/input.html#date-state-(type=date)
- https://html.spec.whatwg.org/multipage/input.html (type=number spinbox note)
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/stepDown
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/spinbutton_role
- https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/html/forms/date_time_field_element.cc
- https://github.com/chromium/chromium/commit/8f94931ade48178701884d7403957b176f00e043
- https://searchfox.org/mozilla-central/rev/2e355fa82aaa87e8424a9927c8136be184eeb6c7/toolkit/content/widgets/datetimebox.js
- https://react-spectrum.adobe.com/react-aria/DateField.html
- https://react-spectrum.adobe.com/react-aria/useDateField.html
- https://raw.githubusercontent.com/adobe/react-spectrum/4e3af379e569faac3b374e0ed5a98b2a19cd92c3/packages/%40react-aria/datepicker/src/useDateSegment.ts
- https://raw.githubusercontent.com/adobe/react-spectrum/4e3af379e569faac3b374e0ed5a98b2a19cd92c3/packages/%40react-aria/spinbutton/src/useSpinButton.ts
- https://github.com/adobe/react-spectrum/issues/6590
- https://zagjs.com/components/date-input
- https://ark-ui.com/docs/components/date-input
- https://raw.githubusercontent.com/chakra-ui/zag/main/packages/machines/date-input/src/date-input.machine.ts
- https://github.com/chakra-ui/zag/pull/2671
- https://developer.apple.com/design/human-interface-guidelines/pickers
- https://developer.apple.com/documentation/appkit/nsdatepicker
- https://developer.apple.com/documentation/appkit/nssteppercell
- https://developer.apple.com/documentation/uikit/uidatepicker
- https://developer.apple.com/library/archive/documentation/StringsTextFonts/Conceptual/TextAndWebiPhoneOS/ManageTextFieldTextViews/ManageTextFieldTextViews.html
- https://m3.material.io/components/date-pickers/guidelines
- https://m3.material.io/components/date-pickers/specs
- https://m3.material.io/components/dialogs/accessibility
- https://developer.android.com/reference/kotlin/androidx/compose/material3/DatePicker.composable
- https://developer.android.com/develop/ui/compose/components/datepickers
- https://learn.microsoft.com/en-us/windows/apps/design/controls/date-picker
- https://learn.microsoft.com/en-us/windows/apps/develop/input/keyboard-interactions
- https://maskito.dev/kit/date/API/
- https://maskito.dev/kit/time/
- https://maskito.dev/kit/date-time/
- https://github.com/taiga-family/maskito/issues/2275
- https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html
- https://www.w3.org/TR/WCAG22/#keyboard
- https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html
- https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html
- https://github.com/flixlix/ictus/blob/main/src/index.ts (`isDateMaskKey`; local: `src/index.ts`)
