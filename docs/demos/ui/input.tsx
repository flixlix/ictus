import { forwardRef } from "react";
import type { ComponentProps } from "react";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  function Input({ className, type = "text", ...props }, ref) {
    const classes = ["demo-shadcn-input", className].filter(Boolean).join(" ");
    return <input type={type} className={classes} ref={ref} {...props} />;
  },
);
