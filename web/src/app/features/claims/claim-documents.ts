import { DatePipe } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClaimsApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { ClaimDocument, DocumentCategory } from '../../core/models';
import { problemMessage } from '../../core/problem';
import { DOCUMENT_LABELS } from '../../shared/labels';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg'];

interface Upload {
  name: string;
  progress: number;
}

/** Supporting documents: drag-and-drop upload with progress, and authenticated downloads. */
@Component({
  selector: 'app-claim-documents',
  imports: [DatePipe, FormsModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatSelectModule, MatTooltipModule],
  template: `
    <ul class="files" data-cy="documents">
      @for (doc of documents(); track doc.id) {
        <li animate.enter="enter-slide" [style.--i]="$index">
          <span class="type" [attr.data-kind]="kind(doc)"><mat-icon>{{ kind(doc) === 'pdf' ? 'picture_as_pdf' : 'image' }}</mat-icon></span>
          <div class="info">
            <strong>{{ doc.fileName }}</strong>
            <span class="muted">
              {{ labels[doc.category] }} · {{ size(doc.sizeBytes) }} · {{ doc.uploadedBy }}, {{ doc.uploadedAt | date: 'MMM d' }}
            </span>
          </div>
          <button mat-icon-button (click)="open(doc)" matTooltip="Open" [attr.aria-label]="'Open ' + doc.fileName">
            <mat-icon>open_in_new</mat-icon>
          </button>
        </li>
      } @empty {
        <li class="none">No documents yet.</li>
      }
    </ul>

    @for (upload of uploads(); track upload.name) {
      <div class="uploading" animate.leave="leave-fade">
        <span>{{ upload.name }}</span>
        <mat-progress-bar mode="determinate" [value]="upload.progress" />
      </div>
    }

    @if (canUpload()) {
      <div
        class="drop"
        [class.over]="dragging()"
        (dragover)="onDragOver($event)"
        (dragleave)="dragging.set(false)"
        (drop)="onDrop($event)"
        data-cy="drop-zone"
      >
        <mat-icon class="cloud">cloud_upload</mat-icon>
        <p>Drag files here or <label class="browse">browse<input type="file" multiple [accept]="accept" (change)="onPick($event)" /></label></p>
        <p class="muted">PDF, PNG or JPEG, up to 5 MB each</p>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="category">
          <mat-label>Document type</mat-label>
          <mat-select [(ngModel)]="category" name="category">
            @for (c of categories; track c) {
              <mat-option [value]="c">{{ labels[c] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
  `,
  styles: `
    .files {
      list-style: none;
      margin: 0 0 12px;
      padding: 0;
      display: grid;
      gap: 8px;
    }
    .files li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 8px 8px 8px 12px;
      border-radius: 12px;
      background: var(--mat-sys-surface-container-low);
    }
    .files li.none {
      display: block;
      background: none;
      color: var(--mat-sys-on-surface-variant);
    }
    .type {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      color: #fff;
      background: var(--status-paid);
    }
    .type[data-kind='pdf'] {
      background: var(--status-rejected);
    }
    .info {
      display: grid;
      min-width: 0;
    }
    .info strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .info span {
      font-size: 0.8rem;
    }
    .uploading {
      display: grid;
      gap: 4px;
      margin-bottom: 8px;
      font-size: 0.85rem;
    }
    .drop {
      display: grid;
      justify-items: center;
      gap: 4px;
      padding: 20px;
      border: 2px dashed var(--mat-sys-outline-variant);
      border-radius: 16px;
      text-align: center;
      transition:
        border-color var(--motion-fast),
        background var(--motion-fast),
        transform var(--motion-fast) var(--ease-spring);
    }
    .drop.over {
      border-color: var(--mat-sys-primary);
      background: color-mix(in srgb, var(--mat-sys-primary) 8%, transparent);
      transform: scale(1.02);
    }
    .drop.over .cloud {
      animation: wiggle 600ms ease-in-out infinite;
    }
    .cloud {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: var(--mat-sys-primary);
    }
    .drop p {
      margin: 0;
    }
    .browse {
      color: var(--mat-sys-primary);
      text-decoration: underline;
      cursor: pointer;
    }
    .browse input {
      display: none;
    }
    .category {
      margin-top: 8px;
      width: 220px;
    }
  `,
})
export class ClaimDocuments {
  private readonly api = inject(ClaimsApi);
  private readonly auth = inject(AuthService);

  readonly claimId = input.required<string>();
  /** Uploads close with the claim. */
  readonly claimOpen = input(true);

  protected readonly labels = DOCUMENT_LABELS;
  protected readonly categories = Object.keys(DOCUMENT_LABELS) as DocumentCategory[];
  protected readonly accept = ACCEPTED.join(',');
  protected category: DocumentCategory = 'DEATH_CERTIFICATE';

  protected readonly documents = signal<ClaimDocument[]>([]);
  protected readonly uploads = signal<Upload[]>([]);
  protected readonly dragging = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly canUpload = computed(() => this.claimOpen() && this.auth.hasRole('ASSESSOR', 'MEMBER'));

  constructor() {
    effect(() => {
      this.api.documents(this.claimId()).subscribe({
        next: (docs) => this.documents.set(docs),
        error: (err: unknown) => this.error.set(problemMessage(err)),
      });
    });
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.uploadAll(Array.from(event.dataTransfer?.files ?? []));
  }

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadAll(Array.from(input.files ?? []));
    input.value = '';
  }

  protected open(doc: ClaimDocument): void {
    // The download needs the bearer token, so fetch it and hand the browser a blob URL.
    this.api.download(this.claimId(), doc.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err: unknown) => this.error.set(problemMessage(err)),
    });
  }

  protected kind(doc: ClaimDocument): 'pdf' | 'image' {
    return doc.contentType === 'application/pdf' ? 'pdf' : 'image';
  }

  protected size(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private uploadAll(files: File[]): void {
    this.error.set(null);
    for (const file of files) {
      if (!ACCEPTED.includes(file.type)) {
        this.error.set(`${file.name}: only PDF, PNG and JPEG files are accepted.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        this.error.set(`${file.name} is larger than 5 MB.`);
        continue;
      }
      this.upload(file);
    }
  }

  private upload(file: File): void {
    this.uploads.update((list) => [...list, { name: file.name, progress: 0 }]);
    const setProgress = (progress: number) =>
      this.uploads.update((list) => list.map((u) => (u.name === file.name ? { ...u, progress } : u)));
    const done = () => this.uploads.update((list) => list.filter((u) => u.name !== file.name));

    this.api.upload(this.claimId(), file, this.category).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        } else if (event.type === HttpEventType.Response && event.body) {
          this.documents.update((docs) => [...docs, event.body!]);
          done();
        }
      },
      error: (err: unknown) => {
        this.error.set(`${file.name}: ${problemMessage(err)}`);
        done();
      },
    });
  }
}
