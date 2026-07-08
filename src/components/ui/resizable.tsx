import * as React from "react"
import { GripVertical } from "lucide-react"
import {
  Group,
  Panel,
  Separator,
  type GroupProps,
  type SeparatorProps,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

type ResizablePanelGroupProps = Omit<GroupProps, "orientation"> & {
  /** @deprecated Prefer `orientation` — kept for shadcn-style call sites */
  direction?: GroupProps["orientation"]
  /** Alias for `direction` / library `orientation` */
  orientation?: GroupProps["orientation"]
}

const ResizablePanelGroup = ({
  className,
  direction,
  orientation,
  ...props
}: ResizablePanelGroupProps) => {
  const resolvedOrientation = direction ?? orientation ?? "horizontal"

  return (
    <Group
      className={cn("h-full w-full min-h-0", className)}
      orientation={resolvedOrientation}
      {...props}
    />
  )
}

/** Alias of `Panel` — preserves primitive identity and ref behavior. */
const ResizablePanel = Panel

type ResizableHandleProps = SeparatorProps & { withHandle?: boolean }

const ResizableHandle = React.forwardRef<
  HTMLDivElement,
  ResizableHandleProps
>(({ withHandle, className, ...props }, ref) => (
  <Separator
    elementRef={ref}
    className={cn(
      "relative flex items-center justify-center bg-border transition-colors hover:bg-primary/40 data-[resize-separator-active]:bg-primary/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-1",
      "aria-[orientation=vertical]:h-full aria-[orientation=vertical]:w-px",
      "after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2",
      "aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full",
      "aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:translate-x-0",
      "[&[aria-orientation=horizontal]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-8 w-3.5 items-center justify-center rounded-sm border bg-border shadow-sm">
        <GripVertical className="h-3 w-3" />
      </div>
    )}
  </Separator>
))
ResizableHandle.displayName = "ResizableHandle"

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
