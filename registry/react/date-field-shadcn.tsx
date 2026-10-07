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

  return (
    <div className={className}>
      <label htmlFor={id}>{label}</label>
      <Input id={id} placeholder={placeholder} {...inputProps} />
      <p data-status={status}>
        {status === "valid" && parsed
          ? parsed.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : status}
        {isoValue ? ` · ${isoValue}` : ""}
      </p>
    </div>
  );
}
