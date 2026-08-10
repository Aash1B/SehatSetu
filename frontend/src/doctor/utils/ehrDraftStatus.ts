import { EhrDraftStatus } from '../../types';

export function ehrStatusBadgeVariant(status: string): 'default' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case EhrDraftStatus.VERIFIED:
      return 'success';
    case EhrDraftStatus.REJECTED:
      return 'danger';
    case EhrDraftStatus.DRAFT:
    default:
      return 'warning';
  }
}

export function ehrStatusLabel(status: string): string {
  switch (status) {
    case EhrDraftStatus.VERIFIED:
      return 'Verified';
    case EhrDraftStatus.REJECTED:
      return 'Rejected';
    case EhrDraftStatus.DRAFT:
      return 'Draft — Pending Review';
    default:
      return status;
  }
}
