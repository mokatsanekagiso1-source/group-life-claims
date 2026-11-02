import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function render() {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture;
  }

  function statusText(fixture: ReturnType<typeof render>) {
    return (fixture.nativeElement as HTMLElement).querySelector('.status')?.textContent;
  }

  it('renders the title', () => {
    const fixture = render();
    httpMock.expectOne('/actuator/health');
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      'Group Life Claims',
    );
  });

  it('shows the API as up when the health check passes', async () => {
    const fixture = render();
    httpMock.expectOne('/actuator/health').flush({ status: 'UP' });
    await fixture.whenStable();
    expect(statusText(fixture)).toContain('up');
  });

  it('shows the API as down when the health check fails', async () => {
    const fixture = render();
    httpMock
      .expectOne('/actuator/health')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();
    expect(statusText(fixture)).toContain('down');
  });
});
