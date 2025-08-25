
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Package, Calendar, MapPin } from 'lucide-react';
import { FleetMapSubscription } from '@/hooks/useFleetMapSubscription';

interface OrganizationData {
  plan?: string | null;
}

interface EquipmentItem {
  status?: string | null;
}

interface OrganizationOverviewProps {
  organization: OrganizationData | null;
  members: unknown[];
  equipment: EquipmentItem[];
  fleetMapSubscription?: FleetMapSubscription;
}

const OrganizationOverview: React.FC<OrganizationOverviewProps> = ({
  organization,
  members,
  equipment,
  fleetMapSubscription
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{members.length}</div>
          <p className="text-xs text-muted-foreground">
            {organization?.plan === 'free' ? `${members.length}/5 free plan limit` : 'Unlimited'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Equipment</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{equipment.length}</div>
            <p className="text-xs text-muted-foreground">
              {equipment.filter((e) => e.status === 'active').length} active
            </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Plan</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">{organization?.plan}</div>
          <p className="text-xs text-muted-foreground">
            Current subscription plan
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fleet Map</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <Badge variant={fleetMapSubscription?.active ? 'default' : 'secondary'}>
              {fleetMapSubscription?.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Premium add-on feature
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationOverview;
