import * as React from "react"
import { GripVertical } from "lucide-react"
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  type GroupProps,
  type SeparatorProps,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

export type ResizablePanelGroupProps = Omit<GroupProps, "orientation"> & {
  /** @deprecated Prefer `orientation` — kept for shadcn-style call sites */
  direction?: GroupProps["orientation"]
  /** Alias for `orientation` */
  orientation?: GroupProps["orientation"]
  /** Persist layout to `localStorage` under this id (react-resizable-panels v3 `autoSaveId` compatibility) */
  autoSaveId?: string
}

function ResizablePanelGroupInner({
  className,
  direction,
  orientation,
  autoSaveId: _autoSaveId,
  ...props
}: ResizablePanelGroupProps) {
  const resolvedOrientation = direction ?? orientation ?? "horizontal"
  return (
    <Group
      className={cn("flex h-full w-full", className)}
      orientation={resolvedOrientation}
      {...props}
    />
  )
}

function ResizablePanelGroupPersisted({
  autoSaveId,
  className,
  direction,
  orientation,
  ...props
}: ResizablePanelGroupProps & { autoSaveId: string }) {
  const resolvedOrientation = direction ?? orientation ?? "horizontal"
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: autoSaveId,
    storage:
      typeof globalThis !== "undefined" && "localStorage" in globalThis
        ? globalThis.localStorage
        : undefined,
  })

  return (
    <Group
      {...props}
      className={cn("flex h-full w-full", className)}
      orientation={resolvedOrientation}
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
    />
  )
}

function ResizablePanelGroup(props: ResizablePanelGroupProps) {
  if (props.autoSaveId) {
    return <ResizablePanelGroupPersisted {...props} autoSaveId={props.autoSaveId} />
  }
  return <ResizablePanelGroupInner {...props} />
}

/** Alias of `Panel` — preserves primitive identity and ref behavior. */
const ResizablePanel = Panel

type ResizableHandleProps = SeparatorProps & { withHandle?: boolean }

const ResizableHandle = React.forwardRef<
  HTMLDivElement,
  ResizableHandleProps
>(({ withHandle, className, elementRef: elementRefProp, ...props }, ref) => {
  const setElementRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        ;(ref as React.MutableRefObject<HTMLDivElement | null>).current = node
      }
      if (typeof elementRefProp === "function") {
        elementRefProp(node)
      } else if (elementRefProp) {
        ;(elementRefProp as React.MutableRefObject<HTMLDivElement | null>).current =
          node
      }
    },
    [ref, elementRefProp],
  )

  return (
    <Separator
      elementRef={setElementRef}
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
    </Separator>
  )
})
ResizableHandle.displayName = "ResizableHandle"

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
