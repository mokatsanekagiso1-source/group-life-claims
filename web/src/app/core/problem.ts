import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetail } from './models';

/** A message fit to show the user, from an RFC 9457 problem response or any other error. */
export function problemMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Something went wrong. Please try again.';
  }
  if (error.status === 0) {
    return 'The server could not be reached. Check your connection and try again.';
  }
  const problem = (error.error ?? {}) as ProblemDetail;
  if (problem.errors && Object.keys(problem.errors).length > 0) {
    return Object.entries(problem.errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join('; ');
  }
  return problem.detail ?? problem.title ?? `Request failed (${error.status}).`;
}

/** Formats a Date as the API's yyyy-MM-dd, in local time. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
