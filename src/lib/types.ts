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
  budget?: number | string | null;
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
  /** Present when fetched with ?currency= — price converted server-side. */
  displayPrice?: number | null;
  displayCurrency?: string;
  fxRate?: number | null;
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

export interface BudgetSummary {
  budget: number | null;
  currency: string;
  multiCurrency: boolean;
  selected: number;
  approved: number;
  pending: number;
  rejected: number;
  remaining: number | null;
}

export interface Vendor {
  id: string;
  name: string;
  website?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  tradeDiscountPct?: number | string | null;
  defaultLeadTimeDays?: number | null;
  notes?: string | null;
  productCount?: number;
  createdAt: string;
}

export type OrderStatus =
  | 'none'
  | 'to_order'
  | 'ordered'
  | 'shipped'
  | 'delivered'
  | 'installed';

export interface ProcurementItem {
  id: string;
  name: string;
  roomName: string;
  vendor?: string | null;
  vendorId?: string | null;
  price?: number | null;
  currency: string;
  /** Present when fetched with ?currency= — price converted server-side. */
  displayPrice?: number | null;
  displayCurrency?: string;
  fxRate?: number | null;
  imageUrl?: string | null;
  orderStatus: OrderStatus;
  leadTimeDays: number | null;
  requiredByDate: string | null;
  orderByDate: string | null;
  orderedAt: string | null;
  urgency: 'overdue' | 'urgent' | 'ok';
}

export interface ProcurementSummary {
  counts: Record<OrderStatus, number>;
  items: ProcurementItem[];
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'cancelled';

export interface PurchaseOrderLine {
  id: string;
  name: string;
  sku?: string | null;
  roomName?: string | null;
  unitPrice?: number | string | null;
  quantity: number;
  lineTotal: number | string;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  status: PurchaseOrderStatus;
  vendorName: string;
  vendorId?: string | null;
  subtotal: number | string;
  discountPct?: number | string | null;
  total: number | string;
  currency: string;
  notes?: string | null;
  pdfUrl?: string | null;
  sentAt?: string | null;
  createdAt: string;
  lines: PurchaseOrderLine[];
}

export interface RoomCostStat {
  room: string;
  samples: number;
  avgTotal: number;
  minTotal: number;
  maxTotal: number;
}

export interface CostEstimate {
  projectsAnalyzed: number;
  currency: string;
  overall: { avgTotal: number; minTotal: number; maxTotal: number } | null;
  byRoom: RoomCostStat[];
}
