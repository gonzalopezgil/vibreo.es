'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerProps {
  /** Currently selected date string (YYYY-MM-DD) */
  selectedDate: string;
  /** Set of available date strings (YYYY-MM-DD) */
  availableDates: Set<string>;
  /** Chart type — albums use weekly (Thursday) resolution */
  chartType: 'songs' | 'artists' | 'albums';
  /** Called with selected YYYY-MM-DD */
  onSelect: (date: string) => void;
  /** Formatted display text */
  displayText: string;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Find the Thursday of the ISO week containing `date` (Mon=1…Sun=7). */
function getThursday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  // ISO: Mon=1. Shift so Mon=0, Thu=3
  const diff = ((day + 6) % 7) - 3; // how far from Thursday
  d.setDate(d.getDate() - diff);
  return d;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function DatePicker({ selectedDate, availableDates, chartType, onSelect, displayText }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = parseDate(selectedDate);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const prevMonth = () => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  };

  const nextMonth = () => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  };

  const handleDayClick = (dateStr: string) => {
    if (chartType === 'albums') {
      // Resolve to nearest available Thursday
      const clicked = parseDate(dateStr);
      const thu = getThursday(clicked);
      const thuStr = toDateStr(thu.getFullYear(), thu.getMonth(), thu.getDate());
      if (availableDates.has(thuStr)) {
        onSelect(thuStr);
        setOpen(false);
        return;
      }
      // Find next available Thursday
      const sorted = [...availableDates].sort();
      const next = sorted.find((d) => d >= thuStr);
      const prev = [...sorted].reverse().find((d) => d <= thuStr);
      const pick = prev || next;
      if (pick) {
        onSelect(pick);
        setOpen(false);
      }
    } else {
      if (availableDates.has(dateStr)) {
        onSelect(dateStr);
        setOpen(false);
      }
    }
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: { day: number; dateStr: string; available: boolean; isToday: boolean; isSelected: boolean; isSelectedWeek: boolean }[] = [];
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(viewYear, viewMonth, d);
    let available = availableDates.has(dateStr);
    const cellThursday = getThursday(new Date(viewYear, viewMonth, d));
    const cellThursdayStr = toDateStr(cellThursday.getFullYear(), cellThursday.getMonth(), cellThursday.getDate());
    // For albums, a day is "available" if its Thursday is available
    if (chartType === 'albums' && !available) {
      available = availableDates.has(cellThursdayStr);
    }
    cells.push({
      day: d,
      dateStr,
      available,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
      isSelectedWeek: chartType === 'albums' && cellThursdayStr === selectedDate,
    });
  }

  return (
    <div ref={ref} className="inline-flex flex-col items-start">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition"
      >
        <Calendar size={14} />
        {displayText}
      </button>

      {open && (
        <div className="relative z-[100] mt-2 w-[280px] rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="p-1 text-zinc-400 hover:text-zinc-100 transition">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-zinc-200">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} className="p-1 text-zinc-400 hover:text-zinc-100 transition">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAY_LABELS.map((l) => (
              <div key={l} className="text-center text-[10px] font-medium text-zinc-500 py-1">
                {l}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Empty cells for offset */}
            {Array.from({ length: startDow }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {cells.map((cell) => (
              <button
                key={cell.day}
                disabled={!cell.available}
                onClick={() => handleDayClick(cell.dateStr)}
                className={`
                  h-8 w-full rounded text-xs font-medium transition
                  ${cell.isSelected
                    ? 'bg-green-600 text-white'
                    : cell.isSelectedWeek
                      ? 'bg-green-600/25 text-green-100 hover:bg-green-600/35'
                      : cell.isToday
                        ? 'bg-zinc-700 text-zinc-100'
                        : cell.available
                          ? 'text-zinc-300 hover:bg-zinc-800'
                          : 'text-zinc-700 cursor-not-allowed'
                  }
                `}
              >
                {cell.day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
