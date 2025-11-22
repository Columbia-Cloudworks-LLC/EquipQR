
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, ClipboardList, AlertTriangle, ChevronRight } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedDashboardStats, useTeamBasedEquipment, useTeamBasedRecentWorkOrders, useTeamBasedDashboardAccess } from '@/hooks/useTeamBasedDashboard';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { StatsCard } from '@/components/dashboard/StatsCard';
import TeamQuickList from '@/components/dashboard/TeamQuickList';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';

const Dashboard = () => {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id;
  
  const { hasTeamAccess, isLoading: accessLoading } = useTeamBasedDashboardAccess();
  const { data: stats, isLoading: statsLoading } = useTeamBasedDashboardStats(organizationId);
  const { data: equipment, isLoading: equipmentLoading } = useTeamBasedEquipment(organizationId);
  const { data: workOrders, isLoading: workOrdersLoading } = useTeamBasedRecentWorkOrders(organizationId);

  const isLoading = orgLoading || statsLoading || accessLoading;


  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader 
          title="Dashboard" 
          description="Please select an organization to view your dashboard." 
        />
      </Page>
    );
  }

  // Show message for users without team access
  if (!isLoading && !hasTeamAccess) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader 
          title="Dashboard" 
          description={`Welcome to ${currentOrganization.name}`} 
        />
        <Card>
          <CardHeader>
            <CardTitle>Welcome to {currentOrganization.name}</CardTitle>
            <CardDescription>
              You are not yet a member of any teams in {currentOrganization.name}. Contact an organization administrator to give you a role on a team to see equipment and work orders for that team.
            </CardDescription>
          </CardHeader>
        </Card>
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader 
          title="Dashboard" 
          description={`Welcome back to ${currentOrganization.name}`} 
        />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatsCard
            icon={<Package className="h-4 w-4" />}
            label="Total Equipment"
            value={0}
            sublabel="0 active"
            loading={true}
          />
          <StatsCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Overdue Work"
            value={0}
            sublabel="Past due work orders"
            loading={true}
          />
          <StatsCard
            icon={<ClipboardList className="h-4 w-4" />}
            label="Total Work Orders"
            value={0}
            sublabel="0 active"
            loading={true}
          />
          <StatsCard
            icon={<Users className="h-4 w-4" />}
            label="Org Members"
            value={0}
            sublabel="Active organization members"
            loading={true}
          />
        </div>
      </Page>
    );
  }

  const recentEquipment = equipment?.slice(0, 5) || [];
  const recentWorkOrders = workOrders?.slice(0, 5) || [];
  const highPriorityWorkOrders = workOrders?.filter(wo => wo.priority === 'high' && wo.status !== 'completed') || [];

  // High Priority Work Orders section
  const highPrioritySection = highPriorityWorkOrders.length > 0 && (
    <section aria-labelledby="high-priority-heading">
      <Card>
        <CardHeader>
          <CardTitle id="high-priority-heading" className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            High Priority Work Orders
          </CardTitle>
          <CardDescription>
            {highPriorityWorkOrders.length} work orders require immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {highPriorityWorkOrders.map((order) => (
              <Link 
                key={order.id} 
                to={`/dashboard/work-orders/${order.id}`}
                className="flex items-center justify-between p-3 border border-destructive/20 rounded-lg hover:bg-destructive/5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium line-clamp-2">{order.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(order.createdDate).toLocaleDateString()}
                    {order.dueDate && (
                      <> • Due: {new Date(order.dueDate).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <Badge variant="destructive" className="ml-2 flex-shrink-0">High Priority</Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="flex flex-col space-y-6">
        <PageHeader 
          title="Dashboard" 
          description={`Welcome back to ${currentOrganization.name}`} 
        />

        {/* High Priority section - positioned via CSS to prevent layout shift */}
        {/* Mobile: order-1 (first), Desktop: order-5 (last) */}
        {highPrioritySection && (
          <div className="order-1 md:order-5">
            {highPrioritySection}
          </div>
        )}

        {/* Stats Cards */}
        {/* Mobile: order-2 (second), Desktop: order-1 (first) */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 order-2 md:order-1">
        <StatsCard
          icon={<Package className="h-4 w-4" />}
          label="Total Equipment"
          value={stats?.totalEquipment || 0}
          sublabel={`${stats?.activeEquipment || 0} active`}
          to="/dashboard/equipment"
          ariaDescription="View all equipment in the fleet"
        />

        <StatsCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Overdue Work"
          value={stats?.overdueWorkOrders || 0}
          sublabel="Past due work orders"
          to="/dashboard/work-orders?date=overdue"
          ariaDescription="View overdue work orders"
        />

        <StatsCard
          icon={<ClipboardList className="h-4 w-4" />}
          label="Total Work Orders"
          value={stats?.totalWorkOrders || 0}
          sublabel={`${workOrders?.filter(wo => wo.status !== 'completed').length || 0} active`}
          to="/dashboard/work-orders"
          ariaDescription="View all work orders"
        />

        <StatsCard
          icon={<Users className="h-4 w-4" />}
          label="Org Members"
          value={currentOrganization.memberCount}
          sublabel="Active organization members"
          to="/dashboard/organization"
          ariaDescription="View organization members"
        />
        </div>

        {/* Team Quick List */}
        {/* Mobile: order-3 (third), Desktop: order-2 (second) */}
        <section aria-labelledby="teams-heading" className="order-3 md:order-2">
          <TeamQuickList />
        </section>

        {/* Recent Equipment and Work Orders */}
        {/* Mobile: order-4 (fourth), Desktop: order-3 (third) */}
        <div className="grid gap-6 md:grid-cols-2 order-4 md:order-3">
          {/* Recent Equipment */}
          <section aria-labelledby="recent-equipment-heading">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle id="recent-equipment-heading" className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Recent Equipment
                    </CardTitle>
                    <CardDescription>
                      Latest equipment in your fleet
                    </CardDescription>
                  </div>
                  <Link 
                    to="/dashboard/equipment" 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none rounded"
                  >
                    View all
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {equipmentLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : recentEquipment.length > 0 ? (
                  <div className="space-y-4 md:max-h-64 md:overflow-y-auto">
                    {recentEquipment.map((item) => (
                      <Link 
                        key={item.id} 
                        to={`/dashboard/equipment/${item.id}`}
                        className="flex items-center justify-between p-2 -m-2 rounded-lg hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-clamp-2">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.manufacturer} {item.model}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            item.status === 'active' ? 'default' : 
                            item.status === 'maintenance' ? 'destructive' : 'secondary'
                          }
                          className="ml-2 flex-shrink-0"
                        >
                          {item.status}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No equipment found</p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Recent Work Orders */}
          <section aria-labelledby="recent-work-orders-heading">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle id="recent-work-orders-heading" className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      Recent Work Orders
                    </CardTitle>
                    <CardDescription>
                      Latest work order activity
                    </CardDescription>
                  </div>
                  <Link 
                    to="/dashboard/work-orders" 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none rounded"
                  >
                    View all
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {workOrdersLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : recentWorkOrders.length > 0 ? (
                  <div className="space-y-4 md:max-h-64 md:overflow-y-auto">
                    {recentWorkOrders.map((order) => (
                      <Link 
                        key={order.id} 
                        to={`/dashboard/work-orders/${order.id}`}
                        className="flex items-center justify-between p-2 -m-2 rounded-lg hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-clamp-2">{order.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.priority} priority • {order.assigneeName || 'Unassigned'}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            order.status === 'completed' ? 'default' : 
                            order.status === 'in_progress' ? 'secondary' : 'outline'
                          }
                          className="ml-2 flex-shrink-0"
                        >
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No work orders found</p>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </Page>
  );
};

export default Dashboard;
