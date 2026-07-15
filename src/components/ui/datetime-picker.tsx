import * as React from "react"
import { format, startOfDay, endOfDay } from "date-fns"
import { CalendarIcon, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateTimePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showShortcuts?: boolean
}

function combineDateAndTime(baseDate: Date, timeValue: string): Date {
  const [hours, minutes] = timeValue.split(':').map(Number)
  const combinedDateTime = new Date(baseDate)
  combinedDateTime.setHours(hours, minutes, 0, 0)
  return combinedDateTime
}

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = "Pick a date and time",
  disabled,
  className,
  showShortcuts = false,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [visibleMonth, setVisibleMonth] = React.useState<Date | undefined>(date ?? new Date())
  const [timeValue, setTimeValue] = React.useState(
    date ? format(date, "HH:mm") : "08:00"
  )

  React.useEffect(() => {
    setSelectedDate(date)
    if (date) {
      setTimeValue(format(date, "HH:mm"))
      setVisibleMonth(date)
    }
  }, [date])

  const applyDateTime = React.useCallback((nextDate: Date) => {
    setSelectedDate(nextDate)
    setTimeValue(format(nextDate, "HH:mm"))
    setVisibleMonth(nextDate)
    onDateChange?.(nextDate)
  }, [onDateChange])

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setSelectedDate(undefined)
      onDateChange?.(undefined)
      return
    }

    applyDateTime(combineDateAndTime(newDate, timeValue))
  }

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime)

    if (!selectedDate) return

    applyDateTime(combineDateAndTime(selectedDate, newTime))
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      const anchor = selectedDate ?? date ?? new Date()
      setVisibleMonth(anchor)
    }
  }

  const handleShortcut = (shortcut: 'today' | 'now' | 'startOfDay' | 'endOfDay') => {
    const anchor = selectedDate ?? date ?? new Date()
    let nextDate: Date

    switch (shortcut) {
      case 'today':
        nextDate = combineDateAndTime(new Date(), timeValue)
        break
      case 'now':
        nextDate = new Date()
        break
      case 'startOfDay':
        nextDate = startOfDay(anchor)
        break
      case 'endOfDay':
        nextDate = endOfDay(anchor)
        break
      default:
        return
    }

    applyDateTime(nextDate)
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-11 min-h-[44px] w-full min-w-0 justify-start px-3 text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {selectedDate ? format(selectedDate, "PPP 'at' h:mm a") : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
            onSelect={handleDateSelect}
            initialFocus
            className={cn("pointer-events-auto")}
          />
          {showShortcuts ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => handleShortcut('today')}>
                Today
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleShortcut('now')}>
                Now
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleShortcut('startOfDay')}>
                Start of day
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleShortcut('endOfDay')}>
                End of day
              </Button>
            </div>
          ) : null}
          <div className="mt-3 flex items-center gap-2 pt-3 border-t">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="time-input" className="text-sm font-medium">
              Time:
            </Label>
            <Input
              id="time-input"
              type="time"
              value={timeValue}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
