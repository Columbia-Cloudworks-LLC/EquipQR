import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Contact, Plus, Pencil, Trash2, Mail, Phone, Users } from 'lucide-react';
import {
  useExternalContacts,
  useExternalContactMutations,
} from '@/features/teams/hooks/useCustomerAccount';
import type { ExternalContactListRow } from '@/features/teams/types/team';
import type { TeamWithMembers } from '@/features/teams/services/teamService';

interface ExternalContactsListProps {
  organizationId: string;
  customerId: string;
  canManage: boolean;
  teamMembers?: TeamWithMembers['members'];
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  notes: string;
}

const emptyForm: ContactFormData = { name: '', email: '', phone: '', role: '', notes: '' };

function isEditableExternalContact(contact: ExternalContactListRow): boolean {
  return (
    contact.source === 'manual' &&
    contact.source_external_id == null &&
    contact.source_field == null
  );
}

const TEAM_ROLE_CONTACT_LABELS: Record<string, string> = {
  manager: 'Team Manager',
  requestor: 'Requestor',
};

function TeamRoleContacts({
  members,
}: {
  members: TeamWithMembers['members'];
}) {
  const roleContacts = members.filter((member) => member.role === 'manager' || member.role === 'requestor');

  if (roleContacts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" />
        Team contacts
      </p>
      {roleContacts.map((member) => {
        const name = member.profiles?.name ?? member.user_name ?? 'Team member';
        const email = member.profiles?.email ?? member.user_email;
        const roleLabel = TEAM_ROLE_CONTACT_LABELS[member.role] ?? member.role;

        return (
          <div
            key={member.id}
            className="flex items-start justify-between gap-2 rounded-lg border border-dashed p-3 bg-muted/20"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {roleLabel}
                </span>
                <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                  EquipQR user
                </Badge>
              </div>
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
                >
                  <Mail className="h-3 w-3" />
                  {email}
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const ExternalContactsList: React.FC<ExternalContactsListProps> = ({
  organizationId,
  customerId,
  canManage,
  teamMembers = [],
}) => {
  const { data: contacts = [], isLoading } = useExternalContacts(customerId);
  const mutations = useExternalContactMutations(organizationId, customerId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormData>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (contact: ExternalContactListRow) => {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      role: contact.role ?? '',
      notes: contact.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!canManage || !form.name.trim()) return;
    try {
      if (editingId) {
        await mutations.update.mutateAsync({
          id: editingId,
          fields: {
            name: form.name.trim(),
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            role: form.role.trim() || null,
            notes: form.notes.trim() || null,
          },
        });
      } else {
        await mutations.create.mutateAsync({
          customer_id: customerId,
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          role: form.role.trim() || null,
          notes: form.notes.trim() || null,
        });
      }
      setDialogOpen(false);
    } catch {
      // onError handler in mutation hook already toasts; keep dialog open for retry
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!canManage) return;
    if (!window.confirm('Remove this contact?')) return;
    try {
      await mutations.remove.mutateAsync(contactId);
    } catch {
      // onError handler in mutation hook already toasts
    }
  };

  if (isLoading) return null;

  return (
    <>
      <Card className="shadow-elevation-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Contact className="h-5 w-5" />
                Customer contacts
              </CardTitle>
              <CardDescription>
                Team managers and requestors are listed automatically. Add external contacts for
                billing, site, or QuickBooks-synced people.
              </CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add contact
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <TeamRoleContacts members={teamMembers} />

          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No external contacts yet
            </p>
          ) : (
            <div className="space-y-3">
              {contacts.length > 0 && teamMembers.some((m) => m.role === 'manager' || m.role === 'requestor') ? (
                <p className="text-xs font-medium text-muted-foreground">External &amp; synced contacts</p>
              ) : null}
              {contacts.map((c) => {
                const isQBO = c.source === 'quickbooks';
                const canEditContact = isEditableExternalContact(c);
                return (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{c.name}</span>
                        {c.role && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {c.role}
                          </span>
                        )}
                        {isQBO && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-[#2CA01C] border-[#2CA01C]/40">
                            QuickBooks
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Mail className="h-3 w-3" />
                            {c.email}
                          </a>
                        )}
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </a>
                        )}
                      </div>
                    </div>
                    {canManage && canEditContact && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit {c.name}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete {c.name}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit contact' : 'Add contact'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the contact details'
                : 'Add an external contact for this customer account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name *</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contact name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-role">Role</Label>
              <Input
                id="contact-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="e.g. Site Manager, Billing"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !form.name.trim() ||
                mutations.create.isPending ||
                mutations.update.isPending
              }
            >
              {editingId ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExternalContactsList;
