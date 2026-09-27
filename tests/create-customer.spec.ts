import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NewCustomerPage } from '../pages/NewCustomerPage';
import { buildValidCustomer } from '../fixtures/customer';

test.setTimeout(90000);

/**
 * Prueba de creacion de un nuevo cliente en Guru99 Bank (V4).
 *
 * Refactorizado a Page Object Model:
 *  - LoginPage encapsula el login.
 *  - NewCustomerPage encapsula el formulario y sus aserciones.
 *  - buildValidCustomer() genera datos frescos (email unico por corrida).
 */

test.describe('Guru99 Bank - New Customer', () => {
  test('registra un nuevo cliente correctamente', async ({ page }) => {

    // 1) Dialog handler ANTES de cualquier goto o click.
    page.on('dialog', async (dialog) => {
      console.log('DIALOG:', dialog.message());
      await dialog.accept();
    });

    // 2) Bloquear recursos de terceros (analytics, ads) que ralentizan la carga.
    await page.route('**/*', route => {
      const url = route.request().url();
      const blockedDomains = [
        'googletagmanager.com',
        'google-analytics.com',
        'clarity.ms',
        'convertbox.com',
        'guru99.live',
        'facebook.net',
        'doubleclick.net',
      ];
      if (blockedDomains.some(domain => url.includes(domain))) {
        return route.abort();
      }
      return route.continue();
    });

    // 3) Login con credenciales del manager desde `.env`.
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAsManager();

    // 4) Navegar al formulario "New Customer".
    await page.getByRole('link', { name: 'New Customer' }).click();
    await page.waitForURL(/addcustomerpage/, { timeout: 60000 });

    // 5) Esperar a que el formulario este listo (anti-flakiness).
    const newCustomerPage = new NewCustomerPage(page);
    await newCustomerPage.waitUntilReady();

    // 6) Rellenar con datos frescos y enviar.
    await newCustomerPage.fillForm(buildValidCustomer());
    await newCustomerPage.submit();

    // 7) Verificar exito.
    await newCustomerPage.expectSuccess();
  });
});