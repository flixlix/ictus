import {
  apply,
  applyPaste,
  dateStatus,
  formatDate,
  isDateMaskKey,
  parseDate,
} from "../src/index.js";
import type { DateStatus } from "../src/index.js";
import {
  applyTime,
  applyTimePaste,
  isTimeMaskKey,
  parseTime,
  timeStatus,
} from "../src/time.js";
import type { TimeFieldPrecision, TimeStatus } from "../src/time.js";
import { mountAdvancedDemos } from "./demos/advanced.js";
import { appendBlurLayers, mountOverflowScrollGradients } from "./overflow-scroll-gradient.js";
import { mountToc } from "./toc.js";

function show(value: string, caret: number, selectionEnd = caret): string {
  if (selectionEnd === caret) {
    return `${value.slice(0, caret)}|${value.slice(caret)}`;
  }
  const from = Math.min(caret, selectionEnd);
  const to = Math.max(caret, selectionEnd);
  return `${value.slice(0, from)}|${value.slice(from, to)}|${value.slice(to)}`;
}

function at(marked: string): { value: string; caret: number } {
  const caret = marked.indexOf("|");
  return { value: marked.replace("|", ""), caret };
}

function parseKind(masked: string): { kind: DateStatus; label: string } {
  const status = dateStatus(masked);
  switch (status) {
    case "valid": {
      const date = parseDate(masked);
      if (!date) return { kind: "incomplete", label: "incomplete" };
      const label = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
      return { kind: "valid", label };
    }
    case "invalid":
      return { kind: "invalid", label: "not a calendar date" };
    case "incomplete":
      return { kind: "incomplete", label: "incomplete" };
    case "empty":
      return { kind: "empty", label: "empty" };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function parseTimeKind(
  masked: string,
  precision: TimeFieldPrecision,
): { kind: TimeStatus; label: string } {
  const status = timeStatus(masked, { precision });
  switch (status) {
    case "valid": {
      const time = parseTime(masked, { precision });
      if (!time) return { kind: "incomplete", label: "incomplete" };
      const label =
        precision === "second"
          ? `${String(time.hours).padStart(2, "0")}:${String(time.minutes).padStart(2, "0")}:${String(time.seconds).padStart(2, "0")}`
          : `${String(time.hours).padStart(2, "0")}:${String(time.minutes).padStart(2, "0")}`;
      return { kind: "valid", label };
    }
    case "invalid":
      return { kind: "invalid", label: "not a clock time" };
    case "incomplete":
      return { kind: "incomplete", label: "incomplete" };
    case "empty":
      return { kind: "empty", label: "empty" };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function isTimeRoot(root: HTMLElement): boolean {
  return root.dataset.kind === "time";
}

function timePrecision(root: HTMLElement): TimeFieldPrecision {
  return root.dataset.precision === "second" ? "second" : "minute";
}

function syncField(root: HTMLElement, value: string, caret: number, hint = ""): void {
  const input = root.querySelector("input");
  const caretEl = root.querySelector("[data-caret]");
  const parseEl = root.querySelector("[data-parse]");
  const hintEl = root.querySelector("[data-hint]");
  if (!(input instanceof HTMLInputElement)) return;
  input.value = value;
  input.setSelectionRange(caret, caret);
  if (caretEl) caretEl.textContent = show(value, caret);
  if (parseEl instanceof HTMLElement) {
    const parsed = isTimeRoot(root)
      ? parseTimeKind(value, timePrecision(root))
      : parseKind(value);
    parseEl.dataset.kind = parsed.kind;
    parseEl.textContent = parsed.label;
  }
  if (hintEl) hintEl.textContent = hint;
}

function maskOptions(root: HTMLElement): {
  time: boolean;
  separator: string;
  precision: TimeFieldPrecision;
  step: number;
} {
  const time = isTimeRoot(root);
  return {
    time,
    separator: root.dataset.separator || (time ? ":" : "."),
    precision: timePrecision(root),
    step: Number(root.dataset.step) || 0,
  };
}

type MaskKeyMods = {
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

function applyMaskKey(
  root: HTMLElement,
  input: HTMLInputElement,
  key: string,
  mods: MaskKeyMods = {},
): void {
  const { time, separator, precision, step } = maskOptions(root);
  const arrow = step > 0 && (key === "ArrowUp" || key === "ArrowDown");
  const isMaskKey = time ? isTimeMaskKey(key) : isDateMaskKey(key);
  if (!isMaskKey && !arrow) return;
  const caret = input.selectionStart ?? 0;
  const next = time
    ? applyTime({
        value: input.value,
        caret,
        selectionEnd: input.selectionEnd ?? undefined,
        key,
        separator,
        precision,
        step,
        ctrlKey: mods.ctrlKey,
        metaKey: mods.metaKey,
        shiftKey: mods.shiftKey,
      })
    : apply({
        value: input.value,
        caret,
        selectionEnd: input.selectionEnd ?? undefined,
        key,
        separator,
        step,
        ctrlKey: mods.ctrlKey,
        metaKey: mods.metaKey,
        shiftKey: mods.shiftKey,
      });
  const ignored =
    next.value === input.value &&
    next.caret === caret &&
    key !== "Backspace" &&
    key !== "Delete";
  syncField(root, next.value, next.caret, ignored ? "ignored" : "");
}

function applyMaskPaste(root: HTMLElement, input: HTMLInputElement, pasted: string): void {
  const { time, separator, precision } = maskOptions(root);
  const next = time
    ? applyTimePaste({
        value: input.value,
        caret: input.selectionStart ?? 0,
        selectionEnd: input.selectionEnd ?? undefined,
        pasted,
        separator,
        precision,
      })
    : applyPaste({
        value: input.value,
        caret: input.selectionStart ?? 0,
        selectionEnd: input.selectionEnd ?? undefined,
        pasted,
        separator,
      });
  syncField(root, next.value, next.caret);
}

function bindMask(root: HTMLElement): void {
  const input = root.querySelector("input");
  if (!(input instanceof HTMLInputElement)) return;
  const { time, step } = maskOptions(root);
  syncField(root, input.value, input.selectionStart ?? input.value.length);

  input.addEventListener("keydown", (event) => {
    const arrow =
      step > 0 && (event.key === "ArrowUp" || event.key === "ArrowDown");
    const isMaskKey = time ? isTimeMaskKey(event.key) : isDateMaskKey(event.key);
    if (!isMaskKey && !arrow) {
      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
      }
      return;
    }
    event.preventDefault();
    applyMaskKey(root, input, event.key, {
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
    });
  });

  input.addEventListener("paste", (event) => {
    event.preventDefault();
    applyMaskPaste(root, input, event.clipboardData?.getData("text") ?? "");
  });

  const paintCaret = () => {
    const caretEl = root.querySelector("[data-caret]");
    if (!caretEl) return;
    const caret = input.selectionStart ?? 0;
    caretEl.textContent = show(input.value, caret, input.selectionEnd ?? caret);
  };
  input.addEventListener("click", paintCaret);
  input.addEventListener("select", paintCaret);
}

const copyIcon = `<svg class="copy-glyph" data-label="idle" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>`;
const checkIcon = `<svg class="copy-glyph" data-label="done" viewBox="0 0 24 24" aria-hidden="true"><path pathLength="1" d="M4.5 12.5l5 5 10-11"/></svg>`;

function labelCopyButton(button: HTMLButtonElement): (copied: boolean) => void {
  if (button.classList.contains("copy-icon")) {
    button.innerHTML = copyIcon + checkIcon;
    const label = button.getAttribute("aria-label") ?? "Copy";
    return (copied) => {
      button.dataset.copied = String(copied);
      button.setAttribute("aria-label", copied ? "Copied" : label);
    };
  }

  const idle = document.createElement("span");
  idle.className = "copy-label";
  idle.dataset.label = "idle";
  idle.textContent = button.textContent;
  const done = document.createElement("span");
  done.className = "copy-label";
  done.dataset.label = "done";
  done.textContent = "Copied";
  done.setAttribute("aria-hidden", "true");
  button.replaceChildren(idle, done);
  return (copied) => {
    button.dataset.copied = String(copied);
    idle.setAttribute("aria-hidden", String(copied));
    done.setAttribute("aria-hidden", String(!copied));
  };
}

function bindCopies(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy], [data-copy-target]")) {
    const setCopied = labelCopyButton(button);
    let reset: number | undefined;

    button.addEventListener("click", async () => {
      const direct = button.dataset.copy;
      const targetId = button.dataset.copyTarget;
      const target = targetId ? document.getElementById(targetId) : null;
      const text = direct ?? target?.textContent ?? "";
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(reset);
      reset = window.setTimeout(() => setCopied(false), 1200);
    });
  }
}

function bindFolds(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-expand]")) {
    const fold = button.dataset.expand ? document.getElementById(button.dataset.expand) : null;
    if (fold) {
      const blur = document.createElement("div");
      blur.className = "fold-blur";
      blur.setAttribute("aria-hidden", "true");
      appendBlurLayers(blur, "to top", "--surface");
      fold.after(blur);
    }

    let pending: AbortController | undefined;
    button.addEventListener("click", () => {
      const id = button.dataset.expand;
      const target = id ? document.getElementById(id) : null;
      if (!(target instanceof HTMLElement)) return;

      // Height can't transition to/from `auto`, so pin both ends in px for the duration.
      // Measuring with transitions off keeps a mid-flight click from reading the animated value.
      pending?.abort();
      const from = target.getBoundingClientRect().height;
      target.classList.add("is-animating");
      const open = target.classList.toggle("is-open");
      target.style.transition = "none";
      target.style.height = "";
      const to = open ? target.scrollHeight : target.getBoundingClientRect().height;
      target.style.height = `${from}px`;
      void target.offsetHeight;
      target.style.transition = "";
      target.style.height = `${to}px`;

      const done = () => {
        target.classList.remove("is-animating");
        target.style.height = "";
      };
      if (matchMedia("(prefers-reduced-motion: reduce)").matches || from === to) {
        done();
      } else {
        pending = new AbortController();
        target.addEventListener(
          "transitionend",
          (event) => {
            if (event.target !== target || event.propertyName !== "height") return;
            pending?.abort();
            done();
          },
          { signal: pending.signal },
        );
      }

      button.setAttribute("aria-expanded", open ? "true" : "false");
      button.textContent = open ? "Show less" : "Show more";
    });
  }
}

function bindPackageManagers(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>(".pm-tabs [data-pm]");
  const command = document.querySelector("#install-command");
  const copy = document.querySelector<HTMLButtonElement>("#copy-install");
  if (!(command instanceof HTMLElement) || !copy || tabs.length === 0) return;

  let words = renderWords(command, (command.textContent ?? "").trim().split(" "));

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      const next = tab.dataset.pm;
      if (!next || next === copy.dataset.copy) return;
      for (const other of tabs) {
        other.setAttribute("aria-selected", other === tab ? "true" : "false");
      }
      words = morphCommand(command, words, next.split(" "));
      copy.dataset.copy = next;
    });
  }
}

function wordSpan(text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = "install-word";
  span.textContent = text;
  return span;
}

function renderWords(command: HTMLElement, texts: string[]): HTMLSpanElement[] {
  const spans = texts.map(wordSpan);
  command.replaceChildren(...spans.flatMap((span, i) => (i === 0 ? [span] : [" ", span])));
  return spans;
}

// Words shared with the previous command keep their element and slide into place;
// only the differing run in between crossfades.
function morphCommand(command: HTMLElement, current: HTMLSpanElement[], next: string[]): HTMLSpanElement[] {
  const before = current.map((span) => span.textContent ?? "");
  let head = 0;
  while (head < before.length && head < next.length && before[head] === next[head]) head++;
  let tail = 0;
  while (
    tail < before.length - head &&
    tail < next.length - head &&
    before[before.length - 1 - tail] === next[next.length - 1 - tail]
  ) {
    tail++;
  }

  const kept = [...current.slice(0, head), ...current.slice(current.length - tail)];
  const leaving = current.slice(head, current.length - tail);
  const entering = next.slice(head, next.length - tail).map(wordSpan);
  const spans = [...current.slice(0, head), ...entering, ...current.slice(current.length - tail)];

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const origin = command.getBoundingClientRect();
  // Rects include any in-flight transform, so an interrupted switch continues from where the eye is.
  const keptFrom = kept.map((span) => span.getBoundingClientRect().left);
  const ghosts = leaving.map((span) => {
    const rect = span.getBoundingClientRect();
    const opacity = getComputedStyle(span).opacity;
    const ghost = wordSpan(span.textContent ?? "");
    ghost.classList.add("is-ghost");
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.left = `${rect.left - origin.left}px`;
    ghost.style.top = `${rect.top - origin.top}px`;
    ghost.style.opacity = opacity;
    return ghost;
  });

  for (const span of current) span.getAnimations().forEach((animation) => animation.cancel());
  command.querySelectorAll(".is-ghost").forEach((ghost) => ghost.remove());
  command.replaceChildren(...spans.flatMap((span, i) => (i === 0 ? [span] : [" ", span])), ...ghosts);

  const shift = reduced ? 0 : 4;
  const blur = reduced ? 0 : 2;
  const fade = { duration: 200, easing: "cubic-bezier(0.19, 1, 0.22, 1)" };

  for (const ghost of ghosts) {
    ghost
      .animate(
        [
          { opacity: ghost.style.opacity, transform: "translateY(0)", filter: "blur(0)" },
          { opacity: 0, transform: `translateY(-${shift}px)`, filter: `blur(${blur}px)` },
        ],
        { ...fade, duration: 150, fill: "forwards" },
      )
      .finished.then(() => ghost.remove(), () => {});
  }

  for (const span of entering) {
    span.animate(
      [
        { opacity: 0, transform: `translateY(${shift}px)`, filter: `blur(${blur}px)` },
        { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
      ],
      fade,
    );
  }

  if (!reduced) {
    kept.forEach((span, i) => {
      const dx = (keptFrom[i] ?? 0) - span.getBoundingClientRect().left;
      if (Math.abs(dx) < 0.5) return;
      span.animate([{ transform: `translateX(${dx}px)` }, { transform: "translateX(0)" }], {
        duration: 250,
        easing: "cubic-bezier(0.645, 0.045, 0.355, 1)",
      });
    });
  }

  return spans;
}

function bindFormat(): void {
  const native = document.querySelector<HTMLInputElement>("#native-date");
  const sep = document.querySelector<HTMLSelectElement>("#format-sep");
  const result = document.querySelector("#format-result");
  const load = document.querySelector("#load-formatted");
  if (!native || !sep || !result) return;

  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  native.value = iso;

  const render = () => {
    const [year, month, day] = native.value.split("-").map(Number);
    if (!year || !month || !day) {
      result.textContent = "";
      return;
    }
    result.textContent = formatDate(new Date(year, month - 1, day), sep.value);
  };

  native.addEventListener("input", render);
  sep.addEventListener("change", render);
  render();

  load?.addEventListener("click", () => {
    const formatted = result.textContent ?? "";
    const ids: Record<string, string> = {
      ".": "demo-dot",
      "/": "demo-slash",
      "-": "demo-dash",
    };
    const input = document.querySelector<HTMLInputElement>(`#${ids[sep.value] ?? "demo-dot"}`);
    const root = input?.closest("[data-mask]");
    if (root instanceof HTMLElement) {
      syncField(root, formatted, formatted.length);
      input?.focus();
    }
  });
}

function bindTable(): void {
  const field = document.querySelector("#table-field");
  const body = document.querySelector("#spec-body");
  if (!(field instanceof HTMLElement) || !body) return;

  body.addEventListener("click", (event) => {
    const row = event.target instanceof Element ? event.target.closest("tr") : null;
    if (!row || !body.contains(row)) return;
    const before = row.dataset.before;
    const key = row.dataset.key;
    if (before === undefined || !key) return;

    const start = at(before);
    const next = apply({ ...start, key, separator: "." });
    syncField(field, next.value, next.caret);
    for (const other of body.querySelectorAll("tr")) other.removeAttribute("data-on");
    row.dataset.on = "true";
    field.querySelector("input")?.focus();
  });
}

function bindParseLive(): void {
  const input = document.querySelector<HTMLInputElement>("#parse-input");
  const output = document.querySelector("#parse-output");
  if (!input || !output) return;

  const render = () => {
    const date = parseDate(input.value);
    if (!date) {
      output.textContent = "undefined";
      return;
    }
    output.textContent = [
      `Date ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      `getMonth() ${date.getMonth()}`,
      `toString() ${date.toDateString()}`,
    ].join("\n");
  };

  input.addEventListener("input", render);
  render();
}

const scrollShell = document.querySelector("#scroll-shell");
if (scrollShell instanceof HTMLElement) {
  mountOverflowScrollGradients(scrollShell);
  mountToc(scrollShell);
}

for (const root of document.querySelectorAll<HTMLElement>("[data-mask]")) {
  bindMask(root);
}

const heroDate = document.querySelector("#hero-date");
const heroRoot = heroDate?.closest("[data-mask]");
const heroGuideDesktop = matchMedia("(min-width: 72rem) and (hover: hover) and (pointer: fine)");
if (heroDate instanceof HTMLInputElement && heroRoot instanceof HTMLElement) {
  let heroGuideMounted = false;
  const mountHeroGuide = () => {
    if (heroGuideMounted || !heroGuideDesktop.matches) return;
    heroGuideMounted = true;
    void import("./hero-guide.js").then(({ bindHeroGuide }) => {
      bindHeroGuide(heroDate, {
        press: (key, mods) => applyMaskKey(heroRoot, heroDate, key, mods),
        paste: (text) => applyMaskPaste(heroRoot, heroDate, text),
        clear: () => syncField(heroRoot, "", 0),
      });
    });
  };
  mountHeroGuide();
  heroGuideDesktop.addEventListener("change", mountHeroGuide);
}

bindCopies();
bindFolds();
bindPackageManagers();
bindFormat();
bindTable();
bindParseLive();
mountAdvancedDemos();
