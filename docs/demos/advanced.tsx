import { createRoot } from "react-dom/client";
import { DateFieldShadcn } from "../../registry/react/date-field-shadcn";
import { DateFieldBaseUi } from "../../registry/react/date-field-base-ui";
import { DateFieldDayPicker } from "../../registry/react/date-field-day-picker";

function AdvancedDemos() {
  return (
    <div className="advanced-demos">
      <DateFieldShadcn
        id="demo-shadcn"
        label="shadcn-style Input"
        className="advanced-demo"
        separator="."
      />
      <DateFieldBaseUi
        id="demo-base-ui"
        label="Base UI Field + Input"
        className="advanced-demo"
        separator="."
      />
      <DateFieldDayPicker
        id="demo-day-picker"
        label="Masked input + Day Picker"
        className="advanced-demo"
        separator="."
      />
    </div>
  );
}

export function mountAdvancedDemos(): void {
  const root = document.querySelector("#advanced-demos-root");
  if (!root) return;
  createRoot(root).render(<AdvancedDemos />);
}
