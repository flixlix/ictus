function layer(
  background: string,
  mask: string,
  backdropFilter: string,
  className = "",
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `overflow-scroll-gradient__layer ${className}`.trim();
  el.style.backdropFilter = backdropFilter;
  el.style.background = background;
  el.style.mask = mask;
  el.style.webkitMask = mask;
  return el;
}

export function createOverflowTopScrollGradient(): HTMLDivElement {
  const root = document.createElement("div");
  root.className = "overflow-scroll-gradient overflow-scroll-gradient--top";
  root.setAttribute("aria-hidden", "true");

  const steps: Array<[number, number, number, number]> = [
    [0.1, 1, 70, 100],
    [0.2, 1, 50, 80],
    [0.3, 1, 40, 70],
    [0.4, 1.5, 30, 60],
    [0.5, 2, 20, 50],
    [0.6, 3, 10, 40],
    [0.7, 4, 0, 30],
  ];

  for (const [alpha, blur, solidEnd, fadeEnd] of steps) {
    const mask =
      fadeEnd === 30
        ? `linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) ${fadeEnd}%)`
        : `linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) ${solidEnd}%, rgba(0, 0, 0, 0) ${fadeEnd}%)`;
    root.append(
      layer(
        `linear-gradient(to bottom, hsl(var(--background) / ${alpha}), transparent)`,
        mask,
        `blur(${blur}px)`,
      ),
    );
  }

  const wash = document.createElement("div");
  wash.className = "overflow-scroll-gradient__wash overflow-scroll-gradient__wash--top";
  root.append(wash);
  return root;
}

export function createOverflowBottomScrollGradient(): HTMLDivElement {
  const root = document.createElement("div");
  root.className = "overflow-scroll-gradient overflow-scroll-gradient--bottom";
  root.setAttribute("aria-hidden", "true");

  const steps: Array<[number, number, number, number]> = [
    [0.1, 1, 70, 100],
    [0.2, 1, 50, 80],
    [0.3, 1, 40, 70],
    [0.4, 1.5, 30, 60],
    [0.5, 2, 20, 50],
    [0.6, 3, 10, 40],
    [0.7, 4, 0, 30],
  ];

  for (const [alpha, blur, solidEnd, fadeEnd] of steps) {
    const mask =
      fadeEnd === 30
        ? `linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) ${fadeEnd}%)`
        : `linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) ${solidEnd}%, rgba(0, 0, 0, 0) ${fadeEnd}%)`;
    root.append(
      layer(
        `linear-gradient(to top, hsl(var(--background) / ${alpha}), transparent)`,
        mask,
        `blur(${blur}px)`,
        "overflow-scroll-gradient__layer--bottom",
      ),
    );
  }

  const wash = document.createElement("div");
  wash.className = "overflow-scroll-gradient__wash overflow-scroll-gradient__wash--bottom";
  root.append(wash);

  const bar = document.createElement("div");
  bar.className = "overflow-scroll-gradient__bar";
  root.append(bar);
  return root;
}

export function mountOverflowScrollGradients(shell: HTMLElement): void {
  const page = shell.querySelector(".page");
  if (!(page instanceof HTMLElement)) return;
  shell.insertBefore(createOverflowTopScrollGradient(), page);
  shell.append(createOverflowBottomScrollGradient());
}
