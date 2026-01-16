import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
import type { FleetEfficiencyPoint } from '@/features/teams/services/teamFleetEfficiencyService';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const [selectedTeam, setSelectedTeam] = React.useState<FleetEfficiencyPoint | null>(null);
  const [menuPosition, setMenuPosition] = React.useState<{ x: number; y: number } | null>(null);

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

  const handlePointClick = (point: FleetEfficiencyPoint, event: unknown) => {
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

  const handleNavigate = (target: 'equipment' | 'work-orders') => {
    if (!selectedTeam) return;
    const basePath = target === 'equipment' ? '/dashboard/equipment' : '/dashboard/work-orders';
    const teamId = selectedTeam.teamId;
    setMenuOpen(false);
    setSheetOpen(false);
    resetSelection();
    navigate(`${basePath}?team=${teamId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle id="fleet-efficiency-heading" className="flex items-center gap-2">
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
        ) : data && data.length > 0 ? (
          <div className="h-72 relative" ref={containerRef}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="equipmentCount"
                  name="Total Equipment"
                  allowDecimals={false}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  type="number"
                  dataKey="activeWorkOrdersCount"
                  name="Active Work Orders"
                  allowDecimals={false}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--border))' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) {
                      return null;
                    }
                    const point = payload[0]?.payload as {
                      teamName: string;
                      equipmentCount: number;
                      activeWorkOrdersCount: number;
                    };

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
                  data={data}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--primary))"
                  onClick={(point, _index, event) => handlePointClick(point, event)}
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
