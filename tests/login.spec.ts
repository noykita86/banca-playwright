import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { env } from '../config/env';

test.setTimeout(90000);

/**
 * Tests del modulo Login de Guru99 Bank.
 *
 * Incluye:
 *  - 1 caso happy: credenciales correctas -> dashboard.
 *  - 4 casos negativos: credenciales invalidas, password mala, usuario malo,
 *    campos vacios -> rechazo sin acceso.
 *
 * Guru99 responde a credenciales malas con un alert() nativo que dice:
 *   "User or Password is not valid"
 */
test.describe('Guru99 Bank - Modulo Login', () => {

  test.beforeEach(async ({ page }) => {
    // Bloquear recursos de terceros (analytics, ads) para acelerar la carga.
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
  });

  // ============================================================
  // CASO HAPPY
  // ============================================================

  test('Credenciales validas: entra al dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAsManager();
    await loginPage.expectLoggedIn();
  });

  // ============================================================
  // CASOS NEGATIVOS
  // ============================================================

  test('Usuario y password invalidos: alerta y rechazo', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const message = await loginPage.loginExpectingError(
      'usuario_invalido_xyz',
      'password_invalida_xyz'
    );

    expect(message).toContain('User or Password is not valid');

    // Seguimos en el login: el campo uid sigue visible.
    await expect(page.locator('input[name="uid"]')).toBeVisible();
    // No hay acceso al dashboard.
    await expect(
      page.getByRole('link', { name: 'New Customer' })
    ).not.toBeVisible();
  });

  test('Usuario valido + password invalida: rechazado', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const message = await loginPage.loginExpectingError(
      env.user.email,
      'password_incorrecta_123'
    );

    expect(message).toContain('User or Password is not valid');

    await expect(page.locator('input[name="uid"]')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'New Customer' })
    ).not.toBeVisible();
  });

  test('Usuario invalido + password valida: rechazado', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const message = await loginPage.loginExpectingError(
      'usuario_inexistente_999',
      env.user.password
    );

    expect(message).toContain('User or Password is not valid');

    await expect(page.locator('input[name="uid"]')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'New Customer' })
    ).not.toBeVisible();
  });

  test('Campos vacios: no permite acceder al dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Registrar handler por si el sitio decide mostrar alerta en vez de
    // bloquear el envio con validacion HTML5.
    page.on('dialog', async dialog => {
      console.log('DIALOG:', dialog.message());
      await dialog.accept();
    });

    await loginPage.login('', '');

    // Esperar un momento por si intentara navegar.
    await page.waitForTimeout(1500);

    // Seguimos en el login y sin acceso al dashboard.
    await expect(page.locator('input[name="uid"]')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'New Customer' })
    ).not.toBeVisible();
  });
});