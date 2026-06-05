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
import { formatDate, titleCase } from '@/lib/utils';
import type { Project, Room, Schedule, ScheduleType } from '@/lib/types';

const SCHEDULE_ICON: Record<ScheduleType, any> = {
  material: FileText,
  furniture: Sofa,
  fixture: Lightbulb,
};

type Tab = 'rooms' | 'schedules' | 'details';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
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
