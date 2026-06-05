export type UserRole = 'designer' | 'client';

export type ProjectStatus =
  | 'planning'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'archived';

export type ScheduleType = 'material' | 'furniture' | 'fixture';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type CommentVisibility = 'internal' | 'client';

export interface User {
  id: string;
  email: string;
  name: string;
  company?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientName?: string | null;
  address?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  coverImageUrl?: string | null;
  designerId: string;
  clientId?: string | null;
  designer?: User;
  client?: User | null;
  rooms?: Room[];
  schedules?: Schedule[];
  roomCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  name: string;
  notes?: string | null;
  position: number;
  projectId: string;
  products?: Product[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  vendor?: string | null;
  manufacturer?: string | null;
  sku?: string | null;
  price?: number | null;
  currency: string;
  dimensions?: string | null;
  specifications: ProductSpec[];
  images: string[];
  sourceUrl?: string | null;
  notes?: string | null;
  position: number;
  approvalStatus: ApprovalStatus;
  approvalNote?: string | null;
  approvalDecidedAt?: string | null;
  importStatus: ImportStatus;
  importError?: string | null;
  roomId: string;
  projectId: string;
  room?: Room;
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  body: string;
  visibility: CommentVisibility;
  productId: string;
  authorId?: string | null;
  author?: User | null;
  createdAt: string;
}

export interface Schedule {
  id: string;
  name: string;
  type: ScheduleType;
  projectId: string;
  items?: ScheduleItem[];
  itemCount?: number;
  createdAt: string;
}

export interface ScheduleItem {
  id: string;
  scheduleId: string;
  productId: string;
  position: number;
  quantity: number;
  product: Product;
}

export type NotificationType =
  | 'approval_request'
  | 'approval_decision'
  | 'product_update'
  | 'product_imported'
  | 'comment_added'
  | 'project_invite';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  read: boolean;
  data: Record<string, any>;
  createdAt: string;
}

export interface DashboardSummary {
  stats: {
    totalProjects: number;
    activeProjects: number;
    totalProducts: number;
    pendingApprovals: number;
  };
  recentProjects: Project[];
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}
