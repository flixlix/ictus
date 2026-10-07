import { useEffect, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { DayPicker } from "react-day-picker";
import { formatDate } from "ictus";
import { useDateFieldMask } from "ictus/react";
import type { UseDateFieldMaskOptions } from "ictus/react";

import "react-day-picker/style.css";

export type DateFieldDayPickerProps = UseDateFieldMaskOptions & {
  id?: string;
  label?: string;
  placeholder?: string;
  className?: string;
};

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function DateFieldDayPicker({
  id = "date-day-picker",
  label = "Date",
  placeholder = "dd.mm.yyyy",
  className,
  separator = ".",
  value: valueProp,
  onValueChange,
  ...options
}: DateFieldDayPickerProps) {
  const [uncontrolled, setUncontrolled] = useState(options.defaultValue ?? "");
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : uncontrolled;

  const setValue = (next: string) => {
    if (!isControlled) setUncontrolled(next);
    onValueChange?.(next);
  };

  const { inputProps, status, parsed, isoValue } = useDateFieldMask({
    separator,
    value,
    onValueChange: setValue,
    ...options,
  });

  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => parsed ?? new Date());

  useEffect(() => {
    if (parsed) setMonth(parsed);
  }, [parsed]);

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
      <div className="ictus-day-picker-row">
        <input
          id={id}
          placeholder={placeholder}
          className="ictus-day-picker-input"
          aria-label={label || placeholder || "Date"}
          {...inputProps}
        />
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger
            type="button"
            className="ictus-day-picker-trigger"
            aria-label="Open calendar"
          >
            <CalendarIcon />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={8} align="end">
              <Popover.Popup className="ictus-day-picker-popup">
                <DayPicker
                  mode="single"
                  month={month}
                  onMonthChange={setMonth}
                  selected={parsed}
                  onSelect={(date) => {
                    if (!date) {
                      setValue("");
                      return;
                    }
                    setValue(formatDate(date, separator));
                    setMonth(date);
                    setOpen(false);
                  }}
                />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
      <p data-status={status}>
        {statusLabel}
        {isoValue ? ` · ${isoValue}` : ""}
      </p>
    </div>
  );
}
