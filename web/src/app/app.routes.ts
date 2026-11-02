import { Routes } from '@angular/router';
import { homeRedirectGuard, roleGuard, signedInGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · Group Life Claims',
    loadComponent: () => import('./features/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivateChild: [signedInGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
      {
        path: 'members',
        title: 'Members · Group Life Claims',
        canActivate: [roleGuard('ADMIN', 'ASSESSOR')],
        loadComponent: () => import('./features/members/member-list-page').then((m) => m.MemberListPage),
      },
      {
        path: 'members/:id',
        title: 'Member · Group Life Claims',
        loadComponent: () => import('./features/members/member-detail-page').then((m) => m.MemberDetailPage),
      },
      {
        path: 'members/:id/claims/new',
        title: 'Submit a claim · Group Life Claims',
        canActivate: [roleGuard('MEMBER', 'ADMIN')],
        loadComponent: () => import('./features/claims/submit-claim-page').then((m) => m.SubmitClaimPage),
      },
      {
        path: 'claims',
        title: 'Claims queue · Group Life Claims',
        canActivate: [roleGuard('ASSESSOR', 'ADMIN')],
        loadComponent: () => import('./features/claims/claim-queue-page').then((m) => m.ClaimQueuePage),
      },
      {
        path: 'claims/:id',
        title: 'Claim · Group Life Claims',
        loadComponent: () => import('./features/claims/claim-detail-page').then((m) => m.ClaimDetailPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
