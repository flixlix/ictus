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

  const statusLabel =
    status === "valid" && parsed
      ? parsed.toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : status;

  return (
    <Field.Root className={className}>
      {label ? <Field.Label htmlFor={id}>{label}</Field.Label> : null}
      <Input
        id={id}
        placeholder={placeholder}
        className="ictus-base-ui-input"
        aria-label={label || placeholder || "Date"}
        {...inputProps}
      />
      <Field.Description data-status={status}>
        {statusLabel}
        {isoValue ? ` · ${isoValue}` : ""}
      </Field.Description>
    </Field.Root>
  );
}
