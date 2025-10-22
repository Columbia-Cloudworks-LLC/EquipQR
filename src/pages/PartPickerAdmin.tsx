import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdminAccess } from '@/hooks/useSuperAdminAccess';
import { normalizePartNumber } from '@/lib/parts/normalize';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Pencil, PlusCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface PartIdentifier {
  id: string;
  id_type: 'MPN' | 'SKU' | 'OEM' | 'UPC' | 'EAN' | null;
  value: string;
  normalized_value: string;
}

interface DistributorListing {
  id: string;
  distributor_id: string;
  sku: string | null;
  distributor?: { id: string; name: string } | null;
}

interface PartRow {
  id: string;
  canonical_mpn: string;
  title: string;
  brand: string | null;
  description: string | null;
  synonyms: string[] | null;
  part_identifier: PartIdentifier[] | null;
  distributor_listing: DistributorListing[] | null;
}

interface DistributorRow {
  id: string;
  name: string;
}

interface PartFormState {
  id?: string;
  canonical_mpn: string;
  title: string;
  brand: string;
  description: string;
  synonymsText: string;
}

interface IdentifierFormState {
  id?: string;
  id_type: 'MPN' | 'SKU' | 'OEM' | 'UPC' | 'EAN';
  value: string;
}

interface ListingFormState {
  id?: string;
  distributor_id: string;
  sku: string;
}

const identifierTypes: IdentifierFormState['id_type'][] = ['MPN', 'SKU', 'OEM', 'UPC', 'EAN'];

const defaultPartForm: PartFormState = {
  canonical_mpn: '',
  title: '',
  brand: '',
  description: '',
  synonymsText: '',
};

const defaultIdentifierForm: IdentifierFormState = {
  id_type: 'MPN',
  value: '',
};

const defaultListingForm: ListingFormState = {
  distributor_id: '',
  sku: '',
};

const parseSynonyms = (input: string): string[] => {
  return input
    .split(/[\n,]/g)
    .map((value) => value.trim())
    .filter(Boolean);
};

const PartPickerAdmin = () => {
  const { isSuperAdmin, isLoading: superAdminLoading } = useSuperAdminAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [isPartDialogOpen, setIsPartDialogOpen] = useState(false);
  const [partFormState, setPartFormState] = useState<PartFormState>(defaultPartForm);
  const [activePartId, setActivePartId] = useState<string | null>(null);
  const [isIdentifierDialogOpen, setIsIdentifierDialogOpen] = useState(false);
  const [identifierFormState, setIdentifierFormState] = useState<IdentifierFormState>(defaultIdentifierForm);
  const [listingFormState, setListingFormState] = useState<ListingFormState>(defaultListingForm);
  const [isListingDialogOpen, setIsListingDialogOpen] = useState(false);

  const { data: partsData, isLoading, error } = useQuery({
    queryKey: ['part-picker-admin', 'parts'],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('part')
        .select(`
          id,
          canonical_mpn,
          title,
          brand,
          description,
          synonyms,
          part_identifier (
            id,
            id_type,
            value,
            normalized_value
          ),
          distributor_listing (
            id,
            distributor_id,
            sku,
            distributor:distributor_id (
              id,
              name
            )
          )
        `)
        .order('canonical_mpn', { ascending: true });

      if (queryError) {
        throw queryError;
      }

      return (data as PartRow[] | null) ?? [];
    },
  });

  const { data: distributorsData } = useQuery({
    queryKey: ['part-picker-admin', 'distributors'],
    queryFn: async () => {
      const { data, error: distributorsError } = await supabase
        .from('distributor')
        .select('id, name')
        .order('name', { ascending: true });

      if (distributorsError) {
        throw distributorsError;
      }

      return (data as DistributorRow[] | null) ?? [];
    },
  });

  const filteredParts = useMemo(() => {
    if (!partsData) return [];
    if (!search.trim()) return partsData;
    const searchLower = search.toLowerCase();
    return partsData.filter((part) => {
      const haystack = [
        part.canonical_mpn,
        part.title,
        part.brand ?? '',
        part.description ?? '',
        ...(part.synonyms ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(searchLower);
    });
  }, [partsData, search]);

  const activePart = useMemo(() => {
    if (!activePartId) return null;
    return (partsData ?? []).find((part) => part.id === activePartId) ?? null;
  }, [activePartId, partsData]);

  const partMutation = useMutation({
    mutationFn: async (form: PartFormState) => {
      const payload = {
        canonical_mpn: form.canonical_mpn.trim(),
        title: (form.title || form.canonical_mpn).trim(),
        brand: form.brand.trim() || null,
        description: form.description.trim() || null,
        synonyms: parseSynonyms(form.synonymsText),
      };

      if (form.id) {
        const { error: updateError } = await supabase
          .from('part')
          .update(payload)
          .eq('id', form.id);
        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('part')
          .insert(payload);
        if (insertError) {
          throw insertError;
        }
      }
    },
    onSuccess: () => {
      toast({
        title: 'Part saved',
        description: 'Part metadata has been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['part-picker-admin', 'parts'] });
      setIsPartDialogOpen(false);
      setPartFormState(defaultPartForm);
    },
    onError: (mutationError) => {
      toast({
        title: 'Failed to save part',
        description: mutationError instanceof Error ? mutationError.message : 'Unknown error occurred.',
      });
    },
  });

  const identifierMutation = useMutation({
    mutationFn: async ({ form, partId }: { form: IdentifierFormState; partId: string }) => {
      const payload = {
        id_type: form.id_type,
        value: form.value.trim(),
        normalized_value: normalizePartNumber(form.value.trim()),
      };

      if (form.id) {
        const { error: updateError } = await supabase
          .from('part_identifier')
          .update(payload)
          .eq('id', form.id);
        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('part_identifier')
          .insert({ ...payload, part_id: partId });
        if (insertError) {
          throw insertError;
        }
      }
    },
    onSuccess: () => {
      toast({
        title: 'Identifier saved',
        description: 'Part identifier has been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['part-picker-admin', 'parts'] });
      setIdentifierFormState(defaultIdentifierForm);
    },
    onError: (mutationError) => {
      toast({
        title: 'Failed to save identifier',
        description: mutationError instanceof Error ? mutationError.message : 'Unknown error occurred.',
      });
    },
  });

  const listingMutation = useMutation({
    mutationFn: async ({ form, partId }: { form: ListingFormState; partId: string }) => {
      const payload = {
        distributor_id: form.distributor_id,
        sku: form.sku.trim() || null,
      };

      if (form.id) {
        const { error: updateError } = await supabase
          .from('distributor_listing')
          .update(payload)
          .eq('id', form.id);
        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('distributor_listing')
          .insert({ ...payload, part_id: partId });
        if (insertError) {
          throw insertError;
        }
      }
    },
    onSuccess: () => {
      toast({
        title: 'Listing saved',
        description: 'Distributor listing has been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['part-picker-admin', 'parts'] });
      setListingFormState(defaultListingForm);
    },
    onError: (mutationError) => {
      toast({
        title: 'Failed to save listing',
        description: mutationError instanceof Error ? mutationError.message : 'Unknown error occurred.',
      });
    },
  });

  const handleCreatePart = () => {
    setPartFormState(defaultPartForm);
    setIsPartDialogOpen(true);
  };

  const handleEditPart = (part: PartRow) => {
    setPartFormState({
      id: part.id,
      canonical_mpn: part.canonical_mpn,
      title: part.title,
      brand: part.brand ?? '',
      description: part.description ?? '',
      synonymsText: (part.synonyms ?? []).join(', '),
    });
    setIsPartDialogOpen(true);
  };

  const openIdentifierDialog = (part: PartRow, identifier?: PartIdentifier) => {
    setActivePartId(part.id);
    if (identifier) {
      setIdentifierFormState({
        id: identifier.id,
        id_type: (identifier.id_type ?? 'MPN') as IdentifierFormState['id_type'],
        value: identifier.value,
      });
    } else {
      setIdentifierFormState(defaultIdentifierForm);
    }
    setIsIdentifierDialogOpen(true);
  };

  const openListingDialog = (part: PartRow, listing?: DistributorListing) => {
    setActivePartId(part.id);
    if (listing) {
      setListingFormState({
        id: listing.id,
        distributor_id: listing.distributor_id,
        sku: listing.sku ?? '',
      });
    } else {
      setListingFormState(defaultListingForm);
    }
    setIsListingDialogOpen(true);
  };

  if (superAdminLoading) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">Loading access…</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-4 sm:p-6 space-y-6" data-testid="part-picker-admin-page">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Access denied
            </CardTitle>
            <CardDescription>
              You do not have permission to access the part picker administration tools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page is restricted to maintainers within the designated super admin organization.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6" data-testid="part-picker-admin-page">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Part Picker Admin</CardTitle>
            <CardDescription>
              Manage part metadata, identifiers, and distributor listings used by the part picker.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Input
              placeholder="Search parts by MPN, brand, or synonym"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="sm:w-64"
            />
            <Button onClick={handleCreatePart}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New part
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Canonical MPN</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Synonyms</TableHead>
                  <TableHead className="text-center">Identifiers</TableHead>
                  <TableHead className="text-center">Listings</TableHead>
                  <TableHead className="w-[160px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading parts…
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && filteredParts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No parts found. Try adjusting your search or add a new part.
                    </TableCell>
                  </TableRow>
                )}

                {filteredParts.map((part) => {
                  const identifiers = part.part_identifier ?? [];
                  const listings = part.distributor_listing ?? [];
                  return (
                    <TableRow key={part.id}>
                      <TableCell className="font-medium">{part.canonical_mpn}</TableCell>
                      <TableCell>{part.brand ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="max-w-[260px]">
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {part.description || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <div className="flex flex-wrap gap-1">
                          {(part.synonyms ?? []).length === 0 && (
                            <Badge variant="secondary">None</Badge>
                          )}
                          {(part.synonyms ?? []).map((synonym) => (
                            <Badge key={synonym} variant="outline" className="text-xs">
                              {synonym}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{identifiers.length}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{listings.length}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditPart(part)}>
                          <Pencil className="mr-1 h-4 w-4" />
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openIdentifierDialog(part)}>
                          Identifiers
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openListingDialog(part)}>
                          Listings
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPartDialogOpen} onOpenChange={(open) => {
        setIsPartDialogOpen(open);
        if (!open) {
          setPartFormState(defaultPartForm);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{partFormState.id ? 'Edit part' : 'Create part'}</DialogTitle>
            <DialogDescription>
              Canonical part metadata feeds both indexing and the user-facing part picker.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="canonical_mpn">Canonical MPN</Label>
              <Input
                id="canonical_mpn"
                value={partFormState.canonical_mpn}
                onChange={(event) => setPartFormState((prev) => ({ ...prev, canonical_mpn: event.target.value }))}
                placeholder="e.g. 1234-XYZ"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={partFormState.title}
                onChange={(event) => setPartFormState((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Display title for search results"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={partFormState.brand}
                onChange={(event) => setPartFormState((prev) => ({ ...prev, brand: event.target.value }))}
                placeholder="Optional brand name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={partFormState.description}
                onChange={(event) => setPartFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Short description shown in the picker"
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="synonyms">Synonyms</Label>
              <Textarea
                id="synonyms"
                value={partFormState.synonymsText}
                onChange={(event) => setPartFormState((prev) => ({ ...prev, synonymsText: event.target.value }))}
                placeholder="Comma or newline separated synonyms"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => partMutation.mutate(partFormState)}
              disabled={!partFormState.canonical_mpn.trim() || partMutation.isPending}
            >
              {partMutation.isPending ? 'Saving…' : 'Save part'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isIdentifierDialogOpen} onOpenChange={(open) => {
        setIsIdentifierDialogOpen(open);
        if (!open) {
          setIdentifierFormState(defaultIdentifierForm);
          setActivePartId(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage identifiers{activePart ? ` • ${activePart.canonical_mpn}` : ''}
            </DialogTitle>
            <DialogDescription>
              Normalize cross-references like OEM numbers or distributor SKUs to improve lookup accuracy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 border rounded-md p-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="identifier_type">Identifier type</Label>
                  <Select
                    value={identifierFormState.id_type}
                    onValueChange={(value: IdentifierFormState['id_type']) =>
                      setIdentifierFormState((prev) => ({ ...prev, id_type: value }))
                    }
                  >
                    <SelectTrigger id="identifier_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {identifierTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="identifier_value">Identifier value</Label>
                  <Input
                    id="identifier_value"
                    value={identifierFormState.value}
                    onChange={(event) =>
                      setIdentifierFormState((prev) => ({ ...prev, value: event.target.value }))
                    }
                    placeholder="Raw identifier value"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() =>
                    activePart && identifierMutation.mutate({ partId: activePart.id, form: identifierFormState })
                  }
                  disabled={!activePart || !identifierFormState.value.trim() || identifierMutation.isPending}
                >
                  {identifierMutation.isPending ? 'Saving…' : identifierFormState.id ? 'Update identifier' : 'Add identifier'}
                </Button>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Normalized</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePart && (activePart.part_identifier ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No identifiers yet. Add one using the form above.
                      </TableCell>
                    </TableRow>
                  )}

                  {activePart && (activePart.part_identifier ?? []).map((identifier) => (
                    <TableRow key={identifier.id}>
                      <TableCell>{identifier.id_type ?? '—'}</TableCell>
                      <TableCell>{identifier.value}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{identifier.normalized_value}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => activePart && openIdentifierDialog(activePart, identifier)}>
                          <Pencil className="mr-1 h-4 w-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isListingDialogOpen} onOpenChange={(open) => {
        setIsListingDialogOpen(open);
        if (!open) {
          setListingFormState(defaultListingForm);
          setActivePartId(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage distributor listings{activePart ? ` • ${activePart.canonical_mpn}` : ''}
            </DialogTitle>
            <DialogDescription>
              Associate parts with distributor catalog listings so techs can find stock sources quickly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 border rounded-md p-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="listing_distributor">Distributor</Label>
                  <Select
                    value={listingFormState.distributor_id}
                    onValueChange={(value) => setListingFormState((prev) => ({ ...prev, distributor_id: value }))}
                  >
                    <SelectTrigger id="listing_distributor">
                      <SelectValue placeholder="Select distributor" />
                    </SelectTrigger>
                    <SelectContent>
                      {(distributorsData ?? []).map((distributor) => (
                        <SelectItem key={distributor.id} value={distributor.id}>
                          {distributor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="listing_sku">Distributor SKU</Label>
                  <Input
                    id="listing_sku"
                    value={listingFormState.sku}
                    onChange={(event) => setListingFormState((prev) => ({ ...prev, sku: event.target.value }))}
                    placeholder="Optional SKU"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() =>
                    activePart && listingMutation.mutate({ partId: activePart.id, form: listingFormState })
                  }
                  disabled={!activePart || !listingFormState.distributor_id || listingMutation.isPending}
                >
                  {listingMutation.isPending ? 'Saving…' : listingFormState.id ? 'Update listing' : 'Add listing'}
                </Button>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Distributor</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePart && (activePart.distributor_listing ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                        No distributor listings configured.
                      </TableCell>
                    </TableRow>
                  )}

                  {activePart && (activePart.distributor_listing ?? []).map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell>{listing.distributor?.name ?? '—'}</TableCell>
                      <TableCell>{listing.sku ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => activePart && openListingDialog(activePart, listing)}>
                          <Pencil className="mr-1 h-4 w-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartPickerAdmin;
