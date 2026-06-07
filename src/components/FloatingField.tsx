import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  trailing?: ReactNode;
};

export const FloatingInput = forwardRef<HTMLInputElement, InputProps>(function FloatingInput({ label, trailing, ...props }, ref) {
  return (
    <label className="floating-field">
      <input ref={ref} placeholder=" " {...props} />
      <span>{label}</span>
      {trailing && <div className="field-trailing">{trailing}</div>}
    </label>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function FloatingTextarea({ label, ...props }: TextareaProps) {
  return (
    <label className="floating-field textarea-field">
      <textarea placeholder=" " {...props} />
      <span>{label}</span>
    </label>
  );
}
