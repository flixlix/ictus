function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Tabs = {
  bar: HTMLElement;
  links: HTMLAnchorElement[];
  highlight: HTMLElement;
  headingIndex: number[];
};

function createTabs(headings: HTMLHeadingElement[]): Tabs {
  const bar = document.createElement("nav");
  bar.className = "tabbar";
  bar.setAttribute("aria-label", "Sections");

  const list = document.createElement("div");
  list.className = "tabbar-list";
  // A second, identically laid-out copy styled as "active" sits on top and is clipped to the
  // current tab. Moving the clip slides the highlight without measuring or resizing anything.
  const highlight = document.createElement("div");
  highlight.className = "tabbar-list tabbar-highlight";
  highlight.setAttribute("aria-hidden", "true");

  const links: HTMLAnchorElement[] = [];
  const headingIndex: number[] = [];
  headings.forEach((heading, index) => {
    if (heading.tagName !== "H2") return;
    const label = heading.dataset.short ?? heading.textContent ?? "";
    const link = document.createElement("a");
    link.className = "tabbar-tab";
    link.href = `#${heading.id}`;
    link.textContent = label;
    list.append(link);
    links.push(link);
    headingIndex.push(index);

    const ghost = document.createElement("span");
    ghost.className = "tabbar-tab";
    ghost.textContent = label;
    highlight.append(ghost);
  });

  bar.append(list, highlight);
  return { bar, links, highlight, headingIndex };
}

export function mountToc(shell: HTMLElement): void {
  const page = shell.querySelector(".page");
  if (!(page instanceof HTMLElement)) return;

  const headings = [...page.querySelectorAll<HTMLHeadingElement>("h2, h3")];
  if (headings.length === 0) return;

  const nav = document.createElement("nav");
  nav.className = "toc";
  nav.setAttribute("aria-label", "On this page");

  const title = document.createElement("p");
  title.className = "toc-title";
  title.textContent = "On this page";

  const list = document.createElement("ol");
  list.className = "toc-list";

  const svgNs = "http://www.w3.org/2000/svg";
  const rail = document.createElementNS(svgNs, "svg");
  rail.classList.add("toc-rail");
  rail.setAttribute("aria-hidden", "true");
  const track = document.createElementNS(svgNs, "path");
  track.classList.add("toc-track");
  const indicator = document.createElementNS(svgNs, "path");
  indicator.classList.add("toc-indicator");
  rail.append(track, indicator);

  const links: HTMLAnchorElement[] = [];
  let section = "";
  for (const heading of headings) {
    if (heading.tagName === "H2") section = heading.id || slug(heading.textContent ?? "");
    // Demo and API sections both have a "formatDate" heading, so generated ids are scoped to their h2.
    if (!heading.id) heading.id = `${section}-${slug(heading.textContent ?? "")}`;

    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent;
    link.className = heading.tagName === "H3" ? "toc-link toc-link--sub" : "toc-link";

    const item = document.createElement("li");
    item.append(link);
    list.append(item);
    links.push(link);
  }

  list.append(rail);
  nav.append(title, list);
  shell.append(nav);

  const tabs = createTabs(headings);
  shell.append(tabs.bar);

  let activeTab = -1;
  const setActiveTab = (headingIdx: number) => {
    let tab = -1;
    tabs.headingIndex.forEach((h, i) => {
      if (h <= headingIdx) tab = i;
    });
    if (tab === activeTab) return;
    tabs.links[activeTab]?.removeAttribute("aria-current");
    activeTab = tab;
    const link = tabs.links[tab];
    if (!link) {
      tabs.highlight.style.opacity = "0";
      return;
    }
    link.setAttribute("aria-current", "location");
    placeIndicator();
    const left = link.offsetLeft - tabs.highlight.offsetLeft;
    const right = tabs.highlight.offsetWidth - left - link.offsetWidth;
    tabs.highlight.style.clipPath = `inset(0 ${right}px 0 ${left}px round 999px)`;
    tabs.highlight.style.opacity = "1";
  };

  // Each link's span along the rail path, so the indicator is a dash that slides along it.
  let spans: { start: number; end: number }[] = [];
  let railLength = 0;
  const layoutRail = () => {
    const topLink = links.find((l) => !l.classList.contains("toc-link--sub"));
    const subLink = links.find((l) => l.classList.contains("toc-link--sub"));
    // Indent the rail by the same amount sub links indent their text.
    const indent =
      topLink && subLink
        ? parseFloat(getComputedStyle(subLink).paddingLeft) - parseFloat(getComputedStyle(topLink).paddingLeft)
        : 0;
    const xs = links.map((l) => (l.classList.contains("toc-link--sub") ? indent + 1 : 1));
    const bend = 6;

    let d = "";
    // Curves have no closed-form length, so measure the path as it is built.
    const measure = () => {
      track.setAttribute("d", d);
      return track.getTotalLength();
    };

    spans = links.map((link, i) => {
      const x = xs[i] ?? 1;
      const prevX = xs[i - 1];
      const top = link.offsetTop + (prevX !== undefined && prevX !== x ? bend : 0);
      const bottom = link.offsetTop + link.offsetHeight - (i < xs.length - 1 && xs[i + 1] !== x ? bend : 0);
      if (!d) d = `M${x} ${top}`;
      else if (prevX !== x) {
        // S-curve with vertical tangents at both ends, so the step reads as one smooth bend.
        d += `C${prevX} ${link.offsetTop} ${x} ${link.offsetTop} ${x} ${top}`;
      } else d += `L${x} ${top}`;
      const start = measure();
      d += `L${x} ${bottom}`;
      return { start, end: measure() };
    });
    railLength = spans.at(-1)?.end ?? 0;

    rail.setAttribute("width", String(indent + 2));
    rail.setAttribute("height", String(list.scrollHeight));
    indicator.setAttribute("d", d);
  };

  const placeIndicator = () => {
    const span = spans[active];
    if (!span) return;
    indicator.style.strokeDasharray = `${span.end - span.start} ${railLength}`;
    indicator.style.strokeDashoffset = String(-span.start);
    indicator.style.opacity = "1";
  };

  let active = -1;
  const setActive = (index: number) => {
    setActiveTab(index);
    if (index === active) return;
    links[active]?.removeAttribute("aria-current");
    active = index;
    const link = links[index];
    if (!link) return;
    link.setAttribute("aria-current", "location");
    placeIndicator();

    // Scroll the list by hand: scrollIntoView would also scroll the page shell the nav lives in.
    if (link.offsetTop < list.scrollTop) {
      list.scrollTop = link.offsetTop;
    } else if (link.offsetTop + link.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = link.offsetTop + link.offsetHeight - list.clientHeight;
    }
  };

  // Match the line headings land on when clicked (their scroll-margin-top), plus a little slack.
  const offset = (parseFloat(getComputedStyle(headings[0] as Element).scrollMarginTop) || 0) + 8;

  const update = () => {
    const anchor = shell.getBoundingClientRect().top + offset;
    const atBottom = shell.scrollTop + shell.clientHeight >= shell.scrollHeight - 2;
    let index = 0;
    if (atBottom) {
      index = headings.length - 1;
    } else {
      for (let i = 0; i < headings.length; i++) {
        if ((headings[i]?.getBoundingClientRect().top ?? Infinity) <= anchor) index = i;
        else break;
      }
    }
    setActive(index);
  };

  // After a click, hold the clicked entry until scrolling settles. Headings near the end of the
  // page can't scroll up to the anchor line, so position alone would pick a different one.
  let locked = false;
  let unlock = 0;
  const holdUntilIdle = () => {
    window.clearTimeout(unlock);
    unlock = window.setTimeout(() => {
      locked = false;
    }, 150);
  };

  const jumpTo = (index: number) => {
    locked = true;
    setActive(index);
    holdUntilIdle();
  };
  links.forEach((link, index) => link.addEventListener("click", () => jumpTo(index)));
  tabs.links.forEach((link, i) => link.addEventListener("click", () => jumpTo(tabs.headingIndex[i] ?? 0)));

  let frame = 0;
  const schedule = () => {
    if (locked) {
      holdUntilIdle();
      return;
    }
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  shell.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", () => {
    layoutRail();
    const current = active;
    active = -1;
    activeTab = -1;
    setActive(current);
    schedule();
  });
  layoutRail();
  void document.fonts.ready.then(() => {
    layoutRail();
    placeIndicator();
  });
  update();
  // Enable the indicator transition only after the first placement so it doesn't slide in from the top.
  requestAnimationFrame(() => {
    nav.classList.add("is-ready");
    tabs.bar.classList.add("is-ready");
  });
}
