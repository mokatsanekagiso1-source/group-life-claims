import { ClaimStatus, CoverType } from '../core/models';

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
