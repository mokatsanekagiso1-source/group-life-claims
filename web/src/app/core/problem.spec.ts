import { HttpErrorResponse } from '@angular/common/http';
import { problemMessage, toIsoDate } from './problem';

describe('problemMessage', () => {
  it('uses the problem detail', () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: { type: 'urn:grouplife:problem:business-rule', detail: 'The waiting period ends on 2026-03-01', code: 'WAITING_PERIOD' },
    });

    expect(problemMessage(error)).toBe('The waiting period ends on 2026-03-01');
  });

  it('lists field validation errors', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { detail: 'One or more fields are invalid.', errors: { eventDate: 'must not be null', description: 'must not be blank' } },
    });

    expect(problemMessage(error)).toBe('eventDate: must not be null; description: must not be blank');
  });

  it('explains a network failure', () => {
    expect(problemMessage(new HttpErrorResponse({ status: 0 }))).toContain('could not be reached');
  });

  it('falls back for unexpected errors', () => {
    expect(problemMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});

describe('toIsoDate', () => {
  it('formats in local time without shifting the day', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
