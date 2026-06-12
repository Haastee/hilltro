import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const dayFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit" });
const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const valueFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

function toISO(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

function parseISO(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function todayISO() {
  return toISO(new Date());
}

export function CalendarField({ label, value, onChange, min, required }: { label: string; value: string; onChange: (value: string) => void; min?: string; required?: boolean }) {
  const selected = parseISO(value);
  const minDate = parseISO(min || "");
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selected || minDate || new Date());
  const days = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [viewDate]);

  function changeMonth(offset: number) {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  }

  function disabled(date: Date) {
    if (!minDate) return false;
    const current = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const minimum = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
    return current < minimum;
  }

  return (
    <div className="calendar-field">
      <span>{label}{required ? "" : " (optional)"}</span>
      <button type="button" className="calendar-trigger" onClick={() => setOpen(!open)} aria-expanded={open}>
        {selected ? valueFormatter.format(selected) : "Select a date"}
      </button>
      {open && (
        <div className="calendar-popover">
          <div className="calendar-heading">
            <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
            <b>{monthFormatter.format(viewDate)}</b>
            <button type="button" onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
          </div>
          <div className="calendar-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid" role="grid">
            {days.map((date) => {
              const iso = toISO(date);
              const outside = date.getMonth() !== viewDate.getMonth();
              const active = iso === value;
              return (
                <button
                  type="button"
                  key={iso}
                  className={`${outside ? "outside" : ""} ${active ? "active" : ""}`}
                  disabled={disabled(date)}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                >
                  {dayFormatter.format(date)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ViewingDateTimePicker({ date, time, onDateChange, onTimeChange }: { date: string; time: string; onDateChange: (value: string) => void; onTimeChange: (value: string) => void }) {
  return (
    <div className="viewing-picker">
      <CalendarField label="Viewing date *" value={date} onChange={onDateChange} min={todayISO()} required />
      <TimeWheelField label="Time slot *" value={time} date={date} onChange={onTimeChange} />
    </div>
  );
}

// Slot the time scroller opens *near* (it does NOT auto-select). For today,
// that's the current UK time + 2 hours, rounded to the 15-min grid; for any
// future date it's the start of the viewing day (10:00). Returns "" when today
// is already too late (after which the user should pick tomorrow → 10:00).
function suggestedViewingTime(date: string) {
  const isToday = !date || date === todayISO();
  if (!isToday) return "10:00";
  const ukParts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
  const hour = Number(ukParts.find((part) => part.type === "hour")?.value || "0");
  const minute = Number(ukParts.find((part) => part.type === "minute")?.value || "0");
  const total = Math.ceil((hour * 60 + minute + 120) / 15) * 15;
  if (total > 20 * 60) return "";
  return clampToViewingHours(total);
}

export function isValidViewingDateTime(date: string, time: string) {
  if (!date || !time) return false;
  const selected = new Date(`${date}T${time}:00`);
  if (Number.isNaN(selected.getTime())) return false;
  return selected.getTime() >= Date.now() + 60 * 60 * 1000;
}

function TimeWheelField({ label, value, date, onChange }: { label: string; value: string; date: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const slots = useMemo(() => viewingTimeSlots(date), [date]);
  // The slot the scroller opens NEAR (never auto-selected). Falls to the first
  // available slot if the +2h suggestion is past the end of the day.
  const suggestion = useMemo(() => {
    const wanted = suggestedViewingTime(date);
    if (wanted && slots.includes(wanted)) return wanted;
    return slots.find((slot) => slot >= wanted) || slots[0] || "";
  }, [date, slots]);

  // If a previously chosen time is no longer valid (e.g. the date changed to
  // today and that slot is now in the past), clear it — but never auto-fill.
  useEffect(() => {
    if (value && slots.length && !slots.includes(value)) onChange("");
  }, [slots, value, onChange]);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => {
      const popover = popoverRef.current;
      const target = value && slots.includes(value) ? value : suggestion;
      const selected = popover?.querySelector(`[data-time="${target}"]`) as HTMLButtonElement | null;
      if (popover && selected) popover.scrollTop = Math.max(0, selected.offsetTop - popover.clientHeight / 2 + selected.offsetHeight / 2);
    }, 0);
  }, [open, suggestion, slots, value]);

  function move(offset: number) {
    const index = value && slots.includes(value) ? slots.indexOf(value) : Math.max(0, slots.indexOf(suggestion));
    const next = slots[Math.min(slots.length - 1, Math.max(0, index + offset))];
    if (next) onChange(next);
  }

  return (
    <div className="time-wheel-field" ref={ref}>
      <span>{label}</span>
      <button
        type="button"
        className="time-wheel-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); move(1); setOpen(true); }
          if (event.key === "ArrowUp") { event.preventDefault(); move(-1); setOpen(true); }
          if (event.key === "Escape") setOpen(false);
        }}
      >
        {value ? formatTimeLabel(value) : "Select a time"}
      </button>
      {open && (
        <div className="time-wheel-popover" role="listbox" ref={popoverRef}>
          {slots.length === 0 && <p className="select-empty">No viewing slots remain today — please choose another date.</p>}
          {slots.map((slot) => (
            <button
              type="button"
              role="option"
              aria-selected={slot === value}
              className={slot === value ? "active" : ""}
              data-time={slot}
              key={slot}
              onClick={() => {
                onChange(slot);
                setOpen(false);
              }}
            >
              {formatTimeLabel(slot)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function viewingTimeSlots(date?: string) {
  const slots: string[] = [];
  for (let hour = 10; hour <= 20; hour += 1) {
    for (const minute of [0, 15, 30, 45]) {
      if (hour === 20 && minute > 0) continue;
      const slot = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      if (!date || isValidViewingDateTime(date, slot)) slots.push(slot);
    }
  }
  return slots;
}

function clampToViewingHours(totalMinutes: number) {
  const min = 10 * 60;
  const max = 20 * 60;
  const clamped = Math.min(max, Math.max(min, totalMinutes));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

function formatTimeLabel(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`;
}
