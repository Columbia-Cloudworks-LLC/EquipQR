import * as React from "react"
import { GripVertical } from "lucide-react"
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
  type PanelGroupProps,
  type PanelResizeHandleProps,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

type ResizablePanelGroupProps = Omit<PanelGroupProps, "direction"> & {
  /** @deprecated Prefer `direction` — kept for shadcn-style call sites */
  direction?: PanelGroupProps["direction"]
  /** Alias for `direction` */
  orientation?: PanelGroupProps["direction"]
}

const ResizablePanelGroup = ({
  className,
  direction,
  orientation,
  ...props
}: ResizablePanelGroupProps) => (
  <PanelGroup
    className={cn("flex h-full w-full", className)}
    direction={direction ?? orientation ?? "horizontal"}
    {...props}
  />
)

/** Alias of `Panel` — preserves primitive identity and ref behavior. */
const ResizablePanel = Panel

type ResizableHandleProps = PanelResizeHandleProps & { withHandle?: boolean }

const ResizableHandle = React.forwardRef<
  HTMLDivElement,
  ResizableHandleProps
>(({ withHandle, className, ...props }, ref) => (
  <PanelResizeHandle
    ref={ref}
    className={cn(
      "relative flex items-center justify-center bg-border focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-1",
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
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </PanelResizeHandle>
))
ResizableHandle.displayName = "ResizableHandle"

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
