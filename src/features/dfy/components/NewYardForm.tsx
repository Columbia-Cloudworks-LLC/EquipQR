import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { resolveYardForm, type ResolvedYard } from '@/features/dfy/lib/yardForm';
import { dfyProvisioning } from '@/features/dfy/services/dfyProvisioningService';

interface NewYardFormProps {
  onCreated: (organizationId: string) => void;
}

const STAFF_PLACEHOLDER = `owner@acmeheavy.com, owner
office@acmeheavy.com, admin
mike@acmeheavy.com, mechanic
lead@acmeheavy.com, mechanic, manager`;

/**
 * Create a Done-For-You organization. The request id is fixed for the life of
 * one form so a retry after a network error returns the same organization.
 */
export function NewYardForm({ onCreated }: NewYardFormProps) {
  const queryClient = useQueryClient();
  const requestId = useRef(crypto.randomUUID());
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [staffText, setStaffText] = useState('');
  const [equipmentCsv, setEquipmentCsv] = useState('');
  const [equipmentFileName, setEquipmentFileName] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState<ResolvedYard | null>(null);
  const [existingEmails, setExistingEmails] = useState<string[]>([]);
  const [attachConfirmed, setAttachConfirmed] = useState(false);

  const resetReview = () => {
    setReviewed(null);
    setExistingEmails([]);
    setAttachConfirmed(false);
  };

  const review = useMutation({
    mutationFn: async () => {
      const result = resolveYardForm({ name, teamName, staffText, equipmentCsv });
      if (!result.ok) {
        setErrors(result.errors);
        return null;
      }
      setErrors([]);
      const existing = await dfyProvisioning.checkExisting(result.yard.staff.map((s) => s.email));
      setExistingEmails(existing);
      setReviewed(result.yard);
      return result.yard;
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not check the staff list'),
  });

  const create = useMutation({
    mutationFn: async (yard: ResolvedYard) =>
      dfyProvisioning.create({
        requestId: requestId.current,
        name: yard.name,
        teamName: yard.teamName,
        staff: yard.staff,
        equipment: yard.equipment,
        attachExistingEmails: attachConfirmed ? existingEmails : [],
      }),
    onSuccess: (result) => {
      toast.success(result.created ? 'Yard provisioned' : 'This yard was already provisioned');
      requestId.current = crypto.randomUUID();
      setName('');
      setTeamName('');
      setStaffText('');
      setEquipmentCsv('');
      setEquipmentFileName('');
      resetReview();
      void queryClient.invalidateQueries({ queryKey: ['dfy-unclaimed-yards'] });
      onCreated(result.organization_id);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Provisioning failed'),
  });

  const handleFile = async (file: File | undefined) => {
    resetReview();
    if (!file) {
      setEquipmentCsv('');
      setEquipmentFileName('');
      return;
    }
    setEquipmentCsv(await file.text());
    setEquipmentFileName(file.name);
  };

  const needsAttachConfirmation = existingEmails.length > 0 && !attachConfirmed;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New yard</CardTitle>
        <CardDescription>
          Creates the organization with no members. Each person joins the first time they sign in
          with their email, once it&apos;s verified.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dfy-name">Organization name</Label>
            <Input id="dfy-name" value={name} onChange={(e) => { setName(e.target.value); resetReview(); }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dfy-team">Team name</Label>
            <Input
              id="dfy-team"
              placeholder="Main Yard"
              value={teamName}
              onChange={(e) => { setTeamName(e.target.value); resetReview(); }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dfy-staff">Staff (one per line: email, role, optional team role)</Label>
          <Textarea
            id="dfy-staff"
            rows={6}
            placeholder={STAFF_PLACEHOLDER}
            value={staffText}
            onChange={(e) => { setStaffText(e.target.value); resetReview(); }}
          />
          <p className="text-xs text-muted-foreground">
            Exactly one owner. Roles: owner, admin, mechanic, technician, member. Mechanics join the
            team as technicians unless you add a team role (manager, technician, requestor, viewer).
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dfy-equipment">Equipment CSV (optional)</Label>
          <Input
            id="dfy-equipment"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          {equipmentFileName && <p className="text-xs text-muted-foreground">{equipmentFileName}</p>}
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Fix these first</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {reviewed && (
          <div className="space-y-3 rounded-md border p-3 text-sm" data-testid="dfy-review">
            <p>
              <strong>{reviewed.name}</strong> · {reviewed.staff.length} staff · {reviewed.equipment.length} equipment
            </p>
            {existingEmails.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Existing accounts are attached immediately</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    These emails already have a verified EquipQR account. They&apos;ll see this yard as
                    soon as you create it, and you won&apos;t be able to edit the yard afterwards:
                  </p>
                  <ul className="list-disc pl-4">
                    {existingEmails.map((email) => (
                      <li key={email}>{email}</li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="dfy-attach-confirm"
                      checked={attachConfirmed}
                      onCheckedChange={(checked) => setAttachConfirmed(checked === true)}
                    />
                    <Label htmlFor="dfy-attach-confirm">I&apos;ve double-checked these addresses</Label>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => review.mutate()} disabled={review.isPending}>
            {review.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Review
          </Button>
          <Button
            onClick={() => reviewed && create.mutate(reviewed)}
            disabled={!reviewed || needsAttachConfirmation || create.isPending}
          >
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Create yard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
