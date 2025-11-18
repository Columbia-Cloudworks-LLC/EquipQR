
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, ClipboardList, AlertTriangle } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedDashboardStats, useTeamBasedEquipment, useTeamBasedRecentWorkOrders, useTeamBasedDashboardAccess } from '@/hooks/useTeamBasedDashboard';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { StatsCard } from '@/components/dashboard/StatsCard';
import TeamQuickList from '@/components/dashboard/TeamQuickList';

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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Please select an organization to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Show message for users without team access
  if (!isLoading && !hasTeamAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to {currentOrganization.name}
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome to {currentOrganization.name}</CardTitle>
            <CardDescription>
              You are not yet a member of any teams in {currentOrganization.name}. Contact an organization administrator to give you a role on a team to see equipment and work orders for that team.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back to {currentOrganization.name}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </div>
    );
  }

  const recentEquipment = equipment?.slice(0, 5) || [];
  const recentWorkOrders = workOrders?.slice(0, 5) || [];
  const highPriorityWorkOrders = workOrders?.filter(wo => wo.priority === 'high' && wo.status !== 'completed') || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back to {currentOrganization.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      <TeamQuickList />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Equipment */}
        <Card>
          <CardHeader>
            <Link to="/dashboard/equipment" className="hover:opacity-80 transition-opacity">
              <CardTitle className="flex items-center gap-2 cursor-pointer">
                <Package className="h-5 w-5" />
                Recent Equipment
              </CardTitle>
              <CardDescription>
                Latest equipment in your fleet
              </CardDescription>
            </Link>
          </CardHeader>
          <CardContent>
            {equipmentLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : recentEquipment.length > 0 ? (
              <div className="space-y-4">
                {recentEquipment.map((item) => (
                  <Link 
                    key={item.id} 
                    to={`/dashboard/equipment/${item.id}`}
                    className="flex items-center justify-between p-2 -m-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.manufacturer} {item.model}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        item.status === 'active' ? 'default' : 
                        item.status === 'maintenance' ? 'destructive' : 'secondary'
                      }
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

        {/* Recent Work Orders */}
        <Card>
          <CardHeader>
            <Link to="/dashboard/work-orders" className="hover:opacity-80 transition-opacity">
              <CardTitle className="flex items-center gap-2 cursor-pointer">
                <ClipboardList className="h-5 w-5" />
                Recent Work Orders
              </CardTitle>
              <CardDescription>
                Latest work order activity
              </CardDescription>
            </Link>
          </CardHeader>
          <CardContent>
            {workOrdersLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : recentWorkOrders.length > 0 ? (
              <div className="space-y-4">
                {recentWorkOrders.map((order) => (
                  <Link 
                    key={order.id} 
                    to={`/dashboard/work-orders/${order.id}`}
                    className="flex items-center justify-between p-2 -m-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{order.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.priority} priority • {order.assigneeName || 'Unassigned'}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        order.status === 'completed' ? 'default' : 
                        order.status === 'in_progress' ? 'secondary' : 'outline'
                      }
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
      </div>

      {/* High Priority Alerts */}
      {highPriorityWorkOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
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
                  className="flex items-center justify-between p-3 border border-destructive/20 rounded-lg hover:bg-destructive/5 transition-colors"
                >
                  <div>
                    <p className="font-medium">{order.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(order.createdDate).toLocaleDateString()}
                      {order.dueDate && (
                        <> • Due: {new Date(order.dueDate).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <Badge variant="destructive">High Priority</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
