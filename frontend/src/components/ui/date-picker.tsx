import { useState, useRef, useEffect } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: string // YYYY-MM-DD format
  onChange: (value: string) => void
  id?: string
  className?: string
  placeholder?: string
  required?: boolean
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function DatePicker({
  value,
  onChange,
  id,
  className,
  placeholder = 'Pick a date',
  required,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    return value ? new Date(value + 'T00:00:00') : new Date()
  })
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedDate = value ? new Date(value + 'T00:00:00') : null

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  // Sync viewDate when value changes externally
  useEffect(() => {
    if (value) {
      setViewDate(new Date(value + 'T00:00:00'))
    }
  }, [value])

  function handleSelect(date: Date) {
    onChange(format(date, 'yyyy-MM-dd'))
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setOpen(false)
  }

  function handleToday() {
    const today = new Date()
    onChange(format(today, 'yyyy-MM-dd'))
    setViewDate(today)
    setOpen(false)
  }

  // Build calendar grid
  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days: Date[] = []
  let day = calendarStart
  while (day <= calendarEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        id={id}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-3 w-full h-12 px-4 rounded-xl text-sm transition-all',
          'bg-secondary/50 border border-white/10 hover:border-purple-500/30',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50',
          open && 'border-purple-500/50 ring-2 ring-purple-500/20',
          className
        )}
      >
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className={cn('flex-1 text-left', !selectedDate && 'text-muted-foreground/50')}>
          {selectedDate ? format(selectedDate, 'MMM d, yyyy') : placeholder}
        </span>
        {selectedDate && !required && (
          <span
            role="button"
            tabIndex={-1}
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {/* Calendar Popover */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <button
              type="button"
              onClick={() => setViewDate(subMonths(viewDate, 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">
              {format(viewDate, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(addMonths(viewDate, 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 px-2 pt-2">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="text-center text-[10px] font-medium text-muted-foreground/60 uppercase py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 px-2 pb-2">
            {days.map((d, i) => {
              const inMonth = isSameMonth(d, viewDate)
              const selected = selectedDate && isSameDay(d, selectedDate)
              const today = isToday(d)

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(d)}
                  className={cn(
                    'h-9 w-full rounded-lg text-sm transition-all relative',
                    'hover:bg-white/10',
                    !inMonth && 'text-muted-foreground/30',
                    inMonth && !selected && 'text-foreground',
                    selected && 'bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:from-purple-600 hover:to-blue-600',
                    today && !selected && 'font-semibold text-purple-400'
                  )}
                >
                  {format(d, 'd')}
                  {today && !selected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-white/5 flex justify-between">
            <button
              type="button"
              onClick={handleToday}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium px-2 py-1 rounded-md hover:bg-purple-500/10 transition-colors"
            >
              Today
            </button>
            {selectedDate && (
              <span className="text-xs text-muted-foreground/60 self-center">
                {format(selectedDate, 'EEEE')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker
