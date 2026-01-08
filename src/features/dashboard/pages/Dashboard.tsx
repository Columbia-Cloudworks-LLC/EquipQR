
import React from 'react';
import { Forklift, Users, ClipboardList, AlertTriangle } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedDashboardStats, useTeamBasedEquipment, useTeamBasedRecentWorkOrders, useTeamBasedDashboardAccess } from '@/features/teams/hooks/useTeamBasedDashboard';
import { StatsCard } from '@/features/dashboard/components/StatsCard';
import TeamQuickList from '@/features/dashboard/components/TeamQuickList';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { DashboardHighPriorityWorkOrdersCard } from '@/features/dashboard/components/DashboardHighPriorityWorkOrdersCard';
import { DashboardRecentEquipmentCard } from '@/features/dashboard/components/DashboardRecentEquipmentCard';
import { DashboardRecentWorkOrdersCard } from '@/features/dashboard/components/DashboardRecentWorkOrdersCard';
import { DashboardNoTeamsCard } from '@/features/dashboard/components/DashboardNoTeamsCard';

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
        <DashboardNoTeamsCard organizationName={currentOrganization.name} />
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
            icon={<Forklift className="h-4 w-4" />}
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
  const activeWorkOrdersCount = workOrders?.filter((wo) => wo.status !== "completed").length || 0;

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="flex flex-col space-y-6">
        <PageHeader 
          title="Dashboard" 
          description={`Welcome back to ${currentOrganization.name}`} 
        />

        {/* High Priority section - positioned via CSS to prevent layout shift */}
        {/* Mobile: order-1 (first), Desktop: order-5 (last) */}
        {highPriorityWorkOrders.length > 0 && (
          <div className="order-1 md:order-5">
            <DashboardHighPriorityWorkOrdersCard workOrders={highPriorityWorkOrders} />
          </div>
        )}

        {/* Stats Cards */}
        {/* Mobile: order-2 (second), Desktop: order-1 (first) */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 order-2 md:order-1">
        <StatsCard
          icon={<Forklift className="h-4 w-4" />}
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
          sublabel={`${activeWorkOrdersCount} active`}
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
          <DashboardRecentEquipmentCard equipment={recentEquipment} isLoading={equipmentLoading} />
          <DashboardRecentWorkOrdersCard workOrders={recentWorkOrders} isLoading={workOrdersLoading} />
        </div>
      </div>
    </Page>
  );
};

export default Dashboard;
