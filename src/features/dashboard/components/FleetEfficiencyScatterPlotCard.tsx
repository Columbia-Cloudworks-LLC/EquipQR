import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import EmptyState from '@/components/ui/empty-state';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamFleetEfficiency } from '@/features/teams/hooks/useTeamBasedDashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { jitterPoints, type JitteredPoint } from '@/features/dashboard/utils/jitterPoints';
import { ScatterPointShape } from '@/features/dashboard/components/ClusterBadge';

const tooltipContainerClasses =
  'rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md';

const FleetEfficiencyScatterPlotCard: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  const { data, isLoading } = useTeamFleetEfficiency(organizationId);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<JitteredPoint | null>(null);
  const [menuPosition, setMenuPosition] = React.useState<{ x: number; y: number } | null>(null);

  // Apply jitter to prevent overlapping points
  const jitteredData = React.useMemo(
    () => (data && data.length > 0 ? jitterPoints(data) : []),
    [data]
  );

  if (!currentOrganization) {
    return null;
  }

  const resetSelection = () => {
    setSelectedTeam(null);
    setMenuPosition(null);
  };

  const handleMenuOpenChange = (nextOpen: boolean) => {
    setMenuOpen(nextOpen);
    if (!nextOpen) {
      resetSelection();
    }
  };

  const handleSheetOpenChange = (nextOpen: boolean) => {
    setSheetOpen(nextOpen);
    if (!nextOpen) {
      resetSelection();
    }
  };

  const resolveClientPoint = (event: unknown) => {
    if (!event) return null;
    const nativeEvent = (event as React.MouseEvent<SVGElement>).nativeEvent ?? event;
    if ('clientX' in nativeEvent && 'clientY' in nativeEvent) {
      return { x: nativeEvent.clientX as number, y: nativeEvent.clientY as number };
    }
    return null;
  };

  const handlePointClick = (point: JitteredPoint, event: unknown) => {
    // For clustered points (3+), the ClusterBadge handles interaction via popover
    if (point.clusterSize >= 3) return;

    setSelectedTeam(point);

    if (isMobile) {
      setSheetOpen(true);
      return;
    }

    const bounds = containerRef.current?.getBoundingClientRect();
    const clientPoint = resolveClientPoint(event);
    if (!bounds || !clientPoint) return;

    setMenuPosition({
      x: clientPoint.x - bounds.left,
      y: clientPoint.y - bounds.top,
    });
    setMenuOpen(true);
  };

  const handleTeamSelectFromCluster = (point: JitteredPoint) => {
    setSelectedTeam(point);
    if (isMobile) {
      setSheetOpen(true);
    } else {
      // For cluster popover selections, position the menu in the center of the chart
      const bounds = containerRef.current?.getBoundingClientRect();
      if (bounds) {
        setMenuPosition({
          x: bounds.width / 2,
          y: bounds.height / 2,
        });
        setMenuOpen(true);
      }
    }
  };

  const handleNavigate = (target: 'equipment' | 'work-orders') => {
    if (!selectedTeam) return;
    const basePath = target === 'equipment' ? '/dashboard/equipment' : '/dashboard/work-orders';
    const teamId = selectedTeam.teamId;
    setMenuOpen(false);
    setSheetOpen(false);
    resetSelection();
    navigate(`${basePath}?team=${teamId}`);
  };

  // Compute ZAxis range from data (use equipmentCount + activeWorkOrdersCount as a simple "weight")
  const zRange: [number, number] = [40, 120];

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" id="fleet-efficiency-heading" className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Fleet Efficiency
        </CardTitle>
        <CardDescription>
          Team equipment count versus active work orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : jitteredData.length > 0 ? (
          <div className="h-96 relative" ref={containerRef} role="img" aria-label={`Fleet efficiency scatter plot showing ${jitteredData.length} teams. X-axis: total equipment count, Y-axis: active work orders.`}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="jitteredX"
                  name="Total Equipment"
                  allowDecimals={false}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Equipment Count', position: 'insideBottom', offset: -5, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 } }}
                />
                <YAxis
                  type="number"
                  dataKey="jitteredY"
                  name="Active Work Orders"
                  allowDecimals={false}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Active Work Orders', angle: -90, position: 'insideLeft', offset: 10, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 } }}
                />
                <ZAxis
                  type="number"
                  dataKey="equipmentCount"
                  range={zRange}
                  name="Fleet Size"
                />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--border))' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) {
                      return null;
                    }
                    const point = payload[0]?.payload as JitteredPoint;

                    if (point.clusterSize >= 3) {
                      return (
                        <div className={tooltipContainerClasses}>
                          <div className="font-medium">
                            {point.clusterSize} teams at this point
                          </div>
                          <div className="text-muted-foreground">
                            Click to see all teams
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className={tooltipContainerClasses}>
                        <div className="font-medium">{point.teamName}</div>
                        <div className="text-muted-foreground">
                          Equipment: {point.equipmentCount}
                        </div>
                        <div className="text-muted-foreground">
                          Active work orders: {point.activeWorkOrdersCount}
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={jitteredData}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--primary))"
                  shape={(props: Record<string, unknown>) => (
                    <ScatterPointShape
                      {...props}
                      allPoints={jitteredData}
                      onTeamSelect={handleTeamSelectFromCluster}
                    />
                  )}
                  onClick={(point: unknown, _index: number, event: unknown) =>
                    handlePointClick(point as JitteredPoint, event)
                  }
                />
              </ScatterChart>
            </ResponsiveContainer>
            {!isMobile && menuPosition && selectedTeam && (
              <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 opacity-0"
                    style={{ left: menuPosition.x, top: menuPosition.y }}
                    tabIndex={-1}
                    aria-hidden
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="right" sideOffset={8}>
                  <DropdownMenuLabel>{selectedTeam.teamName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleNavigate('equipment')}>
                    View equipment
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleNavigate('work-orders')}>
                    View work orders
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isMobile && selectedTeam && (
              <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
                <SheetContent side="bottom" className="pb-8">
                  <SheetHeader className="text-left">
                    <SheetTitle>{selectedTeam.teamName}</SheetTitle>
                    <SheetDescription>
                      Team equipment count versus active work orders
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 space-y-2 text-sm text-foreground">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Equipment</span>
                      <span className="font-medium">{selectedTeam.equipmentCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Active work orders</span>
                      <span className="font-medium">{selectedTeam.activeWorkOrdersCount}</span>
                    </div>
                  </div>
                  <SheetFooter className="mt-6 gap-2">
                    <Button variant="outline" onClick={() => handleNavigate('equipment')}>
                      View equipment
                    </Button>
                    <Button onClick={() => handleNavigate('work-orders')}>
                      View work orders
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            )}
          </div>
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="No fleet efficiency data"
            description="Teams with equipment will appear here once they have assigned assets."
            className="py-8"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default FleetEfficiencyScatterPlotCard;
