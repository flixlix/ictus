import { apply, formatDate, isDateMaskKey, parseDate } from "../src/index.js";

function show(value: string, caret: number): string {
  return `${value.slice(0, caret)}|${value.slice(caret)}`;
}

function at(marked: string): { value: string; caret: number } {
  const caret = marked.indexOf("|");
  return { value: marked.replace("|", ""), caret };
}

function parseKind(masked: string): { kind: "valid" | "invalid" | "incomplete"; label: string } {
  const date = parseDate(masked);
  if (date) {
    const label = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
    return { kind: "valid", label };
  }
  if (/^\d{2}[./-]\d{2}[./-]\d{4}$/.test(masked)) {
    return { kind: "invalid", label: "not a calendar date" };
  }
  return { kind: "incomplete", label: "incomplete" };
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
    const parsed = parseKind(value);
    parseEl.dataset.kind = parsed.kind;
    parseEl.textContent = parsed.label;
  }
  if (hintEl) hintEl.textContent = hint;
}

function bindMask(root: HTMLElement): void {
  const input = root.querySelector("input");
  if (!(input instanceof HTMLInputElement)) return;
  const separator = root.dataset.separator || ".";
  syncField(root, input.value, input.selectionStart ?? input.value.length);

  input.addEventListener("keydown", (event) => {
    if (!isDateMaskKey(event.key)) return;
    event.preventDefault();
    const caret = input.selectionStart ?? 0;
    const next = apply({
      value: input.value,
      caret,
      selectionEnd: input.selectionEnd ?? undefined,
      key: event.key,
      separator,
    });
    const ignored =
      next.value === input.value &&
      next.caret === caret &&
      event.key !== "Backspace" &&
      event.key !== "Delete";
    syncField(root, next.value, next.caret, ignored ? "ignored" : "");
  });

  input.addEventListener("click", () => {
    syncField(root, input.value, input.selectionStart ?? 0);
  });
}

function bindCopies(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy], [data-copy-target]")) {
    button.addEventListener("click", async () => {
      const direct = button.dataset.copy;
      const targetId = button.dataset.copyTarget;
      const target = targetId ? document.getElementById(targetId) : null;
      const text = direct ?? target?.textContent ?? "";
      await navigator.clipboard.writeText(text);
      button.dataset.copied = "true";
      const previous = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.dataset.copied = "false";
        button.textContent = previous;
      }, 1200);
    });
  }
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

for (const root of document.querySelectorAll<HTMLElement>("[data-mask]")) {
  bindMask(root);
}

bindCopies();
bindFormat();
bindTable();
bindParseLive();
