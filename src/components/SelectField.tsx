import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

export function SelectField({
  label,
  value,
  options,
  onChange,
  className = "",
  searchable = false,
  compactMenu = false,
  initialScrollValue
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  searchable?: boolean;
  compactMenu?: boolean;
  initialScrollValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) || options[0];
  const isEmptyState = !value || value === "Any" || value === "Any Radius";
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    if (!open) return;
    const container = optionsRef.current;
    const target = container?.querySelector<HTMLElement>(`[data-value="${CSS.escape(value || initialScrollValue || "")}"]`);
    if (container && target) {
      container.scrollTop = Math.max(0, target.offsetTop - container.clientHeight / 2 + target.offsetHeight / 2);
    }
  }, [initialScrollValue, open, value]);

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const index = Math.max(0, options.findIndex((option) => option.value === value));
    if (event.key === "ArrowDown") {
      event.preventDefault();
      onChange(options[Math.min(options.length - 1, index + 1)].value);
      setOpen(true);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onChange(options[Math.max(0, index - 1)].value);
      setOpen(true);
    }
    if (event.key === "Escape") setOpen(false);
  }

  function chooseValue(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={`select-field ${className}`} ref={ref}>
      <span>{label}</span>
      <button type="button" className={`select-trigger ${isEmptyState ? "empty-value" : "filled-value"}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} onKeyDown={onKeyDown}>
        {selected?.label || value}
        <ChevronDown size={18} />
      </button>
      {open && (
        <div className={`select-menu ${compactMenu ? "compact-select-menu" : ""}`} role="listbox">
          {searchable && (
            <label className="select-search-field">
              <span>Search options</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type to filter" />
            </label>
          )}
          <div className="select-options-scroll" ref={optionsRef}>
          {filteredOptions.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              data-value={option.value}
              key={option.value}
              onClick={() => chooseValue(option.value)}
            >
              {option.label}
            </button>
          ))}
          {filteredOptions.length === 0 && <p className="select-empty">No matching options</p>}
          </div>
        </div>
      )}
    </div>
  );
}
