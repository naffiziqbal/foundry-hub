'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, Plus, MapPin, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton, EmptyState, Avatar } from '@/components/ui/misc';
import { ProjectDialog } from '@/components/dialogs/project-dialog';
import { formatDate } from '@/lib/utils';
import type { Project } from '@/lib/types';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [q, setQ] = useState('');
  const isDesigner = user?.role === 'designer';

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects'),
  });

  const filtered = projects?.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      (p.clientName ?? '').toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Projects"
        description="All the projects you manage and collaborate on."
        action={
          isDesigner && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New project
            </Button>
          )
        }
      />

      <div className="mb-6 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search projects…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !filtered?.length ? (
        <EmptyState
          icon={FolderKanban}
          title={q ? 'No matching projects' : 'No projects yet'}
          description={
            q
              ? 'Try a different search term.'
              : isDesigner
                ? 'Create your first project to get started.'
                : 'Projects shared with you will appear here.'
          }
          action={
            isDesigner &&
            !q && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> New project
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="group flex h-full flex-col p-5 transition-all hover:shadow-elevated">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium leading-tight transition-colors group-hover:text-primary">
                    {p.name}
                  </h3>
                  <StatusBadge status={p.status} />
                </div>
                {p.address && (
                  <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{p.address}</span>
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2">
                    {p.client && <Avatar name={p.client.name} className="h-7 w-7" />}
                    <span className="text-xs text-muted-foreground">
                      {p.clientName ?? p.client?.name ?? 'No client'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(p.updatedAt)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
