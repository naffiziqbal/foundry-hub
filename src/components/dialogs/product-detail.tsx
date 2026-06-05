'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Trash2,
  Plus,
  X,
  Upload,
  ExternalLink,
  Send,
  Check,
  XCircle,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { api, uploadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select } from '@/components/ui/input';
import { ApprovalBadge } from '@/components/ui/badge';
import { Avatar, Separator } from '@/components/ui/misc';
import { cn, formatCurrency, relativeTime } from '@/lib/utils';
import type { Product, Comment, ProductSpec } from '@/lib/types';

export function ProductDetailDialog({
  productId,
  roomId,
  open,
  onClose,
}: {
  productId: string | null;
  roomId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isDesigner = user?.role === 'designer';
  const fileRef = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Partial<Product>>({});
  const [commentBody, setCommentBody] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: product } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.get<Product>(`/products/${productId}`),
    enabled: open && !!productId,
  });
  const { data: comments } = useQuery({
    queryKey: ['comments', productId],
    queryFn: () => api.get<Comment[]>(`/products/${productId}/comments`),
    enabled: open && !!productId,
  });

  useEffect(() => {
    if (product) setForm(product);
    setEdit(false);
  }, [product]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['product', productId] });
    qc.invalidateQueries({ queryKey: ['products', roomId] });
  };

  const save = useMutation({
    mutationFn: (payload: Partial<Product>) =>
      api.patch<Product>(`/products/${productId}`, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Product updated');
      setEdit(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/products/${productId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', roomId] });
      toast.success('Product removed');
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const requestApproval = useMutation({
    mutationFn: () => api.post(`/products/${productId}/request-approval`),
    onSuccess: () => {
      invalidate();
      toast.success('Approval requested from client');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: (status: 'approved' | 'rejected') =>
      api.post(`/products/${productId}/decision`, { status }),
    onSuccess: () => {
      invalidate();
      toast.success('Decision recorded');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addComment = useMutation({
    mutationFn: (payload: { body: string; visibility: string }) =>
      api.post(`/products/${productId}/comments`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', productId] });
      setCommentBody('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !product) return;
    setUploading(true);
    try {
      const { url } = await uploadFile(file, 'products');
      await save.mutateAsync({ images: [...(form.images ?? product.images), url] });
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed (is Spaces configured?)');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (!product) {
    return (
      <Dialog open={open} onClose={onClose} className="max-w-3xl">
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Dialog>
    );
  }

  const setF = (k: keyof Product) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} className="max-w-3xl">
      <div className="max-h-[80vh] overflow-y-auto pr-1">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-4 pr-8">
          <div className="min-w-0">
            {edit ? (
              <Input value={form.name ?? ''} onChange={setF('name')} className="text-lg" />
            ) : (
              <h2 className="text-xl font-semibold">{product.name}</h2>
            )}
            <div className="mt-2 flex items-center gap-2">
              <ApprovalBadge status={product.approvalStatus} />
              {product.vendor && (
                <span className="text-sm text-muted-foreground">{product.vendor}</span>
              )}
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(form.images ?? product.images).map((img, i) => (
            <div key={i} className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-full w-full object-cover" />
              {isDesigner && edit && (
                <button
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      images: (f.images ?? product.images).filter((_, j) => j !== i),
                    }))
                  }
                  className="absolute right-1 top-1 rounded-full bg-foreground/70 p-1 text-background hover:bg-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {isDesigner && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              <span className="text-xs">Upload</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
        </div>

        <Separator className="my-4" />

        {/* Fields */}
        {edit ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vendor"><Input value={form.vendor ?? ''} onChange={setF('vendor')} /></Field>
            <Field label="Manufacturer"><Input value={form.manufacturer ?? ''} onChange={setF('manufacturer')} /></Field>
            <Field label="SKU"><Input value={form.sku ?? ''} onChange={setF('sku')} /></Field>
            <Field label="Price">
              <Input
                type="number"
                step="0.01"
                value={form.price ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value === '' ? null : Number(e.target.value) }))
                }
              />
            </Field>
            <Field label="Currency"><Input value={form.currency ?? 'USD'} onChange={setF('currency')} /></Field>
            <Field label="Dimensions"><Input value={form.dimensions ?? ''} onChange={setF('dimensions')} /></Field>
            <div className="col-span-2">
              <Field label="Description"><Textarea value={form.description ?? ''} onChange={setF('description')} /></Field>
            </div>
            <div className="col-span-2">
              <Field label="Notes"><Textarea value={form.notes ?? ''} onChange={setF('notes')} /></Field>
            </div>
            <div className="col-span-2">
              <SpecEditor
                specs={form.specifications ?? []}
                onChange={(specs) => setForm((f) => ({ ...f, specifications: specs }))}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Info label="Price" value={formatCurrency(product.price, product.currency)} />
            <Info label="Manufacturer" value={product.manufacturer} />
            <Info label="SKU" value={product.sku} />
            <Info label="Dimensions" value={product.dimensions} />
            {product.description && (
              <div className="col-span-2">
                <Info label="Description" value={product.description} />
              </div>
            )}
            {product.notes && (
              <div className="col-span-2">
                <Info label="Notes" value={product.notes} />
              </div>
            )}
            {product.specifications?.length > 0 && (
              <div className="col-span-2 mt-1">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Specifications
                </p>
                <div className="divide-y divide-border rounded-lg border border-border">
                  {product.specifications.map((s, i) => (
                    <div key={i} className="flex justify-between px-3 py-1.5 text-sm">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-medium">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {product.sourceUrl && (
              <a
                href={product.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="col-span-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View source
              </a>
            )}
          </div>
        )}

        {/* Approval note */}
        {product.approvalNote && !edit && (
          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <span className="font-medium">Client note: </span>
            {product.approvalNote}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {isDesigner && !edit && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setEdit(true)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                loading={requestApproval.isPending}
                onClick={() => requestApproval.mutate()}
              >
                <Send className="h-4 w-4" /> Request approval
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm('Remove this product?')) remove.mutate();
                }}
              >
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            </>
          )}
          {isDesigner && edit && (
            <>
              <Button size="sm" loading={save.isPending} onClick={() => save.mutate(form)}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setForm(product); setEdit(false); }}>
                Cancel
              </Button>
            </>
          )}
          {/* Client approval decision */}
          {!isDesigner && !edit && (
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-success"
                loading={decide.isPending}
                onClick={() => decide.mutate('approved')}
              >
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                loading={decide.isPending}
                onClick={() => decide.mutate('rejected')}
              >
                <XCircle className="h-4 w-4" /> Reject
              </Button>
            </div>
          )}
        </div>

        <Separator className="my-5" />

        {/* Comments */}
        <div>
          <p className="mb-3 flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4" /> Comments & notes
          </p>
          <div className="space-y-3">
            {comments?.length ? (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar name={c.author?.name} className="h-7 w-7" />
                  <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{c.author?.name ?? 'Unknown'}</span>
                      {c.visibility === 'internal' && (
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          Internal
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {relativeTime(c.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm">{c.body}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
          </div>

          <CommentComposer
            value={commentBody}
            onChange={setCommentBody}
            isDesigner={isDesigner}
            loading={addComment.isPending}
            onSubmit={(visibility) =>
              commentBody.trim() && addComment.mutate({ body: commentBody, visibility })
            }
          />
        </div>
      </div>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value || '—'}</p>
    </div>
  );
}

function SpecEditor({
  specs,
  onChange,
}: {
  specs: ProductSpec[];
  onChange: (s: ProductSpec[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Specifications</Label>
      {specs.map((s, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder="Label"
            value={s.label}
            onChange={(e) => {
              const next = [...specs];
              next[i] = { ...next[i], label: e.target.value };
              onChange(next);
            }}
          />
          <Input
            placeholder="Value"
            value={s.value}
            onChange={(e) => {
              const next = [...specs];
              next[i] = { ...next[i], value: e.target.value };
              onChange(next);
            }}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(specs.filter((_, j) => j !== i))}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...specs, { label: '', value: '' }])}>
        <Plus className="h-4 w-4" /> Add spec
      </Button>
    </div>
  );
}

function CommentComposer({
  value,
  onChange,
  isDesigner,
  loading,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  isDesigner: boolean;
  loading: boolean;
  onSubmit: (visibility: 'internal' | 'client') => void;
}) {
  return (
    <div className="mt-4 space-y-2">
      <Textarea
        placeholder="Add a comment…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[60px]"
      />
      <div className="flex justify-end gap-2">
        {isDesigner && (
          <Button size="sm" variant="ghost" loading={loading} onClick={() => onSubmit('internal')}>
            Internal note
          </Button>
        )}
        <Button size="sm" loading={loading} onClick={() => onSubmit('client')}>
          <Send className="h-4 w-4" /> {isDesigner ? 'Send to client' : 'Comment'}
        </Button>
      </div>
    </div>
  );
}
