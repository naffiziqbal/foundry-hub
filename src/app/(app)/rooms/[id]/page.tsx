'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Link2, Package, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApprovalBadge } from '@/components/ui/badge';
import { Skeleton, EmptyState } from '@/components/ui/misc';
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Input, Label, Textarea } from '@/components/ui/input';
import { ProductDetailDialog } from '@/components/dialogs/product-detail';
import { formatCurrency } from '@/lib/utils';
import type { Product, Room } from '@/lib/types';

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isDesigner = user?.role === 'designer';

  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<string | null>(null);

  const { data: room } = useQuery({
    queryKey: ['room', id],
    queryFn: () => api.get<Room>(`/rooms/${id}`),
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', id],
    queryFn: () => api.get<Product[]>(`/rooms/${id}/products`),
    refetchInterval: (query) => {
      const data = query.state.data as Product[] | undefined;
      return data?.some((p) => ['pending', 'processing'].includes(p.importStatus))
        ? 2500
        : false;
    },
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          ...(room ? [{ label: 'Project', href: `/projects/${room.projectId}` }] : []),
          { label: room?.name ?? 'Room' },
        ]}
        title={room?.name ?? 'Room'}
        description={room?.notes ?? undefined}
        action={
          isDesigner && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setManualOpen(true)}>
                <Plus className="h-4 w-4" /> Manual
              </Button>
              <Button onClick={() => setImportOpen(true)}>
                <Link2 className="h-4 w-4" /> Import from URL
              </Button>
            </div>
          )
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : !products?.length ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Paste a vendor URL to auto-import a product, or add one manually."
          action={
            isDesigner && (
              <Button onClick={() => setImportOpen(true)}>
                <Link2 className="h-4 w-4" /> Import from URL
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onClick={() => setActiveProduct(p.id)} />
          ))}
        </div>
      )}

      <ProductImportDialog open={importOpen} onClose={() => setImportOpen(false)} roomId={id} />
      <ManualProductDialog open={manualOpen} onClose={() => setManualOpen(false)} roomId={id} />
      <ProductDetailDialog
        productId={activeProduct}
        roomId={id}
        open={!!activeProduct}
        onClose={() => setActiveProduct(null)}
      />
    </div>
  );
}

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const importing = ['pending', 'processing'].includes(product.importStatus);
  const failed = product.importStatus === 'failed';
  return (
    <Card
      onClick={onClick}
      className="group flex cursor-pointer flex-col overflow-hidden transition-all hover:shadow-elevated"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {product.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {importing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs">Importing…</span>
              </div>
            ) : (
              <Package className="h-8 w-8" />
            )}
          </div>
        )}
        <div className="absolute right-2 top-2">
          <ApprovalBadge status={product.approvalStatus} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-medium group-hover:text-primary">{product.name}</h3>
        {product.vendor && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{product.vendor}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-display text-base">
            {formatCurrency(product.price, product.currency)}
          </span>
          {failed && (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> Import failed
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function ProductImportDialog({
  open,
  onClose,
  roomId,
}: {
  open: boolean;
  onClose: () => void;
  roomId: string;
}) {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/rooms/${roomId}/products/import`, { url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', roomId] });
      toast.success('Importing product — this runs in the background.');
      setUrl('');
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader
        title="Import from URL"
        description="Paste a vendor product link. We'll extract images, price and specs automatically."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="url">Product URL</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://vendor.com/product/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            <Link2 className="h-4 w-4" /> Import
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function ManualProductDialog({
  open,
  onClose,
  roomId,
}: {
  open: boolean;
  onClose: () => void;
  roomId: string;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', vendor: '', price: '', dimensions: '', description: '' });
  const set = (k: keyof typeof form) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/rooms/${roomId}/products`, {
        name: form.name,
        vendor: form.vendor || undefined,
        price: form.price ? Number(form.price) : undefined,
        dimensions: form.dimensions || undefined,
        description: form.description || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', roomId] });
      toast.success('Product added');
      setForm({ name: '', vendor: '', price: '', dimensions: '', description: '' });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader title="Add product manually" description="Enter product details by hand." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="m-name">Name</Label>
          <Input id="m-name" value={form.name} onChange={set('name')} required autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="m-vendor">Vendor</Label>
            <Input id="m-vendor" value={form.vendor} onChange={set('vendor')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-price">Price</Label>
            <Input id="m-price" type="number" step="0.01" value={form.price} onChange={set('price')} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-dim">Dimensions</Label>
          <Input id="m-dim" value={form.dimensions} onChange={set('dimensions')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-desc">Description</Label>
          <Textarea id="m-desc" value={form.description} onChange={set('description')} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Add product
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
