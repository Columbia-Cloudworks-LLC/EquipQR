import { test as setup } from '@playwright/test';
import { loginAndPersistStorageState } from '../shared/auth-helpers';
import type { PersonaKey } from '../shared/seed-data';

const setupPersonas: PersonaKey[] = ['owner', 'admin', 'technician'];

for (const persona of setupPersonas) {
  setup(`authenticate ${persona}`, async ({ page }) => {
    await loginAndPersistStorageState(page, persona);
  });
}
