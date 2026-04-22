import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"
import { buttonVariants, type ButtonVariantProps } from "./button-variants"
import { MC_FOCUS_VISIBLE_RING } from "./mission-control-focus"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isPrimaryAction = variant === "default" || variant === undefined
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          MC_FOCUS_VISIBLE_RING,
          isPrimaryAction && "min-h-[44px] min-w-[44px]"
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
