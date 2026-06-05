'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Trash2,
  Plus,
  FileDown,
  Package,
  Check,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApprovalBadge } from '@/components/ui/badge';
import { Skeleton, EmptyState } from '@/components/ui/misc';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatCurrency, titleCase } from '@/lib/utils';
import type { Product, Schedule, ScheduleItem } from '@/lib/types';

export default function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isDesigner = user?.role === 'designer';
  const [addOpen, setAddOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule', id],
    queryFn: () => api.get<Schedule>(`/schedules/${id}`),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.patch(`/schedules/${id}/items/reorder`, { orderedIds }),
    onError: (e: any) => {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ['schedule', id] });
    },
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.delete(`/schedule-items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', id] }),
    onError: (e: any) => toast.error(e.message),
  });

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || !schedule?.items) return;
    const ids = schedule.items.map((i) => i.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    const next = arrayMove(schedule.items, oldIndex, newIndex);
    qc.setQueryData<Schedule>(['schedule', id], (prev) =>
      prev ? { ...prev, items: next } : prev,
    );
    reorder.mutate(next.map((i) => i.id));
  }

  async function exportPdf() {
    setExporting(true);
    try {
      const { url } = await api.post<{ url: string }>(`/schedules/${id}/export`);
      toast.success('PDF generated');
      window.open(url, '_blank');
    } catch (e: any) {
      toast.error(e.message ?? 'Export failed (is Spaces configured?)');
    } finally {
      setExporting(false);
    }
  }

  if (isLoading || !schedule) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const items = schedule.items ?? [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Project', href: `/projects/${schedule.projectId}` },
          { label: schedule.name },
        ]}
        title={schedule.name}
        description={`${titleCase(schedule.type)} schedule · ${items.length} items`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPdf} loading={exporting}>
              <FileDown className="h-4 w-4" /> Export PDF
            </Button>
            {isDesigner && (
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Add products
              </Button>
            )}
          </div>
        }
      />

      {!items.length ? (
        <EmptyState
          icon={Package}
          title="No items on this schedule"
          description="Add products from this project to build the schedule, then drag to reorder."
          action={
            isDesigner && (
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Add products
              </Button>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-border">
                {items.map((item, idx) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    index={idx}
                    canEdit={isDesigner}
                    onRemove={() => removeItem.mutate(item.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </Card>
      )}

      <AddProductsDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        scheduleId={id}
        projectId={schedule.projectId}
        existingIds={items.map((i) => i.productId)}
      />
    </div>
  );
}

function SortableRow({
  item,
  index,
  canEdit,
  onRemove,
}: {
  item: ScheduleItem;
  index: number;
  canEdit: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const p = item.product;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-4 bg-card px-4 py-3 ${isDragging ? 'z-10 shadow-float' : ''}`}
    >
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}
      <span className="w-5 text-sm text-muted-foreground">{index + 1}</span>
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
        {p.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Package className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{p.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[p.vendor, p.dimensions].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>
      <ApprovalBadge status={p.approvalStatus} />
      <span className="hidden w-24 text-right font-medium sm:block">
        {formatCurrency(p.price, p.currency)}
      </span>
      {canEdit && (
        <button
          onClick={onRemove}
          className="text-muted-foreground transition-colors hover:text-destructive"
          aria-label="Remove"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function AddProductsDialog({
  open,
  onClose,
  scheduleId,
  projectId,
  existingIds,
}: {
  open: boolean;
  onClose: () => void;
  scheduleId: string;
  projectId: string;
  existingIds: string[];
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['project-products', projectId],
    queryFn: () => api.get<Product[]>(`/projects/${projectId}/products`),
    enabled: open,
  });

  const add = useMutation({
    mutationFn: (productId: string) =>
      api.post(`/schedules/${scheduleId}/items`, { productId }),
    onMutate: (productId) => setAdding(productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule', scheduleId] });
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setAdding(null),
  });

  const available = products
    ?.filter((p) => !existingIds.includes(p.id))
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg">
      <DialogHeader title="Add products" description="Pick products from this project to add to the schedule." />
      <Input
        placeholder="Search products…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-3"
      />
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
        ) : !available?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {existingIds.length ? 'All products already added.' : 'No products in this project yet.'}
          </p>
        ) : (
          available.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                {p.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Package className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatCurrency(p.price, p.currency)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={adding === p.id}
                onClick={() => add.mutate(p.id)}
              >
                {adding === p.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Add
              </Button>
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
}
