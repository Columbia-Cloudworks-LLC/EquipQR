
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { User, Users, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useOrganizationAdmins } from '@/hooks/useOrganizationAdmins';
import { useSyncTeamsByOrganization } from '@/services/syncDataService';
import { useEquipmentById } from '@/components/equipment/hooks/useEquipment';
import { toast } from 'sonner';

import { WorkOrderLike } from '@/utils/workOrderTypeConversion';

interface WorkOrderAcceptanceModalProps {
  open: boolean;
  onClose: () => void;
  workOrder: WorkOrderLike;
  organizationId: string;
  onAccept: (assigneeId?: string) => Promise<void>;
}

interface AssigneeOption {
  id: string;
  name: string;
  type: 'user' | 'leave_unassigned';
  role?: string;
}

const WorkOrderAcceptanceModal: React.FC<WorkOrderAcceptanceModalProps> = ({
  open,
  onClose,
  workOrder,
  organizationId,
  onAccept
}) => {
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: currentUser } = useAuth();
  
  // Get organization data
  const { data: organizationMembers = [] } = useOrganizationMembers(organizationId);
  const { data: organizationAdmins = [] } = useOrganizationAdmins(organizationId);
  const { data: teams = [] } = useSyncTeamsByOrganization(organizationId);
  const { data: equipment } = useEquipmentById(organizationId, workOrder?.equipment_id || workOrder?.equipmentId);

  // Get current user info
  const isSingleUserOrg = organizationMembers.length === 1;

  // Build assignee options based on equipment team assignment
  const buildAssigneeOptions = (): AssigneeOption[] => {
    const options: AssigneeOption[] = [
      { id: 'unassigned', name: 'Leave Unassigned', type: 'leave_unassigned' }
    ];

    // Add current user
    if (currentUser) {
      options.push({
        id: currentUser.id,
        name: 'Me',
        type: 'user'
      });
    }

    if (equipment?.team_id) {
      // Equipment has team - show team members
      const equipmentTeam = teams.find(t => t.id === equipment.team_id);
      if (equipmentTeam?.members) {
        // Add team managers
        const teamManagers = equipmentTeam.members
          .filter(m => m.role === 'manager' && m.id !== currentUser?.id)
          .map(m => ({
            id: m.id,
            name: m.name,
            type: 'user' as const,
            role: 'Team Manager'
          }));

        // Add team technicians
        const teamTechnicians = equipmentTeam.members
          .filter(m => m.role === 'technician' && m.id !== currentUser?.id)
          .map(m => ({
            id: m.id,
            name: m.name,
            type: 'user' as const,
            role: 'Team Technician'
          }));

        options.push(...teamManagers, ...teamTechnicians);
      }
    } else {
      // No team assigned - show organization admins
      const orgAdmins = organizationAdmins
        .filter(admin => admin.id !== currentUser?.id)
        .map(admin => ({
          id: admin.id,
          name: admin.name,
          type: 'user' as const,
          role: admin.role === 'owner' ? 'Organization Owner' : 'Organization Admin'
        }));

      options.push(...orgAdmins);
    }

    // Remove duplicates based on ID
    const uniqueOptions = options.filter((option, index, self) => 
      index === self.findIndex(o => o.id === option.id)
    );

    return uniqueOptions;
  };

  const assigneeOptions = buildAssigneeOptions();

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      const assigneeId = selectedAssignee === 'unassigned' ? undefined : selectedAssignee;
      
      await onAccept(assigneeId);
      onClose();
      
      toast.success('Work order accepted successfully');
    } catch (error) {
      console.error('Error accepting work order:', error);
      toast.error('Failed to accept work order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // For single-user organizations, auto-select current user
  React.useEffect(() => {
    if (isSingleUserOrg && currentUser && open) {
      setSelectedAssignee(currentUser.id);
    }
  }, [isSingleUserOrg, currentUser, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Accept Work Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <h4 className="font-medium">{workOrder?.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {workOrder?.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {isSingleUserOrg ? (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-800">
                This work order will be automatically assigned to you and started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign To</label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent>
                  {assigneeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex items-center gap-2">
                        {option.type === 'leave_unassigned' ? (
                          <Users className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                        <div>
                          <span>{option.name}</span>
                          {option.role && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({option.role})
                            </span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isSubmitting || (!isSingleUserOrg && !selectedAssignee)}
              className="flex-1"
            >
              {isSubmitting ? 'Accepting...' : 'Accept & Assign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkOrderAcceptanceModal;
