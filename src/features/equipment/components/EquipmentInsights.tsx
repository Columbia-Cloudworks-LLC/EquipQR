import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Forklift, 
  CheckCircle, 
  Wrench, 
  XCircle, 
  AlertTriangle,
  MapPin
} from 'lucide-react';
import { 
  useEquipmentInsights, 
  getStatusPercentage, 
  truncateText 
} from "@/features/equipment/hooks/useEquipmentInsights";
import { getStatusTextColor } from "@/features/equipment/utils/equipmentHelpers";

interface Equipment {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: string;
  location: string;
  installation_date: string;
  warranty_expiration?: string;
  last_maintenance?: string;
  team_id?: string;
}

interface EquipmentInsightsProps {
  equipment: Equipment[];
  filteredEquipment: Equipment[];
}

const STATUS_ICONS = {
  active: CheckCircle,
  maintenance: Wrench,
  inactive: XCircle,
} as const;

const EquipmentInsights: React.FC<EquipmentInsightsProps> = ({
  equipment,
  filteredEquipment
}) => {
  const insights = useEquipmentInsights(equipment, filteredEquipment);

  const statusItems = [
    { status: 'active' as const, count: insights.statusCounts.active },
    { status: 'maintenance' as const, count: insights.statusCounts.maintenance },
    { status: 'inactive' as const, count: insights.statusCounts.inactive },
  ];

  return (
    <div className="space-y-4 mb-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Insights</h2>
        <p className="text-sm text-muted-foreground">Key metrics across your equipment fleet.</p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
        <span>Showing {insights.filteredTotal} of {insights.totalEquipment} equipment items</span>
        {insights.hasFiltersApplied && (
          <span className="text-xs sm:text-sm">{insights.filteredTotal} match current filters</span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Forklift className="h-4 w-4 mr-2" />
              Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusItems.map(({ status, count }) => {
              const Icon = STATUS_ICONS[status];
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Icon className={`h-4 w-4 mr-2 ${getStatusTextColor(status)}`} />
                    <span className="text-sm capitalize">{status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    {insights.filteredTotal > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({getStatusPercentage(count, insights.filteredTotal)}%)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Maintenance Insights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Wrench className="h-4 w-4 mr-2" />
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Needs Maintenance</span>
              <Badge variant={insights.maintenanceInsights.needsMaintenance > 0 ? "destructive" : "secondary"}>
                {insights.maintenanceInsights.needsMaintenance}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Recently Maintained</span>
              <Badge variant="secondary">{insights.maintenanceInsights.recentlyMaintained}</Badge>
            </div>
            {insights.filteredTotal > 0 && (
              <div className="pt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Maintenance Rate</span>
                  <span>{insights.maintenanceInsights.maintenanceRate}%</span>
                </div>
                <Progress value={insights.maintenanceInsights.maintenanceRate} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warranty Insights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Warranty Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Expiring Soon</span>
              <Badge variant={insights.warrantyInsights.expiringSoon > 0 ? "destructive" : "secondary"}>
                {insights.warrantyInsights.expiringSoon}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Expired</span>
              <Badge variant={insights.warrantyInsights.expired > 0 ? "destructive" : "secondary"}>
                {insights.warrantyInsights.expired}
              </Badge>
            </div>
            {insights.warrantyInsights.hasWarrantyIssues && (
              <div className="text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                Attention required
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Locations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Top Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.topLocations.length > 0 ? (
              insights.topLocations.map(({ location, count }) => (
                <div key={location} className="flex items-center justify-between">
                  <span className="text-sm truncate" title={location}>
                    {truncateText(location)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {count}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Top Manufacturers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Forklift className="h-4 w-4 mr-2" />
              Top Manufacturers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.topManufacturers.length > 0 ? (
              insights.topManufacturers.map(({ manufacturer, count }) => (
                <div key={manufacturer} className="flex items-center justify-between">
                  <span className="text-sm truncate" title={manufacturer}>
                    {truncateText(manufacturer)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {count}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EquipmentInsights;
