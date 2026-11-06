import type { CatalogFlow } from '../types';

const SHELL = [
  'src/routes/DashboardRouteLayout.tsx',
  'src/components/layout/TopBar.tsx',
  'src/components/navigation/BottomNav.tsx',
];

export const dashboardFlow: CatalogFlow = {
  id: 'dashboard',
  title: 'Dashboard & app shell',
  area: 'Home',
  description:
    'The signed-in home screen plus the global shell: bottom nav, navigation menu, workspace switcher and user menu.',
  personas: ['owner', 'technician'],
  screens: [
    {
      id: 'home',
      title: 'Dashboard',
      description: 'Landing screen after sign-in: KPI cards, open work, high-priority and recent lists.',
      route: '/dashboard',
      sources: ['src/features/dashboard/pages/Dashboard.tsx', ...SHELL],
    },
    {
      id: 'dashboard-settings',
      title: 'Dashboard settings',
      description: 'Widget/personalization settings for the dashboard.',
      route: '/dashboard',
      steps: [{ action: 'click', target: { role: 'button', name: /dashboard settings/i } }],
      sources: ['src/features/dashboard/pages/Dashboard.tsx'],
    },
    {
      id: 'navigation-menu',
      title: 'Navigation menu',
      description: 'Full navigation opened from the bottom nav "menu" button.',
      route: '/dashboard',
      steps: [{ action: 'click', target: { role: 'button', name: /open navigation menu/i } }],
      sources: ['src/components/navigation/BottomNav.tsx', 'src/components/layout/AppSidebar.tsx'],
    },
    {
      id: 'workspace-switcher',
      title: 'Workspace switcher',
      description: 'Organization / team scope switcher opened from the top bar.',
      route: '/dashboard',
      steps: [{ action: 'click', target: { role: 'button', name: /^workspace:/i } }],
      sources: ['src/components/layout/MobileWorkspaceSwitcher.tsx', 'src/components/layout/TopBar.tsx'],
    },
    {
      id: 'user-menu',
      title: 'User menu',
      description: 'Account menu opened from the avatar in the top bar.',
      route: '/dashboard',
      steps: [{ action: 'click', target: { role: 'button', name: /^user menu/i } }],
      sources: ['src/components/layout/UserProfileMenu.tsx'],
    },
  ],
};

export const notificationsFlow: CatalogFlow = {
  id: 'notifications',
  title: 'Notifications',
  area: 'Home',
  description: 'In-app notification inbox.',
  personas: ['owner', 'technician'],
  screens: [
    {
      id: 'inbox',
      title: 'Notification inbox',
      description: 'All notifications with unread state.',
      route: '/dashboard/notifications',
      sources: ['src/pages/Notifications.tsx'],
    },
    {
      id: 'filter',
      title: 'Notification filters',
      description: 'Filter control for the inbox.',
      route: '/dashboard/notifications',
      steps: [{ action: 'click', target: { role: 'button', name: /filter notifications/i } }],
      sources: ['src/pages/Notifications.tsx'],
    },
  ],
};
