import * as React from "react"
import { format } from "date-fns"
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
}

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = "Pick a date and time",
  disabled,
  className
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [timeValue, setTimeValue] = React.useState(
    date ? format(date, "HH:mm") : "08:00"
  )

  React.useEffect(() => {
    setSelectedDate(date)
    if (date) {
      setTimeValue(format(date, "HH:mm"))
    }
  }, [date])

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setSelectedDate(undefined)
      onDateChange?.(undefined)
      return
    }

    // Combine the selected date with the current time
    const [hours, minutes] = timeValue.split(':').map(Number)
    const combinedDateTime = new Date(newDate)
    combinedDateTime.setHours(hours, minutes, 0, 0)
    
    setSelectedDate(combinedDateTime)
    onDateChange?.(combinedDateTime)
  }

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime)
    
    if (!selectedDate) return

    // Update the existing date with the new time
    const [hours, minutes] = newTime.split(':').map(Number)
    const updatedDateTime = new Date(selectedDate)
    updatedDateTime.setHours(hours, minutes, 0, 0)
    
    setSelectedDate(updatedDateTime)
    onDateChange?.(updatedDateTime)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "PPP 'at' h:mm a") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            className={cn("pointer-events-auto")}
          />
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