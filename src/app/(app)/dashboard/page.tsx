'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  FolderKanban,
  Activity,
  Package,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton, EmptyState } from '@/components/ui/misc';
import { ProjectDialog } from '@/components/dialogs/project-dialog';
import { formatCurrency, formatDate, titleCase } from '@/lib/utils';
import type { CostEstimate, DashboardSummary } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
  });

  const isDesigner = user?.role === 'designer';

  const stats = [
    {
      label: 'Total projects',
      value: data?.stats.totalProjects,
      icon: FolderKanban,
    },
    { label: 'Active', value: data?.stats.activeProjects, icon: Activity },
    { label: 'Products', value: data?.stats.totalProducts, icon: Package },
    {
      label: 'Pending approvals',
      value: data?.stats.pendingApprovals,
      icon: Clock,
      accent: true,
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? ''}`}
        description="Here's what's happening across your projects."
        action={
          isDesigner && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New project
            </Button>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon
                className={`h-4 w-4 ${s.accent ? 'text-accent' : 'text-muted-foreground'}`}
              />
            </div>
            <div className="mt-3 font-display text-3xl font-medium">
              {isLoading ? (
                <Skeleton className="h-9 w-12" />
              ) : (
                (s.value ?? 0)
              )}
            </div>
          </Card>
        ))}
      </div>

      {isDesigner && <CostInsightsCard />}

      {/* Recent projects */}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent projects</h2>
          <Link
            href="/projects"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : !data?.recentProjects.length ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description={
              isDesigner
                ? 'Create your first project to start building schedules.'
                : 'Projects shared with you will appear here.'
            }
            action={
              isDesigner && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> New project
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentProjects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="group h-full p-5 transition-all hover:shadow-elevated">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium leading-tight transition-colors group-hover:text-primary">
                      {p.name}
                    </h3>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.clientName && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {p.clientName}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Updated {formatDate(p.updatedAt)}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CostInsightsCard() {
  const { data } = useQuery({
    queryKey: ['cost-insights'],
    queryFn: () => api.get<CostEstimate>('/insights/cost-estimate'),
  });
  if (!data?.overall || !data.byRoom.length) return null;

  return (
    <Card className="mt-6 p-5">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h2 className="font-medium">Cost insights</h2>
        <span className="text-xs text-muted-foreground">
          from {data.projectsAnalyzed} project{data.projectsAnalyzed === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Typical project total</p>
          <p className="font-display text-xl font-medium">
            {formatCurrency(data.overall.avgTotal, data.currency)}
          </p>
          {data.projectsAnalyzed > 1 && (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(data.overall.minTotal, data.currency)} –{' '}
              {formatCurrency(data.overall.maxTotal, data.currency)}
            </p>
          )}
        </div>
        {data.byRoom.slice(0, 4).map((r) => (
          <div key={r.room}>
            <p className="text-xs text-muted-foreground">{titleCase(r.room)}</p>
            <p className="font-display text-xl font-medium">
              {formatCurrency(r.avgTotal, data.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              avg of {r.samples} project{r.samples === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
