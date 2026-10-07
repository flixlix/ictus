import { Input } from "@/components/ui/input";
import { useDateFieldMask } from "ictus/react";
import type { UseDateFieldMaskOptions } from "ictus/react";

export type DateFieldShadcnProps = UseDateFieldMaskOptions & {
  id?: string;
  label?: string;
  placeholder?: string;
  className?: string;
};

export function DateFieldShadcn({
  id = "date",
  label = "Date",
  placeholder = "dd.mm.yyyy",
  className,
  separator = ".",
  ...options
}: DateFieldShadcnProps) {
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
    <div className={className}>
      {label ? <label htmlFor={id}>{label}</label> : null}
      <Input
        id={id}
        placeholder={placeholder}
        aria-label={label || placeholder || "Date"}
        {...inputProps}
      />
      <p data-status={status}>
        {statusLabel}
        {isoValue ? ` · ${isoValue}` : ""}
      </p>
    </div>
  );
}
