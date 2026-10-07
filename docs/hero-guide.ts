export type HeroGuideDriver = {
  press(key: string): void;
  paste(text: string): void;
  clear(): void;
};

const IDLE_MS = 2500;
const DESKTOP_GUIDE = "(min-width: 72rem) and (hover: hover) and (pointer: fine)";
const WORD_FADE_MS = 680;
const WORD_STAGGER_MS = 40;
const KEY_DOWN_MS = 110;
const KEY_HELD_MS = 200;
const KEY_READ_MS = 380;
const STEP_SETTLE_MS = 520;

type KeyFace = {
  glyph: string;
  hint: string;
  punct: boolean;
  wide: boolean;
  word: boolean;
};

type Beat =
  | { kind: "say"; text: string; hold?: number }
  | { kind: "keys"; keys: readonly string[]; hold?: number }
  | { kind: "paste"; text: string; hold?: number }
  | { kind: "clear" };

const script: readonly Beat[] = [
  {
    kind: "say",
    text: "Don't know what to type? I'll show you. Type anything and I'll stop.",
    hold: 380,
  },
  { kind: "say", text: "Try a dot. There's nothing to finish yet, so it ignores you." },
  { kind: "keys", keys: ["."] },
  {
    kind: "say",
    text: "Now a 4. That can't start a day, so it turns into 04 and jumps to the month.",
  },
  { kind: "keys", keys: ["4"] },
  { kind: "say", text: "1 could still be 10 or 11, so it waits." },
  { kind: "keys", keys: ["1"] },
  {
    kind: "say",
    text: "A slash finishes the group and pads that 1. A dash would too, and the field still writes dots.",
  },
  { kind: "keys", keys: ["/"] },
  { kind: "say", text: "Backspace removes what's behind the cursor. Right now, that's the dot." },
  { kind: "keys", keys: ["Backspace"] },
  { kind: "say", text: "Dot again, then the year. Green means that day is real." },
  { kind: "keys", keys: [".", "2", "0", "2", "6"], hold: 1200 },
  { kind: "clear" },
  { kind: "say", text: "Letters don't get in. I'll type an a." },
  { kind: "keys", keys: ["a"], hold: 700 },
  { kind: "say", text: "39 isn't a day either, so the 9 never lands." },
  { kind: "keys", keys: ["3", "9"], hold: 700 },
  {
    kind: "say",
    text: "I'll make the day 31, then a 2. Months stop at 12, so February fills itself in.",
  },
  { kind: "keys", keys: ["1", "2"] },
  { kind: "say", text: "You can type 31 February. It just isn't a real day, so it stays red." },
  { kind: "keys", keys: ["2", "0", "2", "6"], hold: 1200 },
  { kind: "clear" },
  {
    kind: "say",
    text: "Pasting is fine too. 2026-12-11 gets flipped into day, month, year.",
  },
  { kind: "paste", text: "2026-12-11", hold: 1300 },
  { kind: "say", text: "Your turn.", hold: 0 },
];

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const id = window.setTimeout(finish, ms);
    const onAbort = () => {
      window.clearTimeout(id);
      finish();
    };
    function finish() {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function isTypingKey(key: string): boolean {
  return key === "Backspace" || key === "Delete" || key.length === 1;
}

function keyFace(key: string): KeyFace {
  switch (key) {
    case ".":
      return { glyph: ".", hint: "period", punct: true, wide: false, word: false };
    case "/":
      return { glyph: "/", hint: "slash", punct: true, wide: false, word: false };
    case "-":
      return { glyph: "-", hint: "dash", punct: true, wide: false, word: false };
    case "Backspace":
      return { glyph: "⌫", hint: "backspace", punct: false, wide: true, word: false };
    case "Delete":
      return { glyph: "⌦", hint: "delete", punct: false, wide: true, word: false };
    case "paste":
      return { glyph: "paste", hint: "", punct: false, wide: true, word: true };
    default:
      return { glyph: key, hint: "", punct: false, wide: false, word: false };
  }
}

function revealMs(words: number, reduced: boolean): number {
  if (reduced || words <= 0) return 0;
  return WORD_FADE_MS + (words - 1) * WORD_STAGGER_MS;
}

export function bindHeroGuide(input: HTMLInputElement, driver: HeroGuideDriver): void {
  if (!matchMedia(DESKTOP_GUIDE).matches) return;

  const hero = input.closest(".hero");
  const coach = hero?.querySelector("#hero-coach");
  const visual = coach?.querySelector(".coach-text");
  const live = coach?.querySelector(".coach-live");
  const key = coach?.querySelector(".coach-key");
  const keycap = key?.querySelector(".coach-keycap");
  const glyph = key?.querySelector(".coach-key-glyph");
  const hint = key?.querySelector(".coach-key-hint");
  const next = coach?.querySelector(".coach-next");
  if (
    !(hero instanceof HTMLElement) ||
    !(coach instanceof HTMLElement) ||
    !(visual instanceof HTMLElement) ||
    !(live instanceof HTMLElement) ||
    !(key instanceof HTMLElement) ||
    !(keycap instanceof HTMLElement) ||
    !(glyph instanceof HTMLElement) ||
    !(hint instanceof HTMLElement) ||
    !(next instanceof HTMLButtonElement)
  ) {
    return;
  }
  mountGuide(input, driver, hero, coach, visual, live, key, keycap, glyph, hint, next);
}

function mountGuide(
  input: HTMLInputElement,
  driver: HeroGuideDriver,
  hero: HTMLElement,
  coach: HTMLElement,
  visual: HTMLElement,
  live: HTMLElement,
  keyEl: HTMLElement,
  keycap: HTMLElement,
  glyph: HTMLElement,
  hint: HTMLElement,
  next: HTMLButtonElement,
): void {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const settleMs = reduced ? 180 : STEP_SETTLE_MS;
  const desktop = matchMedia(DESKTOP_GUIDE);

  let waitTimer = 0;
  let showFrame = 0;
  let running = false;
  let settled = false;
  let visible = false;
  let owned = false;
  let abort: AbortController | undefined;

  function showCoach(): void {
    visible = true;
    coach.hidden = false;
    visual.replaceChildren();
    live.textContent = "";
    hideKey();
    hideNext();
    hero.classList.add("is-coaching");
    if (reduced) {
      coach.classList.add("is-in");
      return;
    }
    showFrame = requestAnimationFrame(() => coach.classList.add("is-in"));
  }

  function hideCoach(): void {
    visible = false;
    cancelAnimationFrame(showFrame);
    coach.classList.remove("is-in");
    hero.classList.remove("is-coaching");
    hideKey();
    hideNext();
    const finish = () => {
      if (coach.classList.contains("is-in")) return;
      coach.hidden = true;
      visual.replaceChildren();
      live.textContent = "";
      hideKey();
      hideNext();
    };
    if (reduced || coach.hidden) {
      finish();
      return;
    }
    const onEnd = (event: TransitionEvent) => {
      if (event.target !== coach || event.propertyName !== "opacity") return;
      coach.removeEventListener("transitionend", onEnd);
      finish();
    };
    coach.addEventListener("transitionend", onEnd);
    window.setTimeout(() => {
      coach.removeEventListener("transitionend", onEnd);
      finish();
    }, 240);
  }

  function paintKey(face: KeyFace): void {
    glyph.textContent = face.glyph;
    hint.textContent = face.hint;
    keycap.dataset.punct = face.punct ? "true" : "false";
    keycap.dataset.wide = face.wide ? "true" : "false";
    keycap.dataset.word = face.word ? "true" : "false";
  }

  function hideKey(): void {
    keyEl.classList.remove("is-shown", "is-down");
  }

  function hideNext(): void {
    next.classList.remove("is-shown");
    next.hidden = true;
  }

  function waitForNext(signal: AbortSignal): Promise<boolean> {
    if (signal.aborted) return Promise.resolve(false);
    next.hidden = false;
    if (reduced) next.classList.add("is-shown");
    else requestAnimationFrame(() => next.classList.add("is-shown"));
    return new Promise((resolve) => {
      const finish = (continued: boolean) => {
        signal.removeEventListener("abort", onAbort);
        next.removeEventListener("click", onClick);
        hideNext();
        resolve(continued);
      };
      const onAbort = () => finish(false);
      const onClick = () => finish(true);
      next.addEventListener("click", onClick);
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  function renderWords(text: string): number {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const fragment = document.createDocumentFragment();
    words.forEach((word, index) => {
      const span = document.createElement("span");
      span.className = "coach-word";
      span.style.setProperty("--i", String(index));
      span.textContent = word;
      fragment.append(span);
      if (index < words.length - 1) fragment.append(" ");
    });
    visual.replaceChildren(fragment);
    live.textContent = text;
    return words.length;
  }

  async function strikeKey(signal: AbortSignal): Promise<boolean> {
    keyEl.classList.add("is-shown");
    keyEl.classList.remove("is-down");
    if (!reduced) {
      void keycap.offsetWidth;
      keyEl.classList.add("is-down");
      await wait(KEY_DOWN_MS, signal);
      if (signal.aborted) return false;
    }
    return true;
  }

  function dismiss(leaveOwned: boolean): void {
    const clearOwned = leaveOwned && owned;
    settled = true;
    owned = false;
    window.clearTimeout(waitTimer);
    abort?.abort();
    running = false;
    hideCoach();
    if (clearOwned) driver.clear();
  }

  function armWait(): void {
    if (settled || running || input.value !== "" || document.activeElement !== input) return;
    window.clearTimeout(waitTimer);
    waitTimer = window.setTimeout(() => {
      void run();
    }, IDLE_MS);
  }

  async function playBeat(beat: Beat, signal: AbortSignal): Promise<void> {
    switch (beat.kind) {
      case "say": {
        const keyWasShown = keyEl.classList.contains("is-shown");
        hideKey();
        if (keyWasShown && !reduced) await wait(140, signal);
        if (signal.aborted) return;
        const words = renderWords(beat.text);
        if (signal.aborted) return;
        await wait(revealMs(words, reduced) + (beat.hold ?? 280), signal);
        return;
      }
      case "keys": {
        for (const key of beat.keys) {
          if (signal.aborted) return;
          const arriving = !keyEl.classList.contains("is-shown");
          paintKey(keyFace(key));
          if (!reduced) {
            keyEl.classList.add("is-shown");
            await wait(arriving ? 170 : 90, signal);
            if (signal.aborted) return;
          }
          const struck = await strikeKey(signal);
          if (!struck) return;
          driver.press(key);
          await wait(reduced ? 70 : KEY_HELD_MS, signal);
          if (signal.aborted) return;
          keyEl.classList.remove("is-down");
          await wait(reduced ? 40 : KEY_READ_MS, signal);
        }
        if (signal.aborted) return;
        await wait(settleMs, signal);
        return;
      }
      case "paste": {
        if (signal.aborted) return;
        paintKey(keyFace("paste"));
        keyEl.classList.add("is-shown");
        if (!reduced) await wait(160, signal);
        if (signal.aborted) return;
        const struck = await strikeKey(signal);
        if (!struck) return;
        driver.paste(beat.text);
        await wait(reduced ? 80 : KEY_HELD_MS, signal);
        if (signal.aborted) return;
        keyEl.classList.remove("is-down");
        await wait(settleMs, signal);
        return;
      }
      case "clear": {
        if (signal.aborted) return;
        hideKey();
        driver.clear();
        await wait(reduced ? 180 : 280, signal);
        return;
      }
      default: {
        const _exhaustive: never = beat;
        return _exhaustive;
      }
    }
  }

  async function run(): Promise<void> {
    if (settled || running || input.value !== "" || document.activeElement !== input) return;
    if (!desktop.matches) return;
    running = true;
    owned = true;
    const controller = new AbortController();
    abort = controller;
    showCoach();
    try {
      let index = 0;
      while (index < script.length) {
        if (controller.signal.aborted) return;
        const beat = script[index];
        if (!beat) return;
        await playBeat(beat, controller.signal);
        if (controller.signal.aborted) return;
        index += 1;
        if (beat.kind !== "say") continue;
        while (index < script.length) {
          const action = script[index];
          if (!action || action.kind === "say") break;
          await playBeat(action, controller.signal);
          if (controller.signal.aborted) return;
          index += 1;
        }
        if (index >= script.length) break;
        const continued = await waitForNext(controller.signal);
        if (!continued) return;
      }
    } finally {
      running = false;
      if (!controller.signal.aborted) {
        settled = true;
        owned = false;
      }
    }
  }

  input.addEventListener("focus", () => {
    armWait();
  });

  input.addEventListener("blur", (event) => {
    const nextFocus = event.relatedTarget;
    if (nextFocus instanceof Node && (nextFocus === next || next.contains(nextFocus))) return;
    hero.classList.remove("is-engaged");
    window.clearTimeout(waitTimer);
    if (owned) dismiss(true);
  });

  next.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  next.addEventListener("blur", () => {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (active === input || active === next || (active instanceof Node && next.contains(active))) return;
      if (owned) dismiss(true);
    }, 0);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Tab") return;
    if (!running && !visible) {
      if (event.metaKey || event.ctrlKey || event.altKey || !isTypingKey(event.key)) return;
      hero.classList.add("is-engaged");
      window.clearTimeout(waitTimer);
      if (input.value === "") armWait();
      return;
    }
    if (event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta") {
      return;
    }
    hero.classList.add("is-engaged");
    owned = false;
    dismiss(false);
  });

  input.addEventListener("paste", () => {
    if (running || visible) {
      hero.classList.add("is-engaged");
      owned = false;
      dismiss(false);
      return;
    }
    window.clearTimeout(waitTimer);
    if (input.value === "") armWait();
  });

  desktop.addEventListener("change", () => {
    if (!desktop.matches) dismiss(true);
  });
}
