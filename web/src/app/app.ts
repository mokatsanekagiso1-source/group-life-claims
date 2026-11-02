import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { Role } from './core/models';
import { ThemeService } from './core/theme.service';
import { CommandPalette, CommandPaletteState } from './layout/command-palette';
import { NotificationBell } from './layout/notification-bell';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
  cy: string;
}

const THEME_ICONS = { system: 'brightness_auto', light: 'light_mode', dark: 'dark_mode' } as const;

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    CommandPalette,
    NotificationBell,
  ],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly palette = inject(CommandPaletteState);

  protected readonly isStaff = computed(() => this.auth.user()?.role !== 'MEMBER');
  protected readonly ownMemberId = computed(() => this.auth.user()?.memberId ?? null);
  protected readonly themeIcon = computed(() => THEME_ICONS[this.theme.preference()]);
  protected readonly initial = computed(() => (this.auth.user()?.username ?? '?')[0].toUpperCase());

  protected readonly nav = computed<NavItem[]>(() => {
    const role: Role | undefined = this.auth.user()?.role;
    const memberId = this.ownMemberId();
    const items: (NavItem & { roles: Role[] })[] = [
      { label: 'Dashboard', icon: 'space_dashboard', link: '/dashboard', roles: ['ADMIN', 'ASSESSOR'], cy: 'nav-dashboard' },
      { label: 'Claims queue', icon: 'inbox', link: '/claims', exact: true, roles: ['ADMIN', 'ASSESSOR'], cy: 'nav-claims' },
      { label: 'Members', icon: 'groups', link: '/members', exact: true, roles: ['ADMIN', 'ASSESSOR'], cy: 'nav-members' },
      { label: 'Schemes', icon: 'domain', link: '/schemes', roles: ['ADMIN'], cy: 'nav-schemes' },
      { label: 'Activity', icon: 'timeline', link: '/activity', roles: ['ADMIN', 'ASSESSOR'], cy: 'nav-activity' },
      { label: 'My cover', icon: 'shield', link: `/members/${memberId}`, exact: true, roles: ['MEMBER'], cy: 'nav-my-cover' },
      { label: 'Calculator', icon: 'calculate', link: '/calculator', roles: ['ADMIN', 'ASSESSOR', 'MEMBER'], cy: 'nav-calculator' },
    ];
    return items.filter((item) => role !== undefined && item.roles.includes(role));
  });
}
