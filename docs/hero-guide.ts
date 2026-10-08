import { track } from "./analytics.js";

export type HeroGuideKeyMods = {
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

export type HeroGuideDriver = {
  press(key: string, mods?: HeroGuideKeyMods): void;
  paste(text: string): void;
  clear(): void;
};

const DESKTOP_GUIDE = "(min-width: 72rem) and (hover: hover) and (pointer: fine)";
const WORD_FADE_MS = 680;
const WORD_STAGGER_MS = 40;
const KEY_DOWN_MS = 110;
const KEY_HELD_MS = 200;
const KEY_READ_MS = 380;
const STEP_SETTLE_MS = 520;
const GUIDE_MEMORY_KEY = "ictus-hero-guide";

type KeyFace = {
  glyph: string;
  hint: string;
  punct: boolean;
  wide: boolean;
  word: boolean;
};

type Beat =
  | { kind: "say"; id: string; text: string; hold?: number; finale?: boolean }
  | { kind: "keys"; keys: readonly string[]; hold?: number }
  | { kind: "paste"; text: string; hold?: number }
  | { kind: "clear" };

const coreScript: readonly Beat[] = [
  {
    kind: "say",
    id: "intro",
    text: "I'll tap through a few keys. Type anytime to take over.",
    hold: 380,
  },
  {
    kind: "say",
    id: "ignore-dot",
    text: "Try a dot. There's nothing to finish yet, so it ignores you.",
  },
  { kind: "keys", keys: ["."] },
  {
    kind: "say",
    id: "pad-day",
    text: "Now a 4. That can't start a day, so it turns into 04 and jumps to the month.",
  },
  { kind: "keys", keys: ["4"] },
  {
    kind: "say",
    id: "finish-group",
    text: "1 could still be 10 or 11, so it waits. A slash finishes the group and pads that 1.",
  },
  { kind: "keys", keys: ["1", "/"] },
  {
    kind: "say",
    id: "backspace",
    text: "Backspace removes what's behind the cursor. Right now, that's the dot.",
  },
  { kind: "keys", keys: ["Backspace"] },
  {
    kind: "say",
    id: "valid-date",
    text: "Dot again, then the year. Green means that day is real.",
  },
  { kind: "keys", keys: [".", "2", "0", "2", "6"], hold: 1200 },
  {
    kind: "say",
    id: "core-done",
    text: "That's the basics. Your turn, or keep going for a few more tricks.",
    hold: 0,
    finale: true,
  },
];

const moreScript: readonly Beat[] = [
  { kind: "clear" },
  {
    kind: "say",
    id: "letters",
    text: "Letters don't get in. I'll type an a.",
  },
  { kind: "keys", keys: ["a"], hold: 700 },
  {
    kind: "say",
    id: "spill",
    text: "39 isn't a day. The 3 becomes 03, and the 9 moves into the month.",
  },
  { kind: "keys", keys: ["3", "9"], hold: 700 },
  { kind: "clear" },
  {
    kind: "say",
    id: "month-overflow",
    text: "I'll type 31, then a 2. Months stop at 12, so February fills itself in.",
  },
  { kind: "keys", keys: ["3", "1", "2"] },
  {
    kind: "say",
    id: "invalid-day",
    text: "You can type 31 February. It just isn't a real day, so it stays red.",
  },
  { kind: "keys", keys: ["2", "0", "2", "6"], hold: 1200 },
  { kind: "clear" },
  {
    kind: "say",
    id: "paste",
    text: "Pasting is fine too. 2026-12-11 gets flipped into day, month, year.",
  },
  { kind: "paste", text: "2026-12-11", hold: 1300 },
  {
    kind: "say",
    id: "ctrl-backspace",
    text: "Hold Ctrl or Cmd and press Backspace to clear a whole part, like the year.",
  },
  { kind: "keys", keys: ["Ctrl+Backspace"], hold: 700 },
  {
    kind: "say",
    id: "shift-backspace",
    text: "Shift and Backspace clears the whole field.",
  },
  { kind: "keys", keys: ["Shift+Backspace"], hold: 700 },
  {
    kind: "say",
    id: "more-done",
    text: "Your turn.",
    hold: 0,
    finale: true,
  },
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
  return (
    key === "Backspace" ||
    key === "Delete" ||
    key === "Ctrl+Backspace" ||
    key === "Shift+Backspace" ||
    key.length === 1
  );
}

function parseGuideKey(raw: string): { key: string; mods: HeroGuideKeyMods } {
  switch (raw) {
    case "Ctrl+Backspace":
      return { key: "Backspace", mods: { ctrlKey: true } };
    case "Shift+Backspace":
      return { key: "Backspace", mods: { shiftKey: true } };
    default:
      return { key: raw, mods: {} };
  }
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
    case "Ctrl+Backspace":
      return { glyph: "⌃⌫", hint: "ctrl backspace", punct: false, wide: true, word: false };
    case "Shift+Backspace":
      return { glyph: "⇧⌫", hint: "shift backspace", punct: false, wide: true, word: false };
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

function countSaySteps(script: readonly Beat[]): number {
  return script.filter((beat) => beat.kind === "say" && !beat.finale).length;
}

function readGuideMemory(): string | null {
  try {
    return sessionStorage.getItem(GUIDE_MEMORY_KEY);
  } catch {
    return null;
  }
}

function writeGuideMemory(value: string): void {
  try {
    sessionStorage.setItem(GUIDE_MEMORY_KEY, value);
  } catch {
    return;
  }
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
  const progress = coach?.querySelector(".coach-progress");
  const next = coach?.querySelector(".coach-next");
  const skip = coach?.querySelector(".coach-skip");
  const trySelf = coach?.querySelector(".coach-try");
  const more = coach?.querySelector(".coach-more");
  const replay = coach?.querySelector(".coach-replay");
  const start = hero?.querySelector("#hero-guide-start");
  const launch = hero?.querySelector(".hero-guide-launch");
  if (
    !(hero instanceof HTMLElement) ||
    !(coach instanceof HTMLElement) ||
    !(visual instanceof HTMLElement) ||
    !(live instanceof HTMLElement) ||
    !(key instanceof HTMLElement) ||
    !(keycap instanceof HTMLElement) ||
    !(glyph instanceof HTMLElement) ||
    !(hint instanceof HTMLElement) ||
    !(progress instanceof HTMLElement) ||
    !(next instanceof HTMLButtonElement) ||
    !(skip instanceof HTMLButtonElement) ||
    !(trySelf instanceof HTMLButtonElement) ||
    !(more instanceof HTMLButtonElement) ||
    !(replay instanceof HTMLButtonElement) ||
    !(start instanceof HTMLButtonElement) ||
    !(launch instanceof HTMLElement)
  ) {
    return;
  }
  mountGuide(
    input,
    driver,
    hero,
    coach,
    visual,
    live,
    key,
    keycap,
    glyph,
    hint,
    progress,
    next,
    skip,
    trySelf,
    more,
    replay,
    start,
    launch,
  );
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
  progress: HTMLElement,
  next: HTMLButtonElement,
  skip: HTMLButtonElement,
  trySelf: HTMLButtonElement,
  more: HTMLButtonElement,
  replay: HTMLButtonElement,
  start: HTMLButtonElement,
  launch: HTMLElement,
): void {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const settleMs = reduced ? 180 : STEP_SETTLE_MS;
  const desktop = matchMedia(DESKTOP_GUIDE);

  let showFrame = 0;
  let running = false;
  let visible = false;
  let owned = false;
  let path: "core" | "more" = "core";
  let stepIndex = 0;
  let stepTotal = countSaySteps(coreScript);
  let abort: AbortController | undefined;
  let finaleResolver: ((choice: "done" | "more" | "replay" | "try") => void) | undefined;

  function syncLaunch(): void {
    const memory = readGuideMemory();
    const seen = memory === "done" || memory === "skipped";
    start.textContent = seen ? "Replay guide" : "Quick guide";
    launch.hidden = !desktop.matches || running || visible;
    launch.dataset.seen = seen ? "true" : "false";
  }

  function showCoach(): void {
    visible = true;
    launch.hidden = true;
    coach.hidden = false;
    visual.replaceChildren();
    live.textContent = "";
    hideKey();
    hideTourActions();
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
    hideTourActions();
    const finish = () => {
      if (coach.classList.contains("is-in")) return;
      coach.hidden = true;
      visual.replaceChildren();
      live.textContent = "";
      hideKey();
      hideTourActions();
      syncLaunch();
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

  function hideTourActions(): void {
    for (const button of [next, skip, trySelf, more, replay]) {
      button.classList.remove("is-shown");
      button.hidden = true;
    }
    progress.hidden = true;
    progress.textContent = "";
  }

  function showButton(button: HTMLButtonElement): void {
    button.hidden = false;
    if (reduced) button.classList.add("is-shown");
    else requestAnimationFrame(() => button.classList.add("is-shown"));
  }

  function setProgress(current: number, total: number): void {
    if (total <= 0) {
      progress.hidden = true;
      progress.textContent = "";
      return;
    }
    progress.hidden = false;
    progress.textContent = `${current} of ${total}`;
  }

  function waitForNext(signal: AbortSignal): Promise<boolean> {
    if (signal.aborted) return Promise.resolve(false);
    showButton(next);
    showButton(skip);
    showButton(trySelf);
    return new Promise((resolve) => {
      const finish = (continued: boolean) => {
        signal.removeEventListener("abort", onAbort);
        next.removeEventListener("click", onClick);
        hideTourActions();
        resolve(continued);
      };
      const onAbort = () => finish(false);
      const onClick = () => finish(true);
      next.addEventListener("click", onClick);
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  function waitForFinale(signal: AbortSignal): Promise<"done" | "more" | "replay" | "try"> {
    if (signal.aborted) return Promise.resolve("done");
    progress.hidden = true;
    showButton(trySelf);
    showButton(replay);
    if (path === "core") showButton(more);
    return new Promise<"done" | "more" | "replay" | "try">((resolve) => {
      const finish = (choice: "done" | "more" | "replay" | "try") => {
        signal.removeEventListener("abort", onAbort);
        finaleResolver = undefined;
        hideTourActions();
        resolve(choice);
      };
      const onAbort = () => finish("done");
      finaleResolver = finish;
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

  function dismiss(reason: string, leaveOwned: boolean): void {
    const clearOwned = leaveOwned && owned;
    const wasActive = running || visible;
    const step = String(Math.max(stepIndex, 1));
    owned = false;
    abort?.abort();
    running = false;
    finaleResolver?.("done");
    finaleResolver = undefined;
    hideCoach();
    if (clearOwned) driver.clear();
    if (wasActive && readGuideMemory() !== "done") {
      writeGuideMemory("skipped");
      track("guide_skip", { reason, step, path });
    }
    syncLaunch();
  }

  async function playBeat(beat: Beat, signal: AbortSignal): Promise<void> {
    switch (beat.kind) {
      case "say": {
        const keyWasShown = keyEl.classList.contains("is-shown");
        hideKey();
        if (keyWasShown && !reduced) await wait(140, signal);
        if (signal.aborted) return;
        if (!beat.finale) {
          stepIndex += 1;
          setProgress(stepIndex, stepTotal);
          track("guide_step", {
            step: String(stepIndex),
            total: String(stepTotal),
            id: beat.id,
            path,
          });
        }
        const words = renderWords(beat.text);
        if (signal.aborted) return;
        await wait(revealMs(words, reduced) + (beat.hold ?? 280), signal);
        return;
      }
      case "keys": {
        for (const raw of beat.keys) {
          if (signal.aborted) return;
          const arriving = !keyEl.classList.contains("is-shown");
          const { key, mods } = parseGuideKey(raw);
          paintKey(keyFace(raw));
          if (!reduced) {
            keyEl.classList.add("is-shown");
            await wait(arriving ? 170 : 90, signal);
            if (signal.aborted) return;
          }
          const struck = await strikeKey(signal);
          if (!struck) return;
          driver.press(key, mods);
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

  async function run(script: readonly Beat[], nextPath: "core" | "more", source: string): Promise<void> {
    if (running || !desktop.matches) return;
    running = true;
    owned = true;
    path = nextPath;
    stepIndex = 0;
    stepTotal = countSaySteps(script);
    const controller = new AbortController();
    abort = controller;
    let handoff = false;
    showCoach();
    track("guide_start", { path, source });
    input.focus();
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
        if (beat.finale) {
          writeGuideMemory("done");
          track("guide_complete", { path });
          const choice = await waitForFinale(controller.signal);
          if (controller.signal.aborted) return;
          if (choice === "more" || choice === "replay") {
            handoff = true;
            track(choice === "more" ? "guide_more" : "guide_replay", { from: path });
            driver.clear();
            running = false;
            await run(
              choice === "more" ? moreScript : coreScript,
              choice === "more" ? "more" : "core",
              choice,
            );
            return;
          }
          owned = false;
          hideCoach();
          return;
        }
        if (index >= script.length) break;
        const continued = await waitForNext(controller.signal);
        if (!continued) return;
      }
      writeGuideMemory("done");
      track("guide_complete", { path });
      owned = false;
      hideCoach();
    } finally {
      if (!handoff && abort === controller) {
        running = false;
        syncLaunch();
      }
    }
  }

  start.addEventListener("click", () => {
    const source = readGuideMemory() ? "replay" : "cta";
    void run(coreScript, "core", source);
  });

  skip.addEventListener("click", () => {
    dismiss("skip", true);
  });

  trySelf.addEventListener("click", () => {
    if (finaleResolver) {
      finaleResolver("try");
      return;
    }
    dismiss("try_yourself", false);
  });

  more.addEventListener("click", () => {
    finaleResolver?.("more");
  });

  replay.addEventListener("click", () => {
    finaleResolver?.("replay");
  });

  input.addEventListener("focus", () => {
    hero.classList.add("is-engaged");
  });

  input.addEventListener("blur", (event) => {
    const nextFocus = event.relatedTarget;
    if (
      nextFocus instanceof Node &&
      (coach.contains(nextFocus) || launch.contains(nextFocus) || nextFocus === start)
    ) {
      return;
    }
    if (owned) {
      if (!(nextFocus instanceof Node) || nextFocus === document.body) {
        requestAnimationFrame(() => {
          if (owned) input.focus({ preventScroll: true });
        });
        return;
      }
      hero.classList.remove("is-engaged");
      dismiss("blur", true);
      return;
    }
    hero.classList.remove("is-engaged");
  });

  for (const button of [next, skip, trySelf, more, replay, start]) {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
  }

  input.addEventListener("keydown", (event) => {
    if (event.key === "Tab") return;
    if (!running && !visible) {
      if (event.metaKey || event.ctrlKey || event.altKey || !isTypingKey(event.key)) return;
      hero.classList.add("is-engaged");
      return;
    }
    if (event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta") {
      return;
    }
    hero.classList.add("is-engaged");
    owned = false;
    dismiss("type", false);
  });

  input.addEventListener("paste", () => {
    if (running || visible) {
      hero.classList.add("is-engaged");
      owned = false;
      dismiss("type", false);
    }
  });

  desktop.addEventListener("change", () => {
    if (!desktop.matches) dismiss("viewport", true);
    syncLaunch();
  });

  syncLaunch();
}
