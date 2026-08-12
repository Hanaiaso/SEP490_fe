// Kiểu dữ liệu khớp với DTO backend trong VietTien.API/DTOs/Admin/*.cs (route api/admin/*).

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// api/admin/discount-tiers — DiscountPercent là phân số (0.05 = 5%), không phải phần trăm nguyên.
export interface DiscountTier {
  id: string;
  minAmount: number;
  maxAmount?: number;
  discountPercent: number;
  isActive: boolean;
  description?: string;
}

export interface CreateDiscountTierRequest {
  minAmount: number;
  maxAmount?: number;
  discountPercent: number;
  description?: string;
}

export interface UpdateDiscountTierRequest extends CreateDiscountTierRequest {
  isActive: boolean;
}

// api/admin/system-configs
export interface SystemConfig {
  key: string;
  valueType: string;
  description?: string;
  unit?: string;
  ownerLevel: string;
  isActive: boolean;
  effectiveValue?: string;
  effectiveDate?: string;
  versionCount: number;
}

export interface SystemConfigVersion {
  id: string;
  configKey: string;
  value: string;
  effectiveDate: string;
  actorUserId?: string;
  actorEmail?: string;
  changeReason?: string;
  createdAt: string;
  isCurrentlyEffective: boolean;
}

export interface UpdateSystemConfigRequest {
  value: string;
  effectiveDate?: string;
  reason: string;
}

// api/admin/system-health/job-runs
export type JobRunStatus = 'Running' | 'Success' | 'Failed';
export type JobTriggerType = 'Scheduled' | 'Manual';

export interface JobRun {
  id: string;
  jobName: string;
  status: JobRunStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  itemsProcessed?: number;
  errorMessage?: string;
  triggerType: JobTriggerType;
  triggeredByUserId?: string;
}

export interface JobHealthSummary {
  jobName: string;
  intervalDescription: string;
  lastRun?: JobRun;
  todaySuccessCount: number;
  todayFailureCount: number;
  isCurrentlyRunning: boolean;
}

// api/admin/system-health/webhook-logs
export type WebhookLogStatus = 'Received' | 'Processed' | 'Failed' | 'Abandoned';

export interface WebhookLog {
  id: string;
  source: string;
  rawPayload: string;
  status: WebhookLogStatus;
  attemptCount: number;
  lastError?: string;
  receivedAt: string;
  lastAttemptAt?: string;
  processedAt?: string;
}

// api/admin/users
export type SystemRole = 'Guest' | 'Customer' | 'SalesStaff' | 'SalesManager' | 'WarehouseStaff' | 'AccountingStaff' | 'CEO' | 'Admin';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: SystemRole;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  hasActiveSession: boolean;
  sessionExpiresAt?: string;
}

export interface CreateStaffUserRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: SystemRole;
}

export interface ChangeUserRoleRequest {
  newRole: SystemRole;
  reason: string;
}

export interface SetUserActiveStatusRequest {
  isActive: boolean;
  reason: string;
}

// api/admin/audit-logs — field thật là actorEmail, KHÔNG có actorUserName.
export interface AuditLog {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  actorUserId?: string;
  actorEmail?: string;
  actorRole?: string;
  beforeJson?: string;
  afterJson?: string;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
}

// api/vehicles — không có status enum hay assigned driver, chỉ có isActive.
export interface Vehicle {
  id: string;
  vehicleNumber: number;
  licensePlate: string;
  capacity?: number;
  isActive: boolean;
  note?: string;
}

export interface CreateVehicleRequest {
  vehicleNumber: number;
  licensePlate: string;
  capacity?: number;
  note?: string;
}

export interface UpdateVehicleRequest {
  licensePlate: string;
  capacity?: number;
  isActive: boolean;
  note?: string;
}
