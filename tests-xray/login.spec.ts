import { test, expect } from '../fixtures/base.fixture';
import { LoginPage } from '../pages/LoginPage';
import { env } from '../config/env';

test.setTimeout(180000);

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
 *
 * Los bloqueos de terceros (analytics, ads) los aplica automaticamente
 * fixtures/base.fixture.ts.
 */
test.describe('Guru99 Bank - Modulo Login', () => {

  // ============================================================
  // CASO HAPPY
  // ============================================================

  test('QT-36 | Credenciales validas: entra al dashboard', { tag: '@smoke' }, async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAsManager();
    await loginPage.expectLoggedIn();
  });

  // ============================================================
  // CASOS NEGATIVOS
  // ============================================================

  test('QT-37 | Usuario y password invalidos: alerta y rechazo', async ({ page }) => {
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

  test('QT-38 | Usuario valido + password invalida: rechazado', async ({ page }) => {
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

  test('QT-39 | Usuario invalido + password valida: rechazado', async ({ page }) => {
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

  test('QT-40 | Campos vacios: no permite acceder al dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Registrar handler ANTES del submit para capturar el alert() nativo
    // que Guru99 muestra al intentar login con campos vacios.
    // Usamos `once` para que se dispare una sola vez y no interfiera
    // con otros tests ni con futuros dialogs.
    page.once('dialog', async dialog => {
      console.log('DIALOG:', dialog.message());
      await dialog.accept();
    });

    await loginPage.login('', '');

    // Seguimos en el login y sin acceso al dashboard.
    await expect(page.locator('input[name="uid"]')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'New Customer' })
    ).not.toBeVisible();
  });
});