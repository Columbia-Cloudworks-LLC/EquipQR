import * as React from "react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getStatusText } from "@/utils/pmChecklistHelpers"

interface SegmentedProgressProps {
  segments: Array<{
    id: string
    status: 'not_rated' | 'ok' | 'adjusted' | 'recommend_repairs' | 'requires_immediate_repairs' | 'unsafe_condition'
    section?: string
    title?: string
    notes?: string
  }>
  className?: string
}

const getSegmentColor = (status: SegmentedProgressProps['segments'][0]['status']) => {
  switch (status) {
    case 'ok':
      return 'bg-green-500'
    case 'adjusted':
      return 'bg-yellow-500'
    case 'recommend_repairs':
      return 'bg-orange-500'
    case 'requires_immediate_repairs':
      return 'bg-red-500'
    case 'unsafe_condition':
      return 'bg-red-700'
    case 'not_rated':
    default:
      return 'bg-muted'
  }
}

const SegmentedProgress = React.forwardRef<
  HTMLDivElement,
  SegmentedProgressProps
>(({ segments, className }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-md bg-secondary flex",
      className
    )}
  >
    {segments.map((segment, index) => {
      const hasDetails = segment.section || segment.title
      const statusText = getStatusText(segment.status)
      
      const tooltipContent = hasDetails ? (
        <div className="space-y-1 text-sm">
          {segment.section && (
            <div className="font-semibold">{segment.section}</div>
          )}
          {segment.title && (
            <div className="font-medium">{segment.title}</div>
          )}
          <div className="text-muted-foreground">Status: {statusText}</div>
          {segment.notes && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground font-medium mb-1">Notes:</div>
              <div className="text-xs">{segment.notes}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm">
          Item {index + 1}: {statusText}
        </div>
      )

      const segmentDiv = (
        <div
          className={cn(
            "h-full transition-all duration-300 cursor-help",
            getSegmentColor(segment.status),
            index > 0 && "border-l border-background"
          )}
          style={{ 
            width: `${100 / segments.length}%`,
            minWidth: segments.length <= 5 ? '12px' : '8px'
          }}
        />
      )

      return (
        <Tooltip key={segment.id}>
          <TooltipTrigger asChild>
            {segmentDiv}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      )
    })}
  </div>
))

SegmentedProgress.displayName = "SegmentedProgress"

export { SegmentedProgress }