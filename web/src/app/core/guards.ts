import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

export const signedInGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.token() !== null ? true : inject(Router).createUrlTree(['/login']);
};

/** Sends users without one of the roles to their own home page. */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    return auth.hasRole(...roles) ? true : inject(Router).createUrlTree(auth.homeRoute());
  };
}

export const homeRedirectGuard: CanActivateFn = () =>
  inject(Router).createUrlTree(inject(AuthService).homeRoute());
