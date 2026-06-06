'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Store, Pencil, Trash2, Globe, Mail, Phone, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Input, Label, Textarea } from '@/components/ui/input';
import type { Vendor } from '@/lib/types';

export default function VendorsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | undefined>();

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get<Vendor[]>('/vendors'),
  });

  const openNew = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };
  const openEdit = (v: Vendor) => {
    setEditing(v);
    setDialogOpen(true);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Vendors"
        description="Your supplier directory — imports auto-link to vendors by website."
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New vendor
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : !vendors?.length ? (
        <EmptyState
          icon={Store}
          title="No vendors yet"
          description="Add the suppliers you source from — discounts, lead times and contacts in one place."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> New vendor
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <VendorCard key={v.id} vendor={v} onEdit={() => openEdit(v)} />
          ))}
        </div>
      )}

      <VendorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        vendor={editing}
      />
    </div>
  );
}

function VendorCard({ vendor, onEdit }: { vendor: Vendor; onEdit: () => void }) {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api.delete(`/vendors/${vendor.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor removed');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{vendor.name}</h3>
          <p className="text-xs text-muted-foreground">
            {vendor.productCount ?? 0} linked product{(vendor.productCount ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Edit vendor"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Remove "${vendor.name}"? Products keep their vendor text.`))
                remove.mutate();
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete vendor"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        {vendor.website && (
          <p className="flex items-center gap-2 truncate">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <a
              href={vendor.website}
              target="_blank"
              rel="noreferrer"
              className="truncate hover:text-primary"
            >
              {vendor.website.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          </p>
        )}
        {vendor.contactEmail && (
          <p className="flex items-center gap-2 truncate">
            <Mail className="h-3.5 w-3.5 shrink-0" /> {vendor.contactEmail}
          </p>
        )}
        {vendor.contactPhone && (
          <p className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0" /> {vendor.contactPhone}
          </p>
        )}
      </div>

      <div className="mt-auto flex gap-4 pt-4 text-xs text-muted-foreground">
        {vendor.tradeDiscountPct != null && (
          <span>Trade discount: {Number(vendor.tradeDiscountPct)}%</span>
        )}
        {vendor.defaultLeadTimeDays != null && (
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" /> Lead: {vendor.defaultLeadTimeDays}d
          </span>
        )}
      </div>
    </Card>
  );
}

function VendorDialog({
  open,
  onClose,
  vendor,
}: {
  open: boolean;
  onClose: () => void;
  vendor?: Vendor;
}) {
  const qc = useQueryClient();
  const editing = Boolean(vendor);
  const [form, setForm] = useState({
    name: '',
    website: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    tradeDiscountPct: '',
    defaultLeadTimeDays: '',
    notes: '',
  });

  // Re-seed the form whenever the dialog opens for a (different) vendor
  const [seedKey, setSeedKey] = useState('');
  const currentKey = `${open}-${vendor?.id ?? 'new'}`;
  if (open && seedKey !== currentKey) {
    setSeedKey(currentKey);
    setForm({
      name: vendor?.name ?? '',
      website: vendor?.website ?? '',
      contactName: vendor?.contactName ?? '',
      contactEmail: vendor?.contactEmail ?? '',
      contactPhone: vendor?.contactPhone ?? '',
      tradeDiscountPct:
        vendor?.tradeDiscountPct != null ? String(Number(vendor.tradeDiscountPct)) : '',
      defaultLeadTimeDays:
        vendor?.defaultLeadTimeDays != null ? String(vendor.defaultLeadTimeDays) : '',
      notes: vendor?.notes ?? '',
    });
  }

  const mutation = useMutation({
    mutationFn: (payload: any) =>
      editing
        ? api.patch(`/vendors/${vendor!.id}`, payload)
        : api.post('/vendors', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      toast.success(editing ? 'Vendor updated' : 'Vendor added');
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to save'),
  });

  const set = (k: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      name: form.name,
      website: form.website || undefined,
      contactName: form.contactName || undefined,
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
      tradeDiscountPct:
        form.tradeDiscountPct === '' ? null : Number(form.tradeDiscountPct),
      defaultLeadTimeDays:
        form.defaultLeadTimeDays === '' ? null : Number(form.defaultLeadTimeDays),
      notes: form.notes || undefined,
    });
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader
        title={editing ? 'Edit vendor' : 'New vendor'}
        description="Imports from this vendor's website link automatically."
      />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="v-name">Vendor name</Label>
          <Input id="v-name" value={form.name} onChange={set('name')} required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="v-website">Website</Label>
          <Input
            id="v-website"
            placeholder="https://vendor.com"
            value={form.website}
            onChange={set('website')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="v-contactName">Contact name</Label>
            <Input id="v-contactName" value={form.contactName} onChange={set('contactName')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-contactPhone">Phone</Label>
            <Input id="v-contactPhone" value={form.contactPhone} onChange={set('contactPhone')} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="v-contactEmail">Contact email</Label>
          <Input
            id="v-contactEmail"
            type="email"
            value={form.contactEmail}
            onChange={set('contactEmail')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="v-discount">Trade discount %</Label>
            <Input
              id="v-discount"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={form.tradeDiscountPct}
              onChange={set('tradeDiscountPct')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-lead">Default lead time (days)</Label>
            <Input
              id="v-lead"
              type="number"
              min="0"
              value={form.defaultLeadTimeDays}
              onChange={set('defaultLeadTimeDays')}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="v-notes">Notes</Label>
          <Textarea id="v-notes" value={form.notes} onChange={set('notes')} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {editing ? 'Save changes' : 'Add vendor'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
