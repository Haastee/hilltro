import { useEffect, useMemo, useState } from "react";
import { SelectField, type SelectOption } from "./SelectField";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function daysInMonth(year: number, month1to12: number): number {
  if (!year || !month1to12) return 31;
  return new Date(year, month1to12, 0).getDate();
}

// Three neat, on-brand dropdowns (Day / Month / Year) built on the design-system
// SelectField. Partial selections persist; an ISO yyyy-mm-dd is emitted only
// once all three are chosen. Year is searchable so a birth year is one tap/type.
export function DateOfBirthField({ value, onChange, label = "Date of birth *" }: {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
}) {
  const [yy, setYy] = useState("");
  const [mm, setMm] = useState("");
  const [dd, setDd] = useState("");

  // Sync down only when the parent supplies a complete date (e.g. loaded draft).
  useEffect(() => {
    if (!value) return;
    const [y, m, d] = value.split("-");
    if (y && m && d) { setYy(y); setMm(String(Number(m))); setDd(String(Number(d))); }
  }, [value]);

  const now = new Date();
  const years = useMemo(() => {
    const top = now.getFullYear() - 18;
    const out: SelectOption[] = [{ value: "", label: "Year" }];
    for (let y = top; y >= now.getFullYear() - 100; y--) out.push({ value: String(y), label: String(y) });
    return out;
  }, [now]);

  const dayOptions = useMemo<SelectOption[]>(() => {
    const count = daysInMonth(Number(yy), Number(mm));
    return [{ value: "", label: "Day" }, ...Array.from({ length: count }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))];
  }, [yy, mm]);

  const monthOptions = useMemo<SelectOption[]>(
    () => [{ value: "", label: "Month" }, ...MONTHS.map((name, i) => ({ value: String(i + 1), label: name }))],
    [],
  );

  function update(ny: string, nm: string, nd: string) {
    // Clamp the day if the new month/year is shorter (e.g. switching to February).
    if (ny && nm && nd) {
      const maxDay = daysInMonth(Number(ny), Number(nm));
      if (Number(nd) > maxDay) nd = String(maxDay);
    }
    setYy(ny); setMm(nm); setDd(nd);
    if (ny && nm && nd) onChange(`${ny}-${nm.padStart(2, "0")}-${nd.padStart(2, "0")}`);
    else onChange("");
  }

  return (
    <div className="dob-field">
      <span className="dob-label">{label}</span>
      <div className="dob-selects">
        <SelectField label="" value={dd} options={dayOptions} compactMenu onChange={(v) => update(yy, mm, v)} />
        <SelectField label="" value={mm} options={monthOptions} compactMenu onChange={(v) => update(yy, v, dd)} />
        <SelectField label="" value={yy} options={years} compactMenu searchable initialScrollValue={yy || String(now.getFullYear() - 30)} onChange={(v) => update(v, mm, dd)} />
      </div>
    </div>
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
