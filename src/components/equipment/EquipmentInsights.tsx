import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  CheckCircle, 
  Wrench, 
  XCircle, 
  AlertTriangle,
  MapPin
} from 'lucide-react';

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

const EquipmentInsights: React.FC<EquipmentInsightsProps> = ({
  equipment,
  filteredEquipment
}) => {
  const totalEquipment = equipment.length;
  const filteredTotal = filteredEquipment.length;

  // Status breakdown
  const statusCounts = filteredEquipment.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeCount = statusCounts.active || 0;
  const maintenanceCount = statusCounts.maintenance || 0;
  const inactiveCount = statusCounts.inactive || 0;

  // Location breakdown (top 5)
  const locationCounts = filteredEquipment.reduce((acc, item) => {
    acc[item.location] = (acc[item.location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topLocations = Object.entries(locationCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Manufacturer breakdown (top 5)
  const manufacturerCounts = filteredEquipment.reduce((acc, item) => {
    acc[item.manufacturer] = (acc[item.manufacturer] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topManufacturers = Object.entries(manufacturerCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Warranty insights
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
  
  const warrantyExpiringSoon = filteredEquipment.filter(item => 
    item.warranty_expiration && 
    new Date(item.warranty_expiration) <= thirtyDaysFromNow &&
    new Date(item.warranty_expiration) >= now
  ).length;

  const warrantyExpired = filteredEquipment.filter(item => 
    item.warranty_expiration && 
    new Date(item.warranty_expiration) < now
  ).length;

  // Maintenance insights
  const needsMaintenance = filteredEquipment.filter(item => 
    item.status === 'maintenance'
  ).length;

  const recentlyMaintained = filteredEquipment.filter(item => {
    if (!item.last_maintenance) return false;
    const maintenanceDate = new Date(item.last_maintenance);
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    return maintenanceDate >= sevenDaysAgo;
  }).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'maintenance': return 'text-yellow-600';
      case 'inactive': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
        <span>Showing {filteredTotal} of {totalEquipment} equipment items</span>
        {filteredTotal !== totalEquipment && (
          <span className="text-xs sm:text-sm">{filteredTotal} match current filters</span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center">
            <Package className="h-4 w-4 mr-2" />
            Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { status: 'active', count: activeCount, icon: CheckCircle },
            { status: 'maintenance', count: maintenanceCount, icon: Wrench },
            { status: 'inactive', count: inactiveCount, icon: XCircle }
          ].map(({ status, count, icon: Icon }) => (
            <div key={status} className="flex items-center justify-between">
              <div className="flex items-center">
                <Icon className={`h-4 w-4 mr-2 ${getStatusColor(status)}`} />
                <span className="text-sm capitalize">{status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{count}</span>
                {filteredTotal > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({Math.round((count / filteredTotal) * 100)}%)
                  </span>
                )}
              </div>
            </div>
          ))}
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
            <Badge variant={needsMaintenance > 0 ? "destructive" : "secondary"}>
              {needsMaintenance}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Recently Maintained</span>
            <Badge variant="secondary">{recentlyMaintained}</Badge>
          </div>
          {filteredTotal > 0 && (
            <div className="pt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Maintenance Rate</span>
                <span>{Math.round((needsMaintenance / filteredTotal) * 100)}%</span>
              </div>
              <Progress value={(needsMaintenance / filteredTotal) * 100} className="h-2" />
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
            <Badge variant={warrantyExpiringSoon > 0 ? "destructive" : "secondary"}>
              {warrantyExpiringSoon}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Expired</span>
            <Badge variant={warrantyExpired > 0 ? "destructive" : "secondary"}>
              {warrantyExpired}
            </Badge>
          </div>
          {(warrantyExpiringSoon > 0 || warrantyExpired > 0) && (
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
          {topLocations.length > 0 ? (
            topLocations.map(([location, count]) => (
              <div key={location} className="flex items-center justify-between">
                <span className="text-sm truncate" title={location}>
                  {location.length > 15 ? `${location.substring(0, 15)}...` : location}
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center">
            <Package className="h-4 w-4 mr-2" />
            Top Manufacturers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topManufacturers.length > 0 ? (
            topManufacturers.map(([manufacturer, count]) => (
              <div key={manufacturer} className="flex items-center justify-between">
                <span className="text-sm truncate" title={manufacturer}>
                  {manufacturer.length > 15 ? `${manufacturer.substring(0, 15)}...` : manufacturer}
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