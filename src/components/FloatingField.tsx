import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  trailing?: ReactNode;
};

export const FloatingInput = forwardRef<HTMLInputElement, InputProps>(function FloatingInput({ label, trailing, type, ...props }, ref) {
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);
  const effectiveType = isPassword ? (revealed ? "text" : "password") : type;
  return (
    <label className="floating-field">
      <input ref={ref} placeholder=" " type={effectiveType} {...props} />
      <span>{label}</span>
      {isPassword ? (
        <button
          type="button"
          className="field-trailing field-toggle"
          onClick={() => setRevealed((value) => !value)}
          aria-label={revealed ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      ) : trailing ? (
        <div className="field-trailing">{trailing}</div>
      ) : null}
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
