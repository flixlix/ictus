import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { useDateFieldMask } from "ictus/react";
import type { UseDateFieldMaskOptions } from "ictus/react";

export type DateFieldBaseUiProps = UseDateFieldMaskOptions & {
  id?: string;
  label?: string;
  placeholder?: string;
  className?: string;
};

export function DateFieldBaseUi({
  id = "date-base-ui",
  label = "Date",
  placeholder = "dd.mm.yyyy",
  className,
  separator = ".",
  ...options
}: DateFieldBaseUiProps) {
  const { inputProps, status, parsed, isoValue } = useDateFieldMask({
    separator,
    ...options,
  });

  return (
    <Field.Root className={className}>
      <Field.Label htmlFor={id}>{label}</Field.Label>
      <Input id={id} placeholder={placeholder} className="ictus-base-ui-input" {...inputProps} />
      <Field.Description data-status={status}>
        {status === "valid" && parsed
          ? parsed.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : status}
        {isoValue ? ` · ${isoValue}` : ""}
      </Field.Description>
    </Field.Root>
  );
}
