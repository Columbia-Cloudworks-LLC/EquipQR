/**
 * Mobile Work Order In-Progress Bar
 * 
 * A sticky bottom tray that appears when a work order is in progress.
 * Provides quick access to common actions while working on a job.
 * Includes timer display and offline indicator.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Camera, 
  CheckCircle, 
  Pause, 
  Play,
  Loader2,
  WifiOff,
  RefreshCw,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileWorkOrderInProgressBarProps {
  workOrderId: string;
  workOrderStatus: 'in_progress' | 'on_hold';
  canComplete: boolean;
  canChangeStatus: boolean;
  canAddNotes: boolean;
  isUpdatingStatus: boolean;
  onAddNote: () => void;
  onAddPhoto: () => void;
  onPauseResume: () => void;
  onComplete: () => void;
  timerDisplay?: string;
  isTimerRunning?: boolean;
  onToggleTimer?: () => void;
  isOnline?: boolean;
  isSyncing?: boolean;
}

export const MobileWorkOrderInProgressBar: React.FC<MobileWorkOrderInProgressBarProps> = ({
  workOrderStatus,
  canComplete,
  canChangeStatus,
  canAddNotes,
  isUpdatingStatus,
  onAddNote,
  onAddPhoto,
  onPauseResume,
  onComplete,
  timerDisplay,
  isTimerRunning,
  onToggleTimer,
  isOnline = true,
  isSyncing = false,
}) => {
  const isOnHold = workOrderStatus === 'on_hold';
  const isInProgress = workOrderStatus === 'in_progress';

  return (
    <div className="fixed bottom-[70px] left-0 right-0 z-fixed border-t bg-background/95 backdrop-blur-sm lg:hidden">
      {/* Offline/Syncing Indicator Banner */}
      {(!isOnline || isSyncing) && (
        <div className={cn(
          "px-3 py-1.5 text-xs flex items-center justify-center gap-1.5",
          !isOnline 
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
            : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
        )}>
          {!isOnline ? (
            <>
              <WifiOff className="h-3 w-3" />
              <span>Offline - Changes saved locally</span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Syncing...</span>
            </>
          ) : null}
        </div>
      )}

      <div className="p-3 pb-safe-bottom">
        {/* Status and Timer Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                isOnHold 
                  ? "bg-yellow-50 text-yellow-700 border-yellow-200" 
                  : "bg-green-50 text-green-700 border-green-200"
              )}
            >
              {isOnHold ? 'On Hold' : 'In Progress'}
            </Badge>
          </div>

          {/* Timer Display */}
          {timerDisplay && (
            <button 
              onClick={onToggleTimer}
              disabled={!onToggleTimer}
              aria-disabled={!onToggleTimer}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-mono transition-colors",
                isTimerRunning 
                  ? "bg-primary/10 text-primary" 
                  : "bg-muted text-muted-foreground",
                !onToggleTimer && "opacity-50 cursor-not-allowed"
              )}
            >
              <Timer className={cn("h-3.5 w-3.5", isTimerRunning && "animate-pulse")} />
              {timerDisplay}
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          {canAddNotes && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-11"
                onClick={onAddNote}
              >
                <Plus className="h-4 w-4 mr-1" />
                Note
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-11"
                onClick={onAddPhoto}
                aria-label="Add photo"
                title="Add photo"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Pause Button (only when in progress; resume uses primary "Resume Work" below) */}
          {canChangeStatus && isInProgress && (
            <Button
              variant="outline"
              size="sm"
              className="h-11"
              onClick={onPauseResume}
              disabled={isUpdatingStatus}
              aria-label={isUpdatingStatus ? "Updating status" : "Pause work order"}
              title={isUpdatingStatus ? "Updating status" : "Pause work order"}
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Complete Button */}
          {canChangeStatus && isInProgress && (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-11"
              onClick={onComplete}
              disabled={isUpdatingStatus || !canComplete}
              title={!canComplete ? 'Complete PM checklist first' : undefined}
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Complete
            </Button>
          )}

          {/* Resume Button when On Hold */}
          {canChangeStatus && isOnHold && (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-11"
              onClick={onPauseResume}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Resume Work
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileWorkOrderInProgressBar;
