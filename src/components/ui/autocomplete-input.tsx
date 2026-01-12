import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { Check } from "lucide-react"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export interface AutocompleteInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** 
   * Array of suggestion strings to show in dropdown.
   * For optimal performance, keep this under 1000 items.
   * Larger lists may experience filtering delays.
   */
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
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
    const isMobile = useIsMobile()
    const inputRef = React.useRef<HTMLInputElement>(null)
    const listId = React.useId()
    
    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    // Sync internal state with external value
    React.useEffect(() => {
      setInputValue(value)
    }, [value])

    // Reset highlighted index when suggestions change
    React.useEffect(() => {
      setHighlightedIndex(-1)
    }, [inputValue])

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
      setHighlightedIndex(-1)
      // Focus back to input after selection
      inputRef.current?.focus()
    }

    const handleFocus = () => {
      if (suggestions.length > 0) {
        setOpen(true)
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // If focus is moving into the suggestions list, keep the dropdown open
      const relatedTarget = e.relatedTarget as HTMLElement | null
      if (relatedTarget?.closest('[data-autocomplete-list]')) {
        return
      }
      // Close when focus leaves the input and isn't moving to the list
      setOpen(false)
      setHighlightedIndex(-1)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || filteredSuggestions.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
            handleSelect(filteredSuggestions[highlightedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          setHighlightedIndex(-1)
          break
      }
    }

    const SuggestionsList = (
      <Command shouldFilter={false} data-autocomplete-list>
        <CommandList id={listId} className="max-h-[200px]" role="listbox">
          {filteredSuggestions.length === 0 ? (
            <CommandEmpty>{emptyMessage}</CommandEmpty>
          ) : (
            <CommandGroup>
              {filteredSuggestions.map((suggestion, index) => (
                <CommandItem
                  key={suggestion}
                  id={`${listId}-option-${index}`}
                  value={suggestion}
                  onSelect={handleSelect}
                  className={cn(
                    "cursor-pointer",
                    highlightedIndex === index && "bg-accent"
                  )}
                  role="option"
                  aria-selected={highlightedIndex === index}
                >
                  <span>{suggestion}</span>
                  {value === suggestion && (
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
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={
              open && highlightedIndex >= 0 
                ? `${listId}-option-${highlightedIndex}` 
                : undefined
            }
            role="combobox"
            onKeyDown={handleKeyDown}
            {...props}
          />
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent className="max-h-[50vh]" aria-label={placeholder || "Select an option"}>
              {/* Visually hidden title for screen readers */}
              <VisuallyHidden>
                <DrawerTitle>{placeholder || "Select an option"}</DrawerTitle>
              </VisuallyHidden>
              <div className="p-4">
                {/* 
                  Note: autoFocus may not work reliably on mobile browsers, 
                  especially iOS, due to browser restrictions on programmatic 
                  focus in modals/drawers. Users may need to tap to focus.
                */}
                <Input
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={placeholder}
                  autoComplete="off"
                  className="mb-2"
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
          <Input
            ref={inputRef}
            className={cn("w-full", className)}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={
              open && highlightedIndex >= 0 
                ? `${listId}-option-${highlightedIndex}` 
                : undefined
            }
            role="combobox"
            {...props}
          />
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
          onInteractOutside={(e) => {
            // Allow clicking on the input without closing the popover
            if (e.target === inputRef.current) {
              e.preventDefault()
            }
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
