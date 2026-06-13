import { useMemo } from "react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function daysInMonth(year: number, month1to12: number): number {
  if (!year || !month1to12) return 31;
  return new Date(year, month1to12, 0).getDate();
}

// Three fast selectors (Day / Month / Year). Mobile-friendly native dropdowns,
// no month-by-month scrolling, and the user can jump straight to a birth year.
// Emits an ISO yyyy-mm-dd string (or "" while incomplete).
export function DateOfBirthField({ value, onChange, label = "Date of birth *" }: {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
}) {
  const [yy, mm, dd] = useMemo(() => {
    const [y, m, d] = (value || "").split("-");
    return [y || "", m || "", d || ""];
  }, [value]);

  const now = new Date();
  const years = useMemo(() => {
    const top = now.getFullYear() - 18; // oldest eligible birth year shown first
    const out: number[] = [];
    for (let y = top; y >= now.getFullYear() - 100; y--) out.push(y);
    return out;
  }, [now]);

  const dayCount = daysInMonth(Number(yy), Number(mm));
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

  function emit(nextY: string, nextM: string, nextD: string) {
    if (!nextY || !nextM || !nextD) { onChange(""); return; }
    // Clamp day to the month's length (e.g. switching to February).
    const maxDay = daysInMonth(Number(nextY), Number(nextM));
    const day = Math.min(Number(nextD), maxDay);
    onChange(`${nextY}-${nextM.padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }

  return (
    <label className="dob-field">
      {label}
      <div className="dob-selects">
        <select aria-label="Day" value={dd ? String(Number(dd)) : ""} onChange={(e) => emit(yy, mm, e.target.value)}>
          <option value="" disabled>Day</option>
          {days.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select aria-label="Month" value={mm ? String(Number(mm)) : ""} onChange={(e) => emit(yy, e.target.value, dd)}>
          <option value="" disabled>Month</option>
          {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
        </select>
        <select aria-label="Year" value={yy} onChange={(e) => emit(e.target.value, mm, dd)}>
          <option value="" disabled>Year</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </label>
  );
}

// True when the ISO date is a valid birth date for someone at least 18 today.
export function isAtLeast18(iso: string): boolean {
  if (!iso) return false;
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 18;
}
