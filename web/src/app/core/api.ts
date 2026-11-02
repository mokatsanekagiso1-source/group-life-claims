import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ClaimDetail,
  ClaimStatus,
  ClaimSummary,
  MemberDetail,
  MemberSummary,
  Page,
  PremiumQuote,
  SubmitClaimRequest,
} from './models';

@Injectable({ providedIn: 'root' })
export class MembersApi {
  private readonly http = inject(HttpClient);

  search(search: string, page: number, size: number): Observable<Page<MemberSummary>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Page<MemberSummary>>('/api/members', { params });
  }

  get(id: string): Observable<MemberDetail> {
    return this.http.get<MemberDetail>(`/api/members/${id}`);
  }

  premium(id: string): Observable<PremiumQuote> {
    return this.http.get<PremiumQuote>(`/api/members/${id}/premium`);
  }
}

@Injectable({ providedIn: 'root' })
export class ClaimsApi {
  private readonly http = inject(HttpClient);

  search(
    filter: { statuses?: ClaimStatus[]; memberId?: string },
    page = 0,
    size = 20,
  ): Observable<Page<ClaimSummary>> {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', 'submittedAt,asc');
    for (const status of filter.statuses ?? []) {
      params = params.append('status', status);
    }
    if (filter.memberId) {
      params = params.set('memberId', filter.memberId);
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
}
