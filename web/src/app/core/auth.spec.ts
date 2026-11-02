import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { Session } from './models';

const session = (overrides: Partial<Session> = {}): Session => ({
  accessToken: 'abc.def.ghi',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  username: 'member',
  role: 'MEMBER',
  memberId: 'member-1',
  ...overrides,
});

describe('AuthService and authInterceptor', () => {
  let auth: AuthService;
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpMock.verify());

  function signIn(s: Session = session()): void {
    auth.login('member', 'secret').subscribe();
    httpMock.expectOne('/api/auth/login').flush(s);
  }

  it('stores the session on login and survives a reload', () => {
    signIn();

    expect(auth.user()?.username).toBe('member');
    expect(JSON.parse(localStorage.getItem('grouplife.session')!).accessToken).toBe('abc.def.ghi');
  });

  it('does not send a token with the login request', () => {
    auth.login('member', 'secret').subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(session());
  });

  it('adds the bearer token to API calls only', () => {
    signIn();

    http.get('/api/claims').subscribe();
    http.get('/assets/config.json').subscribe();

    expect(httpMock.expectOne('/api/claims').request.headers.get('Authorization')).toBe('Bearer abc.def.ghi');
    expect(httpMock.expectOne('/assets/config.json').request.headers.has('Authorization')).toBe(false);
  });

  it('treats an expired token as signed out', () => {
    signIn(session({ expiresAt: new Date(Date.now() - 1000).toISOString() }));

    expect(auth.token()).toBeNull();
    expect(auth.user()).toBeNull();
  });

  it('signs out and returns to login when the API rejects the token', () => {
    signIn();

    http.get('/api/claims').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/claims').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.user()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('sends each role to its own home page', () => {
    signIn(session({ role: 'MEMBER', memberId: 'm-9' }));
    expect(auth.homeRoute()).toEqual(['/members', 'm-9']);

    signIn(session({ role: 'ASSESSOR', memberId: null }));
    expect(auth.homeRoute()).toEqual(['/claims']);

    signIn(session({ role: 'ADMIN', memberId: null }));
    expect(auth.homeRoute()).toEqual(['/members']);
  });
});
