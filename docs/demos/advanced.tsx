import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { DateFieldShadcn } from "../../registry/react/date-field-shadcn";
import { DateFieldBaseUi } from "../../registry/react/date-field-base-ui";
import { DateFieldDayPicker } from "../../registry/react/date-field-day-picker";

function mount(id: string, node: ReactNode): void {
  const el = document.querySelector(`#${id}`);
  if (!el) return;
  createRoot(el).render(node);
}

export function mountAdvancedDemos(): void {
  mount(
    "advanced-demo-shadcn",
    <DateFieldShadcn
      id="demo-shadcn"
      label=""
      className="advanced-demo"
      separator="."
      placeholder="dd.mm.yyyy"
    />,
  );
  mount(
    "advanced-demo-base-ui",
    <DateFieldBaseUi
      id="demo-base-ui"
      label=""
      className="advanced-demo"
      separator="."
      placeholder="dd.mm.yyyy"
    />,
  );
  mount(
    "advanced-demo-day-picker",
    <DateFieldDayPicker
      id="demo-day-picker"
      label=""
      className="advanced-demo"
      separator="."
      placeholder="dd.mm.yyyy"
    />,
  );
}
