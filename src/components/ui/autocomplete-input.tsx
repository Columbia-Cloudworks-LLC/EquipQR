import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { Check } from "lucide-react"

export interface AutocompleteInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Array of suggestion strings to show in dropdown */
  suggestions: string[]
  /** Current value of the input */
  value: string
  /** Callback when value changes */
  onChange: (value: string) => void
  /** Message to show when no suggestions match */
  emptyMessage?: string
  /** Whether the autocomplete is disabled */
  disabled?: boolean
}

/**
 * AutocompleteInput - A combobox-style input that allows free-form text input
 * while also providing filterable suggestions from a list.
 * 
 * Uses Popover on desktop for proper collision detection and Drawer on mobile
 * for better touch interaction.
 */
const AutocompleteInput = React.forwardRef<HTMLInputElement, AutocompleteInputProps>(
  ({ 
    className, 
    suggestions, 
    value, 
    onChange, 
    emptyMessage = "No suggestions found",
    disabled,
    placeholder,
    ...props 
  }, ref) => {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState(value)
    const isMobile = useIsMobile()
    const inputRef = React.useRef<HTMLInputElement>(null)
    
    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    // Sync internal state with external value
    React.useEffect(() => {
      setInputValue(value)
    }, [value])

    // Filter suggestions based on current input
    const filteredSuggestions = React.useMemo(() => {
      if (!inputValue) return suggestions
      const lowerInput = inputValue.toLowerCase()
      return suggestions.filter(suggestion => 
        suggestion.toLowerCase().includes(lowerInput)
      )
    }, [suggestions, inputValue])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      onChange(newValue)
      // Open dropdown when typing and there are suggestions
      if (suggestions.length > 0 && !open) {
        setOpen(true)
      }
    }

    const handleSelect = (selectedValue: string) => {
      setInputValue(selectedValue)
      onChange(selectedValue)
      setOpen(false)
      // Focus back to input after selection
      inputRef.current?.focus()
    }

    const handleFocus = () => {
      if (suggestions.length > 0) {
        setOpen(true)
      }
    }

    const handleBlur = (e: React.FocusEvent) => {
      // Delay closing to allow click on suggestion
      // Check if the related target is within the popover
      const relatedTarget = e.relatedTarget as HTMLElement
      if (relatedTarget?.closest('[data-autocomplete-list]')) {
        return
      }
      // Small delay to allow for click events
      setTimeout(() => setOpen(false), 150)
    }

    const SuggestionsList = (
      <Command shouldFilter={false} data-autocomplete-list>
        <CommandList className="max-h-[200px]">
          {filteredSuggestions.length === 0 ? (
            <CommandEmpty>{emptyMessage}</CommandEmpty>
          ) : (
            <CommandGroup>
              {filteredSuggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  value={suggestion}
                  onSelect={() => handleSelect(suggestion)}
                  className="cursor-pointer"
                >
                  <span>{suggestion}</span>
                  {value.toLowerCase() === suggestion.toLowerCase() && (
                    <Check className="ml-auto h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    )

    // Don't show dropdown if no suggestions
    if (suggestions.length === 0) {
      return (
        <Input
          ref={inputRef}
          className={className}
          value={inputValue}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          {...props}
        />
      )
    }

    // Mobile: Use Drawer for better touch experience
    if (isMobile) {
      return (
        <>
          <Input
            ref={inputRef}
            className={className}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            {...props}
          />
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent className="max-h-[50vh]">
              <div className="p-4">
                <Input
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={placeholder}
                  autoComplete="off"
                  className="mb-2"
                  autoFocus
                />
              </div>
              {SuggestionsList}
            </DrawerContent>
          </Drawer>
        </>
      )
    }

    // Desktop: Use Popover with collision detection
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="w-full">
            <Input
              ref={inputRef}
              className={cn("w-full", className)}
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={disabled}
              placeholder={placeholder}
              autoComplete="off"
              {...props}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="p-0" 
          align="start"
          side="bottom"
          sideOffset={4}
          // Ensure popover stays within viewport
          collisionPadding={16}
          avoidCollisions={true}
          // Match input width
          style={{ width: 'var(--radix-popover-trigger-width)' }}
          onOpenAutoFocus={(e) => {
            // Prevent popover from stealing focus from input
            e.preventDefault()
          }}
        >
          {SuggestionsList}
        </PopoverContent>
      </Popover>
    )
  }
)

AutocompleteInput.displayName = "AutocompleteInput"

export { AutocompleteInput }
