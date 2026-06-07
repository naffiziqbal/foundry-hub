'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  DoorOpen,
  ClipboardList,
  Settings,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
  FileText,
  Sofa,
  Lightbulb,
  Package,
  ShoppingCart,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton, EmptyState, Separator } from '@/components/ui/misc';
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Input, Label, Textarea, Select } from '@/components/ui/input';
import { ProjectDialog } from '@/components/dialogs/project-dialog';
import { formatCurrency, formatDate, titleCase } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';
import type {
  BudgetSummary,
  OrderStatus,
  ProcurementItem,
  ProcurementSummary,
  Project,
  PurchaseOrder,
  PurchaseOrderStatus,
  Room,
  Schedule,
  ScheduleType,
  Vendor,
} from '@/lib/types';

const SCHEDULE_ICON: Record<ScheduleType, any> = {
  material: FileText,
  furniture: Sofa,
  fixture: Lightbulb,
};

type Tab = 'rooms' | 'schedules' | 'procurement' | 'details';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const isDesigner = user?.role === 'designer';

  const [tab, setTab] = useState<Tab>('rooms');
  const [editOpen, setEditOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<Project>(`/projects/${id}`),
  });
  const { data: rooms } = useQuery({
    queryKey: ['rooms', id],
    queryFn: () => api.get<Room[]>(`/projects/${id}/rooms`),
    enabled: !!id,
  });
  const { data: schedules } = useQuery({
    queryKey: ['schedules', id],
    queryFn: () => api.get<Schedule[]>(`/projects/${id}/schedules`),
    enabled: !!id,
  });

  const deleteProject = useMutation({
    mutationFn: () => api.delete(`/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
      router.push('/projects');
    },
    onError: (e: any) => toast.error(e.message),
  });

  function copyClientLink() {
    const url = `${window.location.origin}/client-view/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Client view link copied');
  }

  if (isLoading || !project) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'rooms', label: `Rooms${rooms ? ` (${rooms.length})` : ''}`, icon: DoorOpen },
    {
      key: 'schedules',
      label: `Schedules${schedules ? ` (${schedules.length})` : ''}`,
      icon: ClipboardList,
    },
    ...(isDesigner
      ? [{ key: 'procurement' as Tab, label: 'Procurement', icon: ShoppingCart }]
      : []),
    { key: 'details', label: 'Details', icon: Settings },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: project.name }]}
        title={project.name}
        description={project.clientName ? `Client · ${project.clientName}` : undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <Button variant="outline" size="sm" onClick={copyClientLink}>
              <Copy className="h-4 w-4" /> Client link
            </Button>
            <Link href={`/client-view/${id}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" /> Preview
              </Button>
            </Link>
            {isDesigner && (
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        }
      />

      {isDesigner && <BudgetCard projectId={id} />}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Rooms */}
      {tab === 'rooms' && (
        <div>
          {isDesigner && (
            <div className="mb-4 flex justify-end">
              <Button size="sm" onClick={() => setRoomOpen(true)}>
                <Plus className="h-4 w-4" /> Add room
              </Button>
            </div>
          )}
          {!rooms?.length ? (
            <EmptyState
              icon={DoorOpen}
              title="No rooms yet"
              description="Rooms group your product selections — e.g. Living Room, Kitchen."
              action={
                isDesigner && (
                  <Button onClick={() => setRoomOpen(true)}>
                    <Plus className="h-4 w-4" /> Add room
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((r) => (
                <Link key={r.id} href={`/rooms/${r.id}`}>
                  <Card className="group flex h-full flex-col p-5 transition-all hover:shadow-elevated">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium group-hover:text-primary">{r.name}</h3>
                    </div>
                    {r.notes && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {r.notes}
                      </p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedules */}
      {tab === 'schedules' && (
        <div>
          {isDesigner && (
            <div className="mb-4 flex justify-end">
              <Button size="sm" onClick={() => setScheduleOpen(true)}>
                <Plus className="h-4 w-4" /> New schedule
              </Button>
            </div>
          )}
          {!schedules?.length ? (
            <EmptyState
              icon={ClipboardList}
              title="No schedules yet"
              description="Create material, furniture or fixture schedules from your products."
              action={
                isDesigner && (
                  <Button onClick={() => setScheduleOpen(true)}>
                    <Plus className="h-4 w-4" /> New schedule
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {schedules.map((s) => {
                const Icon = SCHEDULE_ICON[s.type];
                return (
                  <Link key={s.id} href={`/schedules/${s.id}`}>
                    <Card className="group flex h-full items-center gap-4 p-5 transition-all hover:shadow-elevated">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-medium group-hover:text-primary">
                          {s.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {titleCase(s.type)} · {s.itemCount ?? 0} items
                        </p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Procurement */}
      {tab === 'procurement' && isDesigner && <ProcurementBoard projectId={id} />}

      {/* Details */}
      {tab === 'details' && (
        <Card className="max-w-2xl p-6">
          <dl className="space-y-4">
            <Detail label="Client name" value={project.clientName} />
            <Detail
              label="Assigned client account"
              value={project.client ? `${project.client.name} (${project.client.email})` : 'None'}
            />
            <Detail label="Address" value={project.address} />
            <Detail label="Status" value={titleCase(project.status)} />
            <Detail label="Start date" value={formatDate(project.startDate)} />
            <Detail label="End date" value={formatDate(project.endDate)} />
            <Detail
              label="FF&E budget"
              value={project.budget != null ? formatPrice(Number(project.budget)) : null}
            />
            <Detail label="Notes" value={project.notes} />
          </dl>

          {isDesigner && (
            <>
              <Separator className="my-6" />
              <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div>
                  <p className="text-sm font-medium">Delete this project</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently removes rooms, products and schedules.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  loading={deleteProject.isPending}
                  onClick={() => {
                    if (confirm('Delete this project and all its data?'))
                      deleteProject.mutate();
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      <ProjectDialog open={editOpen} onClose={() => setEditOpen(false)} project={project} />
      <RoomDialog open={roomOpen} onClose={() => setRoomOpen(false)} projectId={id} />
      <ScheduleDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        projectId={id}
      />
    </div>
  );
}

const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'none', label: 'Not started' },
  { value: 'to_order', label: 'To order' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'installed', label: 'Installed' },
];

function ProcurementBoard({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['procurement', projectId],
    queryFn: () => api.get<ProcurementSummary>(`/projects/${projectId}/procurement`),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) =>
      api.patch(`/products/${id}/procurement`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!data?.items.length) {
    return (
      <EmptyState
        icon={Package}
        title="Nothing to procure yet"
        description="Approved products appear here so you can track ordering, shipping and installation."
      />
    );
  }

  const warnings = data.items.filter((i) => i.urgency !== 'ok');

  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <span className="font-medium">
            {warnings.length} item{warnings.length === 1 ? '' : 's'} need ordering soon:
          </span>{' '}
          {warnings
            .map((w) => `${w.name} (order by ${formatDate(w.orderByDate)})`)
            .join(' · ')}
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        {ORDER_STATUSES.map((s) => (
          <span key={s.value}>
            {s.label}: <span className="font-medium text-foreground">{data.counts[s.value] ?? 0}</span>
          </span>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-2 py-3 font-medium">Room</th>
              <th className="px-2 py-3 font-medium">Vendor</th>
              <th className="px-2 py-3 font-medium">Price</th>
              <th className="px-2 py-3 font-medium">Lead (d)</th>
              <th className="px-2 py-3 font-medium">Required by</th>
              <th className="px-2 py-3 font-medium">Order by</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <ProcurementRow
                key={item.id}
                item={item}
                onPatch={(patch) => update.mutate({ id: item.id, patch })}
              />
            ))}
          </tbody>
        </table>
      </Card>

      <PurchaseOrdersSection projectId={projectId} items={data.items} />
    </div>
  );
}

const PO_STATUSES: PurchaseOrderStatus[] = ['draft', 'sent', 'confirmed', 'cancelled'];

function PurchaseOrdersSection({
  projectId,
  items,
}: {
  projectId: string;
  items: ProcurementItem[];
}) {
  const qc = useQueryClient();
  const { formatPrice } = useCurrency();
  const { data: pos } = useQuery({
    queryKey: ['purchase-orders', projectId],
    queryFn: () => api.get<PurchaseOrder[]>(`/projects/${projectId}/purchase-orders`),
  });
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get<Vendor[]>('/vendors'),
  });
  const [vendorId, setVendorId] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
    qc.invalidateQueries({ queryKey: ['procurement', projectId] });
  };

  const create = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/purchase-orders`, { vendorId }),
    onSuccess: () => {
      invalidate();
      toast.success('Purchase order drafted');
      setVendorId('');
    },
    onError: (e: any) => toast.error(e.message),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PurchaseOrderStatus }) =>
      api.patch(`/purchase-orders/${id}/status`, { status }),
    onSuccess: () => {
      invalidate();
      toast.success('Purchase order updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
  const exportPdf = useMutation({
    mutationFn: (id: string) => api.post<{ url: string }>(`/purchase-orders/${id}/export`),
    onSuccess: ({ url }) => {
      invalidate();
      window.open(url, '_blank');
    },
    onError: (e: any) => toast.error(e.message ?? 'Export failed (is Spaces configured?)'),
  });

  // Vendors that still have to-order items (the ones worth drafting a PO for)
  const toOrderVendorIds = new Set(
    items.filter((i) => i.orderStatus === 'to_order' && i.vendorId).map((i) => i.vendorId),
  );
  const eligibleVendors = vendors?.filter((v) => toOrderVendorIds.has(v.id)) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-medium">Purchase orders</h3>
        <div className="flex items-center gap-2">
          <Select
            className="h-9 w-56"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            <option value="">Select vendor to order from…</option>
            {eligibleVendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            disabled={!vendorId}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            <Plus className="h-4 w-4" /> Draft PO
          </Button>
        </div>
      </div>

      {!pos?.length ? (
        <p className="text-sm text-muted-foreground">
          No purchase orders yet. Mark approved products “To order”, link them to a
          vendor, then draft a PO.
        </p>
      ) : (
        <div className="space-y-2">
          {pos.map((po) => (
            <Card key={po.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">
                  {po.number} · {po.vendorName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {po.lines.length} line{po.lines.length === 1 ? '' : 's'} ·{' '}
                  {formatPrice(Number(po.total), po.currency)}
                  {po.discountPct != null && ` (incl. ${Number(po.discountPct)}% trade discount)`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  loading={exportPdf.isPending && exportPdf.variables === po.id}
                  onClick={() => exportPdf.mutate(po.id)}
                >
                  <FileText className="h-4 w-4" /> PDF
                </Button>
                <Select
                  className="h-9 w-32"
                  value={po.status}
                  onChange={(e) =>
                    setStatus.mutate({ id: po.id, status: e.target.value as PurchaseOrderStatus })
                  }
                >
                  {PO_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {titleCase(s)}
                    </option>
                  ))}
                </Select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProcurementRow({
  item,
  onPatch,
}: {
  item: ProcurementItem;
  onPatch: (patch: any) => void;
}) {
  const { formatPrice } = useCurrency();
  const urgencyClass =
    item.urgency === 'overdue'
      ? 'text-destructive font-medium'
      : item.urgency === 'urgent'
        ? 'text-warning font-medium'
        : 'text-muted-foreground';

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              className="h-9 w-9 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <span className="line-clamp-1 max-w-52 font-medium">{item.name}</span>
        </div>
      </td>
      <td className="px-2 py-2.5 text-muted-foreground">{item.roomName}</td>
      <td className="px-2 py-2.5 text-muted-foreground">{item.vendor ?? '—'}</td>
      <td className="px-2 py-2.5">
        {item.price != null ? formatPrice(item.price, item.currency) : '—'}
      </td>
      <td className="px-2 py-2.5">
        <Input
          type="number"
          min="0"
          className="h-8 w-16 px-2 text-sm"
          defaultValue={item.leadTimeDays ?? ''}
          onBlur={(e) =>
            onPatch({
              leadTimeDays: e.target.value === '' ? null : Number(e.target.value),
            })
          }
        />
      </td>
      <td className="px-2 py-2.5">
        <Input
          type="date"
          className="h-8 w-36 px-2 text-sm"
          defaultValue={item.requiredByDate ?? ''}
          onBlur={(e) => onPatch({ requiredByDate: e.target.value || null })}
        />
      </td>
      <td className={`px-2 py-2.5 ${urgencyClass}`}>
        {item.orderByDate ? formatDate(item.orderByDate) : '—'}
        {item.urgency === 'overdue' && ' ⚠'}
      </td>
      <td className="px-4 py-2.5">
        <Select
          className="h-8 w-32 px-2 text-sm"
          value={item.orderStatus}
          onChange={(e) => onPatch({ orderStatus: e.target.value as OrderStatus })}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </td>
    </tr>
  );
}

function BudgetCard({ projectId }: { projectId: string }) {
  // Server converts every total (and the budget) into the selected currency,
  // so mixed-currency products sum correctly instead of naively.
  const { currency } = useCurrency();
  const { data: b } = useQuery({
    queryKey: ['budget', projectId, currency],
    queryFn: () =>
      api.get<BudgetSummary>(
        `/projects/${projectId}/budget?currency=${encodeURIComponent(currency)}`,
      ),
  });
  if (!b || (b.budget == null && b.selected === 0)) return null;

  const over = b.remaining != null && b.remaining < 0;
  const pct =
    b.budget != null && b.budget > 0
      ? Math.min(100, Math.round((b.selected / b.budget) * 100))
      : null;

  return (
    <Card className="mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <BudgetStat label="Selected" value={formatCurrency(b.selected, b.currency)} />
          <BudgetStat
            label="Approved"
            value={formatCurrency(b.approved, b.currency)}
            className="text-success"
          />
          <BudgetStat label="Awaiting decision" value={formatCurrency(b.pending, b.currency)} />
          {b.budget != null && (
            <BudgetStat
              label={over ? 'Over budget' : 'Remaining'}
              value={formatCurrency(Math.abs(b.remaining ?? 0), b.currency)}
              className={over ? 'text-destructive' : undefined}
            />
          )}
        </div>
        {b.budget != null && (
          <div className="min-w-44 flex-1 sm:max-w-xs">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Budget {formatCurrency(b.budget, b.currency)}</span>
              {pct != null && <span>{pct}%</span>}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full ${over ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${pct ?? 0}%` }}
              />
            </div>
          </div>
        )}
      </div>
      {b.multiCurrency && (
        <p className="mt-2 text-xs text-muted-foreground">
          Products use mixed currencies — totals converted to {b.currency} at
          today&apos;s rates.
        </p>
      )}
    </Card>
  );
}

function BudgetStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-display text-lg font-medium ${className ?? ''}`}>{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value || '—'}</dd>
    </div>
  );
}

function RoomDialog({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/projects/${projectId}/rooms`, { name, notes: notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms', projectId] });
      toast.success('Room added');
      setName('');
      setNotes('');
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader title="Add room" description="e.g. Living Room, Kitchen, Primary Bath." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="room-name">Room name</Label>
          <Input id="room-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="room-notes">Notes</Label>
          <Textarea id="room-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Add room
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function ScheduleDialog({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState<ScheduleType>('material');

  const mutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/schedules`, { name, type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules', projectId] });
      toast.success('Schedule created');
      setName('');
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader title="New schedule" description="Group products into a deliverable schedule." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="sch-name">Schedule name</Label>
          <Input
            id="sch-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Material Schedule"
            required
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sch-type">Type</Label>
          <Select id="sch-type" value={type} onChange={(e) => setType(e.target.value as ScheduleType)}>
            <option value="material">Material</option>
            <option value="furniture">Furniture</option>
            <option value="fixture">Fixture</option>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Create schedule
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
