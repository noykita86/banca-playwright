import { test as base } from './base.fixture';
import { Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { env } from '../config/env';

/**
 * Fixture de autenticacion para Guru99 Bank.
 *
 * ⚠️ NOTA IMPORTANTE:
 * Guru99 regenera el PHPSESSID del servidor con cada navegacion.
 * Esto hace inviable el patron `storageState` (la sesion guardada
 * queda invalida antes del siguiente test). Por eso este fixture
 * hace LOGIN FRESCO en cada test.
 *
 * En una app bancaria real (con backend controlado) SI se usa
 * `storageState` para reutilizar la sesion entre tests.
 * Ver la seccion "Patron productivo" en el README para mas detalle.
 */
export const test = base.extend<{ loggedInPage: Page }>({

  loggedInPage: async ({ page }, use) => {
    // Login fresco al inicio del test.
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAsManager();

    await use(page);

    // No hay teardown especial: Playwright cierra el contexto solo.
  },
});

export { expect } from '@playwright/test';