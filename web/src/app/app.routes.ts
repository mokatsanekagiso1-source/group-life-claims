import { Routes } from '@angular/router';
import { homeRedirectGuard, roleGuard, signedInGuard } from './core/guards';

const STAFF = ['ADMIN', 'ASSESSOR'] as const;

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
        path: 'dashboard',
        title: 'Dashboard · Group Life Claims',
        canActivate: [roleGuard(...STAFF)],
        loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'activity',
        title: 'Activity · Group Life Claims',
        canActivate: [roleGuard(...STAFF)],
        loadComponent: () => import('./features/activity/activity-page').then((m) => m.ActivityPage),
      },
      {
        path: 'members',
        title: 'Members · Group Life Claims',
        canActivate: [roleGuard(...STAFF)],
        loadComponent: () => import('./features/members/member-list-page').then((m) => m.MemberListPage),
      },
      {
        path: 'members/:id',
        title: 'Member · Group Life Claims',
        loadComponent: () => import('./features/members/member-detail-page').then((m) => m.MemberDetailPage),
      },
      {
        path: 'members/:id/beneficiaries',
        title: 'Beneficiaries · Group Life Claims',
        canActivate: [roleGuard('MEMBER', 'ADMIN')],
        loadComponent: () => import('./features/members/beneficiaries-page').then((m) => m.BeneficiariesPage),
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
        canActivate: [roleGuard(...STAFF)],
        loadComponent: () => import('./features/claims/claim-queue-page').then((m) => m.ClaimQueuePage),
      },
      {
        path: 'claims/:id',
        title: 'Claim · Group Life Claims',
        loadComponent: () => import('./features/claims/claim-detail-page').then((m) => m.ClaimDetailPage),
      },
      {
        path: 'schemes',
        title: 'Schemes · Group Life Claims',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./features/admin/schemes-page').then((m) => m.SchemesPage),
      },
      {
        path: 'schemes/:id',
        title: 'Scheme · Group Life Claims',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./features/admin/scheme-detail-page').then((m) => m.SchemeDetailPage),
      },
      {
        path: 'calculator',
        title: 'Premium calculator · Group Life Claims',
        loadComponent: () =>
          import('./features/premium/premium-calculator-page').then((m) => m.PremiumCalculatorPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
