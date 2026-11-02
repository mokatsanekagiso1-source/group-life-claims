import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActivityItem,
  BeneficiaryInput,
  ClaimDetail,
  ClaimDocument,
  ClaimNote,
  ClaimStatus,
  ClaimSummary,
  CoverType,
  Dashboard,
  DocumentCategory,
  MemberDetail,
  MemberSummary,
  NotificationFeed,
  Page,
  Policy,
  PremiumQuote,
  RateBand,
  Scheme,
  SubmitClaimRequest,
} from './models';

@Injectable({ providedIn: 'root' })
export class MembersApi {
  private readonly http = inject(HttpClient);

  search(search: string, page: number, size: number, policyId?: string): Observable<Page<MemberSummary>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    if (policyId) {
      params = params.set('policyId', policyId);
    }
    return this.http.get<Page<MemberSummary>>('/api/members', { params });
  }

  get(id: string): Observable<MemberDetail> {
    return this.http.get<MemberDetail>(`/api/members/${id}`);
  }

  premium(id: string): Observable<PremiumQuote> {
    return this.http.get<PremiumQuote>(`/api/members/${id}/premium`);
  }

  replaceBeneficiaries(id: string, beneficiaries: BeneficiaryInput[]): Observable<MemberDetail> {
    return this.http.put<MemberDetail>(`/api/members/${id}/beneficiaries`, { beneficiaries });
  }

  create(policyId: string, member: NewMember): Observable<MemberDetail> {
    return this.http.post<MemberDetail>(`/api/policies/${policyId}/members`, member);
  }

  exit(id: string, exitDate: string): Observable<MemberDetail> {
    return this.http.post<MemberDetail>(`/api/members/${id}/exit`, { exitDate });
  }
}

export interface NewMember {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  annualSalary: number;
  joinDate: string;
}

export interface NewPolicy {
  policyNumber: string;
  coverTypes: CoverType[];
  coverMultiple: number;
  waitingPeriodMonths: number;
  effectiveDate: string;
}

export interface ClaimFilter {
  statuses?: ClaimStatus[];
  memberId?: string;
  /** A username, "me", or "none" for unassigned claims. */
  assignee?: string;
  /** Matches claim number or member name. */
  text?: string;
}

@Injectable({ providedIn: 'root' })
export class ClaimsApi {
  private readonly http = inject(HttpClient);

  search(filter: ClaimFilter, page = 0, size = 20, sort = 'submittedAt,asc'): Observable<Page<ClaimSummary>> {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', sort);
    for (const status of filter.statuses ?? []) {
      params = params.append('status', status);
    }
    if (filter.memberId) {
      params = params.set('memberId', filter.memberId);
    }
    if (filter.assignee) {
      params = params.set('assignee', filter.assignee);
    }
    if (filter.text?.trim()) {
      params = params.set('q', filter.text.trim());
    }
    return this.http.get<Page<ClaimSummary>>('/api/claims', { params });
  }

  get(id: string): Observable<ClaimDetail> {
    return this.http.get<ClaimDetail>(`/api/claims/${id}`);
  }

  submit(request: SubmitClaimRequest): Observable<ClaimDetail> {
    return this.http.post<ClaimDetail>('/api/claims', request);
  }

  transition(id: string, targetStatus: ClaimStatus, reason: string | null): Observable<ClaimDetail> {
    return this.http.post<ClaimDetail>(`/api/claims/${id}/transitions`, { targetStatus, reason });
  }

  assign(id: string, toMe: boolean): Observable<ClaimDetail> {
    return this.http.post<ClaimDetail>(`/api/claims/${id}/assignment`, { toMe });
  }

  notes(id: string): Observable<ClaimNote[]> {
    return this.http.get<ClaimNote[]>(`/api/claims/${id}/notes`);
  }

  addNote(id: string, body: string, internal: boolean): Observable<ClaimNote> {
    return this.http.post<ClaimNote>(`/api/claims/${id}/notes`, { body, internal });
  }

  documents(id: string): Observable<ClaimDocument[]> {
    return this.http.get<ClaimDocument[]>(`/api/claims/${id}/documents`);
  }

  /** Uploads with progress events, so the UI can animate a progress bar. */
  upload(id: string, file: File, category: DocumentCategory): Observable<HttpEvent<ClaimDocument>> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ClaimDocument>(`/api/claims/${id}/documents`, form, {
      params: new HttpParams().set('category', category),
      reportProgress: true,
      observe: 'events',
    });
  }

  download(claimId: string, documentId: string): Observable<Blob> {
    return this.http.get(`/api/claims/${claimId}/documents/${documentId}/content`, { responseType: 'blob' });
  }
}

@Injectable({ providedIn: 'root' })
export class InsightsApi {
  private readonly http = inject(HttpClient);

  dashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>('/api/dashboard');
  }

  activity(page: number, size = 25): Observable<Page<ActivityItem>> {
    return this.http.get<Page<ActivityItem>>('/api/activity', {
      params: new HttpParams().set('page', page).set('size', size),
    });
  }

  rates(): Observable<RateBand[]> {
    return this.http.get<RateBand[]>('/api/premium-rates');
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);

  feed(): Observable<NotificationFeed> {
    return this.http.get<NotificationFeed>('/api/notifications');
  }

  unreadCount(): Observable<{ unread: number }> {
    return this.http.get<{ unread: number }>('/api/notifications/unread-count');
  }

  markRead(id: string): Observable<unknown> {
    return this.http.post(`/api/notifications/${id}/read`, null);
  }

  markAllRead(): Observable<unknown> {
    return this.http.post('/api/notifications/read-all', null);
  }
}

@Injectable({ providedIn: 'root' })
export class SchemesApi {
  private readonly http = inject(HttpClient);

  list(): Observable<Scheme[]> {
    return this.http.get<Scheme[]>('/api/schemes');
  }

  get(id: string): Observable<Scheme> {
    return this.http.get<Scheme>(`/api/schemes/${id}`);
  }

  create(scheme: { name: string; registrationNumber: string; contactEmail: string }): Observable<Scheme> {
    return this.http.post<Scheme>('/api/schemes', scheme);
  }

  policies(schemeId: string): Observable<Policy[]> {
    return this.http.get<Policy[]>(`/api/schemes/${schemeId}/policies`);
  }

  createPolicy(schemeId: string, policy: NewPolicy): Observable<Policy> {
    return this.http.post<Policy>(`/api/schemes/${schemeId}/policies`, policy);
  }
}
