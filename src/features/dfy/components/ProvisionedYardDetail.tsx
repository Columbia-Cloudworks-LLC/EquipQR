import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Loader2, Mail, Trash2, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { buildLabelsCsv } from '@/dev/dfy/manifest.mjs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveEquipmentCsv, resolveStaffLine } from '@/features/dfy/lib/yardForm';
import { DfyProvisioningError, dfyProvisioning } from '@/features/dfy/services/dfyProvisioningService';

interface ProvisionedYardDetailProps {
  organizationId: string;
  onGone: () => void;
}

function downloadText(fileName: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Edit an unclaimed yard. Every action fails server-side once someone joins. */
export function ProvisionedYardDetail({ organizationId, onGone }: ProvisionedYardDetailProps) {
  const queryClient = useQueryClient();
  const detailKey = ['dfy-yard', organizationId];
  const [staffLine, setStaffLine] = useState('');

  const { data: yard, isLoading, error } = useQuery({
    queryKey: detailKey,
    queryFn: () => dfyProvisioning.get(organizationId),
    retry: false,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: detailKey });
    void queryClient.invalidateQueries({ queryKey: ['dfy-unclaimed-yards'] });
  };

  const onError = (err: unknown) => {
    if (err instanceof DfyProvisioningError && err.code === 'ORG_NOT_EDITABLE') {
      toast.info('Someone has joined this yard, so it can no longer be edited here.');
      refresh();
      onGone();
      return;
    }
    toast.error(err instanceof Error ? err.message : 'Request failed');
  };

  const revoke = useMutation({ mutationFn: dfyProvisioning.revokeStaff, onSuccess: refresh, onError });
  const removeEquipment = useMutation({
    mutationFn: (equipmentId: string) => dfyProvisioning.deleteEquipment(organizationId, equipmentId),
    onSuccess: refresh,
    onError,
  });
  const addEquipment = useMutation({
    mutationFn: async (csv: string) => {
      const result = resolveEquipmentCsv(csv);
      if (!result.ok) throw new Error(result.errors.join('; '));
      return dfyProvisioning.addEquipment(organizationId, result.equipment);
    },
    onSuccess: (r) => {
      toast.success(`Added ${r.added} equipment`);
      refresh();
    },
    onError,
  });
  const stage = useMutation({
    mutationFn: async (line: string) => {
      const result = resolveStaffLine(line);
      if (!result.ok) throw new Error(result.errors.join('; '));
      const { person } = result;
      const existing = await dfyProvisioning.checkExisting([person.email]);
      if (
        existing.length > 0 &&
        !window.confirm(`${person.email} already has a verified account and will be attached now. Continue?`)
      ) {
        return null;
      }
      return dfyProvisioning.stage({ organizationId, attachExisting: existing.length > 0, ...person });
    },
    onSuccess: (r) => {
      if (r) {
        setStaffLine('');
        refresh();
      }
    },
    onError,
  });
  const invites = useMutation({
    mutationFn: () => dfyProvisioning.sendInvites(organizationId),
    onSuccess: (results) => {
      const failed = results.filter((r) => !r.sent).map((r) => r.email);
      if (failed.length > 0) toast.warning(`Invites not sent to: ${failed.join(', ')}`);
      else toast.success(`Sent ${results.length} invite(s)`);
    },
    onError,
  });

  if (isLoading) {
    return <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading yard" />;
  }
  if (error || !yard) {
    return <p className="text-sm text-muted-foreground">This yard is no longer available to operators.</p>;
  }

  const handleLabels = () => {
    const csv = buildLabelsCsv(yard.equipment, { appUrl: window.location.origin, organizationId });
    downloadText(`${yard.organization.name}-labels.csv`, csv, 'text/csv');
  };

  return (
    <Card data-testid="dfy-yard-detail">
      <CardHeader>
        <CardTitle className="text-base">{yard.organization.name}</CardTitle>
        <CardDescription>Editable until the first person signs in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Staff</h3>
            <Button size="sm" variant="outline" onClick={() => invites.mutate()} disabled={invites.isPending}>
              <Mail className="mr-1 h-4 w-4" aria-hidden />
              Send sign-in invites
            </Button>
          </div>
          {yard.staff.map((person) => (
            <div key={person.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
              <span className="truncate text-sm">{person.email}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">{person.role}</Badge>
                {person.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${person.email}`}
                    onClick={() => revoke.mutate(person.id)}
                    disabled={revoke.isPending}
                  >
                    <UserX className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              aria-label="Add staff"
              placeholder="email, mechanic"
              value={staffLine}
              onChange={(e) => setStaffLine(e.target.value)}
            />
            <Button size="sm" onClick={() => stage.mutate(staffLine)} disabled={!staffLine.trim() || stage.isPending}>
              Add
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Equipment ({yard.equipment.length})</h3>
            <Button size="sm" variant="outline" onClick={handleLabels} disabled={yard.equipment.length === 0}>
              <Download className="mr-1 h-4 w-4" aria-hidden />
              Labels CSV
            </Button>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {yard.equipment.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
                <span className="truncate">
                  {item.name}
                  {item.serial_number ? ` · ${item.serial_number}` : ''}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${item.name}`}
                  onClick={() => removeEquipment.mutate(item.id)}
                  disabled={removeEquipment.isPending}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dfy-add-equipment">Add equipment from CSV</Label>
            <Input
              id="dfy-add-equipment"
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) addEquipment.mutate(await file.text());
                e.target.value = '';
              }}
            />
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
