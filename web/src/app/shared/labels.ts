import { ClaimStatus, CoverType, DocumentCategory } from '../core/models';

/** Theme-aware colour for each status, defined in styles.scss. */
export const STATUS_COLORS: Record<ClaimStatus, string> = {
  SUBMITTED: 'var(--status-submitted)',
  UNDER_ASSESSMENT: 'var(--status-assessment)',
  APPROVED: 'var(--status-approved)',
  REJECTED: 'var(--status-rejected)',
  PAID: 'var(--status-paid)',
  CANCELLED: 'var(--status-cancelled)',
};

export const STATUS_ICONS: Record<ClaimStatus, string> = {
  SUBMITTED: 'upload_file',
  UNDER_ASSESSMENT: 'manage_search',
  APPROVED: 'check_circle',
  REJECTED: 'cancel',
  PAID: 'payments',
  CANCELLED: 'block',
};

export const DOCUMENT_LABELS: Record<DocumentCategory, string> = {
  DEATH_CERTIFICATE: 'Death certificate',
  MEDICAL_REPORT: 'Medical report',
  ID_DOCUMENT: 'ID document',
  POLICE_REPORT: 'Police report',
  BANK_CONFIRMATION: 'Bank confirmation',
  OTHER: 'Other',
};

/** Days an open claim may wait before it counts as overdue; mirrors the API's decision SLA. */
export const SLA_DAYS = 3;

export const STATUS_LABELS: Record<ClaimStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_ASSESSMENT: 'Under assessment',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

/** Button text for moving a claim into each status. */
export const ACTION_LABELS: Record<ClaimStatus, string> = {
  SUBMITTED: 'Submit',
  UNDER_ASSESSMENT: 'Start assessment',
  APPROVED: 'Approve',
  REJECTED: 'Reject',
  PAID: 'Mark as paid',
  CANCELLED: 'Cancel claim',
};

export const COVER_LABELS: Record<CoverType, string> = {
  DEATH: 'Death',
  DISABILITY: 'Disability',
  FUNERAL: 'Funeral',
};

/** Mirrors the API rule: rejecting or cancelling needs a reason. */
export function requiresReason(status: ClaimStatus): boolean {
  return status === 'REJECTED' || status === 'CANCELLED';
}
