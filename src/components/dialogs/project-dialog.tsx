'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select } from '@/components/ui/input';
import type { Project, ProjectStatus, User } from '@/lib/types';

const STATUSES: ProjectStatus[] = [
  'planning',
  'in_progress',
  'on_hold',
  'completed',
  'archived',
];

export function ProjectDialog({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project;
}) {
  const qc = useQueryClient();
  const editing = Boolean(project);
  const [form, setForm] = useState({
    name: '',
    clientName: '',
    address: '',
    status: 'planning' as ProjectStatus,
    startDate: '',
    endDate: '',
    notes: '',
    budget: '',
    clientId: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: project?.name ?? '',
        clientName: project?.clientName ?? '',
        address: project?.address ?? '',
        status: project?.status ?? 'planning',
        startDate: project?.startDate?.slice(0, 10) ?? '',
        endDate: project?.endDate?.slice(0, 10) ?? '',
        notes: project?.notes ?? '',
        budget: project?.budget != null ? String(project.budget) : '',
        clientId: project?.clientId ?? '',
      });
    }
  }, [open, project]);

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<User[]>('/users/clients'),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (payload: any) =>
      editing
        ? api.patch<Project>(`/projects/${project!.id}`, payload)
        : api.post<Project>('/projects', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      if (project) qc.invalidateQueries({ queryKey: ['project', project.id] });
      toast.success(editing ? 'Project updated' : 'Project created');
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to save'),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {
      name: form.name,
      clientName: form.clientName || undefined,
      address: form.address || undefined,
      status: form.status,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      notes: form.notes || undefined,
      budget: form.budget === '' ? null : Number(form.budget),
      clientId: form.clientId || undefined,
    };
    mutation.mutate(payload);
  }

  const set = (k: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader
        title={editing ? 'Edit project' : 'New project'}
        description="Projects organise rooms, products and schedules."
      />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Project name</Label>
          <Input id="name" value={form.name} onChange={set('name')} required autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="clientName">Client name</Label>
            <Input id="clientName" value={form.clientName} onChange={set('clientName')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input id="address" value={form.address} onChange={set('address')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" type="date" value={form.startDate} onChange={set('startDate')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endDate">End date</Label>
            <Input id="endDate" type="date" value={form.endDate} onChange={set('endDate')} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="budget">FF&amp;E budget (optional)</Label>
          <Input
            id="budget"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 85000"
            value={form.budget}
            onChange={set('budget')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clientId">Assign client (for approvals)</Label>
          <Select id="clientId" value={form.clientId} onChange={set('clientId')}>
            <option value="">— No client assigned —</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.email}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={set('notes')} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {editing ? 'Save changes' : 'Create project'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
