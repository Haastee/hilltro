import { ChevronDown, Search } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { countryDialOptions } from "../data/countries";

export function CountryDialCodePicker({ value, onChange, label = "Country code *" }: { value: string; onChange: (value: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const selected = countryDialOptions.find((country) => `${country.countryCode}:${country.dialCode}` === value)
    || countryDialOptions.find((country) => country.dialCode === value)
    || countryDialOptions.find((country) => country.countryCode === "GB")
    || countryDialOptions[0];
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? countryDialOptions.filter((country) => country.search.includes(term)) : countryDialOptions;
  }, [query]);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => setActiveIndex(0), [query]);

  function choose(index: number) {
    const option = filtered[index];
    if (!option) return;
    onChange(`${option.countryCode}:${option.dialCode}`);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      choose(activeIndex);
    }
    if (event.key === "Escape") setOpen(false);
  }

  return (
    <div className="country-picker" ref={ref} onKeyDown={onKeyDown}>
      <span>{label}</span>
      <button type="button" className="country-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{selected.flag}</span>
        <b>{selected.dialCode}</b>
        <small>{selected.name}</small>
        <ChevronDown size={18} />
      </button>
      {open && (
        <div className="country-menu">
          <label className="country-search">
            <Search size={16} />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search country or code" />
          </label>
          <div className="country-options" role="listbox">
            {filtered.map((country, index) => (
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? "active" : ""}
                key={`${country.countryCode}-${country.dialCode}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
              >
                <span>{country.flag}</span>
                <b>{country.name}</b>
                <small>{country.dialCode}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function dialCodeFromPickerValue(value: string) {
  return value.includes(":") ? value.split(":")[1] : value;
}
