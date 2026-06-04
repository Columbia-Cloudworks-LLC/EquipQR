import { test as setup } from '@playwright/test';
import { loginAndPersistStorageState } from '../shared/auth-helpers';
import { setupPersonas } from '../shared/seed-data';

for (const persona of setupPersonas) {
  setup(`authenticate ${persona}`, async ({ page }) => {
    await loginAndPersistStorageState(page, persona);
  });
}
