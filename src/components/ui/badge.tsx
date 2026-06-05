import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { ApprovalStatus } from '@/lib/types';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        success: 'border-transparent bg-success/12 text-success',
        warning: 'border-transparent bg-warning/12 text-warning',
        destructive: 'border-transparent bg-destructive/12 text-destructive',
        accent: 'border-transparent bg-accent/12 text-accent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

const APPROVAL_MAP: Record<
  ApprovalStatus,
  { label: string; variant: BadgeProps['variant'] }
> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const { label, variant } = APPROVAL_MAP[status];
  return (
    <Badge variant={variant}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

export function StatusBadge({ status }: { status: string }) {
  const variant: BadgeProps['variant'] =
    status === 'completed'
      ? 'success'
      : status === 'in_progress'
        ? 'default'
        : status === 'on_hold'
          ? 'warning'
          : 'secondary';
  return <Badge variant={variant}>{STATUS_LABELS[status] ?? status}</Badge>;
}
