
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Clock } from 'lucide-react';
import { useEquipmentWorkOrders } from '@/hooks/useEquipment';
import { useIsMobile } from '@/hooks/use-mobile';
import WorkOrderForm from '@/components/work-orders/WorkOrderForm';
import MobileWorkOrderCard from './MobileWorkOrderCard';
import DesktopWorkOrderCard from '@/components/work-orders/DesktopWorkOrderCard';
import { HistoricalWorkOrderBadge } from '@/components/work-orders/HistoricalWorkOrderBadge';

interface EquipmentWorkOrdersTabProps {
  equipmentId: string;
  organizationId: string;
  onCreateWorkOrder?: () => void;
}

const EquipmentWorkOrdersTab: React.FC<EquipmentWorkOrdersTabProps> = ({
  equipmentId,
  organizationId,
  onCreateWorkOrder,
}) => {
  const navigate = useNavigate();
  const [showWorkOrderForm, setShowWorkOrderForm] = useState(false);
  const { data: workOrders = [], isLoading } = useEquipmentWorkOrders(organizationId, equipmentId);
  const isMobile = useIsMobile();

  const handleCreateWorkOrder = () => {
    if (onCreateWorkOrder) {
      onCreateWorkOrder();
    } else {
      setShowWorkOrderForm(true);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className={isMobile ? "p-4" : "pt-6"}>
              <div className={`bg-muted animate-pulse rounded ${isMobile ? 'h-20' : 'h-24'}`} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-3' : ''}`}>
        <div className={isMobile ? 'text-center' : ''}>
          <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>Work Orders</h3>
          <p className="text-sm text-muted-foreground">
            {workOrders.length} {workOrders.length === 1 ? 'work order' : 'work orders'}
          </p>
        </div>
        <Button onClick={handleCreateWorkOrder} size={isMobile ? 'sm' : 'default'} className={isMobile ? 'w-full' : ''}>
          <Plus className="h-4 w-4 mr-2" />
          {isMobile ? 'Create' : 'Create Work Order'}
        </Button>
      </div>

      {/* Work Orders List */}
      <div className="space-y-4">
        {workOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No work orders</h3>
              <p className="text-muted-foreground mb-4">
                No work orders have been created for this equipment yet.
              </p>
              <Button onClick={handleCreateWorkOrder}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Work Order
              </Button>
            </CardContent>
          </Card>
        ) : (
          workOrders.map((workOrder) => {
            // Type adapter for work order data
            const adaptedWorkOrder = {
              ...workOrder,
              equipmentId: workOrder.equipment_id || '',
              createdDate: workOrder.created_date,
              dueDate: workOrder.due_date,
              estimatedHours: workOrder.estimated_hours,
              completedDate: workOrder.completed_date,
              assigneeId: workOrder.assignee_id,
              teamId: undefined // Team info comes from equipment assignment
            };

            return (
              <div key={workOrder.id} className="space-y-2">
                {workOrder.is_historical && (
                  <HistoricalWorkOrderBadge workOrder={workOrder} />
                )}
                {isMobile ? (
                  <MobileWorkOrderCard 
                    workOrder={adaptedWorkOrder} 
                  />
                ) : (
                  <DesktopWorkOrderCard 
                    workOrder={adaptedWorkOrder}
                    onNavigate={(id) => navigate(`/dashboard/work-orders/${id}`)}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Enhanced Work Order Form */}
      <WorkOrderForm
        open={showWorkOrderForm}
        onClose={() => setShowWorkOrderForm(false)}
        equipmentId={equipmentId}
      />
    </div>
  );
};

export default EquipmentWorkOrdersTab;
