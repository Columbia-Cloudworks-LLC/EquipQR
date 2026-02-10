import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { JitteredPoint } from '@/features/dashboard/utils/jitterPoints';

interface ClusterBadgePopoverProps {
  /** All points in the cluster */
  members: JitteredPoint[];
  /** Position to render the popover trigger (from Recharts shape props) */
  cx: number;
  cy: number;
  /** Callback when a specific team is selected */
  onTeamSelect?: (point: JitteredPoint) => void;
}

/**
 * Renders a cluster count badge on the scatter plot for 3+ overlapping points.
 * Clicking the badge opens a popover listing all teams in the cluster.
 */
export const ClusterBadgePopover: React.FC<ClusterBadgePopoverProps> = ({
  members,
  cx,
  cy,
  onTeamSelect,
}) => {
  const navigate = useNavigate();
  const count = members.length;

  if (count < 3) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <g
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          aria-label={`Cluster of ${count} teams at this position`}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.currentTarget.dispatchEvent(
                new MouseEvent('click', { bubbles: true })
              );
            }
          }}
        >
          {/* Background circle */}
          <circle
            cx={cx}
            cy={cy}
            r={16}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={2}
            opacity={0.9}
          />
          {/* Count text */}
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fill="hsl(var(--primary-foreground))"
            fontSize={11}
            fontWeight={600}
          >
            {count}
          </text>
        </g>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        side="right"
        sideOffset={8}
        align="start"
      >
        <div className="px-3 py-2 border-b border-border">
          <p className="text-sm font-medium">{count} teams at this point</p>
          <p className="text-xs text-muted-foreground">
            Select a team to view details
          </p>
        </div>
        <div className="max-h-48 overflow-y-auto py-1">
          {members.map((member) => (
            <button
              key={member.teamId}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => {
                if (onTeamSelect) {
                  onTeamSelect(member);
                } else {
                  navigate(`/dashboard/work-orders?team=${member.teamId}`);
                }
              }}
            >
              <span className="font-medium truncate">{member.teamName}</span>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                {member.equipmentCount} equip / {member.activeWorkOrdersCount} WOs
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface ScatterPointShapeProps {
  cx?: number;
  cy?: number;
  payload?: JitteredPoint;
  /** All jittered points — passed down for cluster lookup */
  allPoints?: JitteredPoint[];
  /** Callback when a team is selected from a cluster badge */
  onTeamSelect?: (point: JitteredPoint) => void;
}

/**
 * Custom Recharts scatter shape that renders individual dots for normal points
 * and a cluster badge with count for groups of 3+ overlapping points.
 * Points in clusters of 2 are rendered as individual jittered dots.
 */
export const ScatterPointShape: React.FC<ScatterPointShapeProps> = ({
  cx = 0,
  cy = 0,
  payload,
  allPoints = [],
  onTeamSelect,
}) => {
  if (!payload) return null;

  const { clusterSize, clusterIndex, clusterKey } = payload;

  // For clusters of 3+, only the first point in the cluster renders the badge
  // (other cluster members render nothing to avoid duplicate badges)
  if (clusterSize >= 3) {
    if (clusterIndex === 0) {
      const members = allPoints.filter((p) => p.clusterKey === clusterKey);
      return (
        <ClusterBadgePopover
          members={members}
          cx={cx}
          cy={cy}
          onTeamSelect={onTeamSelect}
        />
      );
    }
    // Non-first members of a large cluster: don't render (badge covers them)
    return null;
  }

  // Individual point or cluster of 2 — render as a dot
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill="hsl(var(--primary))"
      stroke="hsl(var(--background))"
      strokeWidth={1.5}
      style={{ cursor: 'pointer' }}
      role="img"
      aria-label={`${payload.teamName}: ${payload.equipmentCount} equipment, ${payload.activeWorkOrdersCount} active work orders`}
    />
  );
};
