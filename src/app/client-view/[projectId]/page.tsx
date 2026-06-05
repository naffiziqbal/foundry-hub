'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layers, Check, XCircle, Package, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApprovalBadge, StatusBadge } from '@/components/ui/badge';
import { Skeleton, EmptyState, PageSpinner } from '@/components/ui/misc';
import { formatCurrency } from '@/lib/utils';
import type { Product, Project, Room } from '@/lib/types';

export default function ClientViewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, loading } = useAuth();
  const isPreview = user?.role === 'designer';

  const { data: project, isLoading: pLoading, error } = useQuery({
    queryKey: ['cv-project', projectId],
    queryFn: () => api.get<Project>(`/projects/${projectId}`),
    enabled: !!user,
  });
  const { data: rooms } = useQuery({
    queryKey: ['cv-rooms', projectId],
    queryFn: () => api.get<Room[]>(`/projects/${projectId}/rooms`),
    enabled: !!user,
  });
  const { data: products } = useQuery({
    queryKey: ['cv-products', projectId],
    queryFn: () => api.get<Product[]>(`/projects/${projectId}/products`),
    enabled: !!user,
  });

  if (loading) return <PageSpinner />;

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <Brand />
        <p className="max-w-sm text-muted-foreground">
          Please sign in to review this project and approve selections.
        </p>
        <Link href="/login">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader projectName={project?.name} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {pLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-12 w-72" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : error || !project ? (
          <EmptyState
            icon={Package}
            title="Project unavailable"
            description="This project may not be shared with your account."
          />
        ) : (
          <>
            <div className="mb-8 animate-fade-in">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl font-medium">{project.name}</h1>
                <StatusBadge status={project.status} />
              </div>
              {project.address && (
                <p className="mt-1 text-muted-foreground">{project.address}</p>
              )}
              {isPreview ? (
                <div className="mt-4 max-w-2xl rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Preview mode</span> — this
                  is how your client sees the project. Approve and reject decisions
                  can only be made by the client.
                </div>
              ) : (
                <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
                  Review the selections below. Approve the items you&apos;re happy with,
                  or reject to request alternatives.
                </p>
              )}
            </div>

            {rooms?.map((room) => {
              const roomProducts = products?.filter((p) => p.roomId === room.id) ?? [];
              if (!roomProducts.length) return null;
              return (
                <section key={room.id} className="mb-10 animate-fade-in">
                  <h2 className="mb-4 text-lg font-semibold">{room.name}</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {roomProducts.map((p) => (
                      <ReviewCard
                        key={p.id}
                        product={p}
                        projectId={projectId}
                        readOnly={isPreview}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {!products?.length && (
              <EmptyState
                icon={Package}
                title="Nothing to review yet"
                description="Your designer hasn't shared any selections for review."
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ReviewCard({
  product,
  projectId,
  readOnly = false,
}: {
  product: Product;
  projectId: string;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const decide = useMutation({
    mutationFn: (status: 'approved' | 'rejected') =>
      api.post(`/products/${product.id}/decision`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cv-products', projectId] });
      toast.success('Thanks — your decision was recorded.');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] bg-muted">
        {product.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Package className="h-8 w-8" />
          </div>
        )}
        <div className="absolute right-2 top-2">
          <ApprovalBadge status={product.approvalStatus} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-medium">{product.name}</h3>
        {product.vendor && (
          <p className="text-xs text-muted-foreground">{product.vendor}</p>
        )}
        <p className="mt-1 font-display">{formatCurrency(product.price, product.currency)}</p>
        {product.dimensions && (
          <p className="mt-1 text-xs text-muted-foreground">{product.dimensions}</p>
        )}

        {!readOnly && (
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant={product.approvalStatus === 'approved' ? 'default' : 'outline'}
              className="flex-1"
              loading={decide.isPending}
              onClick={() => decide.mutate('approved')}
            >
              <Check className="h-4 w-4" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-destructive"
              loading={decide.isPending}
              onClick={() => decide.mutate('rejected')}
            >
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Layers className="h-5 w-5" />
      </div>
      <span className="text-lg font-semibold tracking-tight">Foundry Hub</span>
    </div>
  );
}

function ClientHeader({ projectName }: { projectName?: string }) {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Brand />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:block">
            {user?.name}
          </span>
          <button
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
