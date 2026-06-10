import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type MultiSelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

export function MultiSelectField({
  label,
  values,
  options,
  onChange,
  anyLabel,
  className = ""
}: {
  label: string;
  values: string[];
  options: MultiSelectOption[];
  onChange: (values: string[]) => void;
  anyLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((current) => current !== value) : [...values, value]);
  }

  const selectedLabels = options.filter((option) => values.includes(option.value)).map((option) => option.label);
  const isEmpty = selectedLabels.length === 0;
  const summary = isEmpty ? anyLabel : selectedLabels.length <= 2 ? selectedLabels.join(", ") : `${selectedLabels.length} selected`;

  return (
    <div className={`select-field multi-select-field ${className}`} ref={ref}>
      <span>{label}</span>
      <button
        type="button"
        className={`select-trigger ${isEmpty ? "empty-value" : "filled-value"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="multi-select-summary">{summary}</span>
        {!isEmpty && <b className="multi-select-count">{selectedLabels.length}</b>}
        <ChevronDown size={18} />
      </button>
      {open && (
        <div className="select-menu multi-select-menu" role="listbox" aria-multiselectable="true">
          <div className="multi-select-head">
            <span>{selectedLabels.length ? `${selectedLabels.length} selected` : "Select any"}</span>
            {!isEmpty && <button type="button" className="multi-select-clear" onClick={() => onChange([])}>Clear</button>}
          </div>
          <div className="select-options-scroll">
            {options.map((option) => {
              const checked = values.includes(option.value);
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  key={option.value}
                  className={`multi-select-option ${checked ? "checked" : ""}`}
                  onClick={() => toggle(option.value)}
                >
                  <span className="multi-select-box">{checked && <Check size={13} />}</span>
                  {option.icon && <span className="multi-select-icon">{option.icon}</span>}
                  <span className="multi-select-label">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
