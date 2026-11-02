import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { catchError, map, of } from 'rxjs';

type ApiStatus = 'checking' | 'up' | 'down';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly http = inject(HttpClient);

  protected readonly apiStatus = toSignal(
    this.http.get<{ status: string }>('/actuator/health').pipe(
      map((health): ApiStatus => (health.status === 'UP' ? 'up' : 'down')),
      catchError(() => of<ApiStatus>('down')),
    ),
    { initialValue: 'checking' as ApiStatus },
  );
}
