/** Mirrors the API's DTOs. Dates are ISO strings as sent over the wire. */

export type Role = 'MEMBER' | 'ASSESSOR' | 'ADMIN';
export type CoverType = 'DEATH' | 'DISABILITY' | 'FUNERAL';
export type MemberStatus = 'ACTIVE' | 'EXITED';
export type ClaimStatus = 'SUBMITTED' | 'UNDER_ASSESSMENT' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';

export const CLAIM_STATUSES: readonly ClaimStatus[] = [
  'SUBMITTED',
  'UNDER_ASSESSMENT',
  'APPROVED',
  'REJECTED',
  'PAID',
  'CANCELLED',
];

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Session {
  accessToken: string;
  expiresAt: string;
  username: string;
  role: Role;
  memberId: string | null;
}

export interface MemberSummary {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  status: MemberStatus;
  schemeName: string;
  policyNumber: string;
  joinDate: string;
}

export interface Beneficiary {
  id: string;
  fullName: string;
  relationship: string;
  allocationPercent: number;
}

export interface MemberDetail {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  annualSalary: number;
  joinDate: string;
  exitDate: string | null;
  status: MemberStatus;
  policyId: string;
  policyNumber: string;
  schemeId: string;
  schemeName: string;
  coverTypes: CoverType[];
  coverAmount: number;
  waitingPeriodEndsOn: string;
  beneficiaries: Beneficiary[];
}

export interface PremiumQuote {
  memberId: string;
  memberName: string;
  age: number;
  coverAmount: number;
  monthlyRate: number;
  monthlyPremium: number;
  asOf: string;
}

export interface ClaimSummary {
  id: string;
  claimNumber: string;
  memberId: string;
  memberName: string;
  coverType: CoverType;
  eventDate: string;
  status: ClaimStatus;
  coverAmount: number;
  submittedAt: string;
  decidedAt: string | null;
  assignee: string | null;
}

export interface ClaimTransition {
  fromStatus: ClaimStatus | null;
  toStatus: ClaimStatus;
  actor: string;
  reason: string | null;
  occurredAt: string;
}

export interface Payout {
  beneficiaryName: string;
  allocationPercent: number;
  amount: number;
}

export interface ClaimDetail extends ClaimSummary {
  policyNumber: string;
  description: string;
  allowedTransitions: ClaimStatus[];
  transitions: ClaimTransition[];
  payouts: Payout[];
}

export interface SubmitClaimRequest {
  memberId: string;
  coverType: CoverType;
  eventDate: string;
  description: string;
}

export type DocumentCategory =
  | 'DEATH_CERTIFICATE'
  | 'MEDICAL_REPORT'
  | 'ID_DOCUMENT'
  | 'POLICE_REPORT'
  | 'BANK_CONFIRMATION'
  | 'OTHER';

export interface ClaimNote {
  id: string;
  author: string;
  authorRole: Role;
  body: string;
  internal: boolean;
  createdAt: string;
}

export interface ClaimDocument {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  category: DocumentCategory;
  uploadedBy: string;
  uploadedAt: string;
}

export type NotificationType =
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_STATUS_CHANGED'
  | 'CLAIM_WITHDRAWN'
  | 'NOTE_ADDED'
  | 'DOCUMENT_ADDED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationFeed {
  unread: number;
  items: AppNotification[];
}

export interface MonthCount {
  month: string;
  count: number;
}

export interface AgingClaim {
  id: string;
  claimNumber: string;
  memberName: string;
  status: ClaimStatus;
  assignee: string | null;
  submittedAt: string;
  ageDays: number;
}

export interface ActivityItem {
  claimId: string;
  claimNumber: string;
  memberName: string;
  fromStatus: ClaimStatus | null;
  toStatus: ClaimStatus;
  actor: string;
  reason: string | null;
  occurredAt: string;
}

export interface Dashboard {
  claimsByStatus: Record<ClaimStatus, number>;
  openClaims: number;
  assignedToMe: number;
  unassigned: number;
  paidOut: number;
  awaitingPayment: number;
  averageDecisionHours: number | null;
  decidedWithinSla: number;
  decided: number;
  submittedByMonth: MonthCount[];
  oldestOpen: AgingClaim[];
  recentActivity: ActivityItem[];
  activeMembers: number;
  schemes: number;
  generatedAt: string;
}

export interface RateBand {
  minAge: number;
  maxAge: number;
  monthlyRate: number;
}

export interface Scheme {
  id: string;
  name: string;
  registrationNumber: string;
  contactEmail: string;
  policyCount: number;
  createdAt: string;
}

export interface Policy {
  id: string;
  schemeId: string;
  schemeName: string;
  policyNumber: string;
  coverTypes: CoverType[];
  coverMultiple: number;
  waitingPeriodMonths: number;
  effectiveDate: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  memberCount: number;
}

export interface BeneficiaryInput {
  fullName: string;
  relationship: string;
  allocationPercent: number;
}

/** RFC 9457 problem details, plus the API's extension members. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  errors?: Record<string, string>;
}
