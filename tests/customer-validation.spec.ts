import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NewCustomerPage, CustomerData } from '../pages/NewCustomerPage';
import { buildValidCustomer } from '../fixtures/customer';

test.setTimeout(90000);

/**
 * Validaciones del formulario "New Customer" de Guru99 Bank.
 *
 * Cada test:
 *  1) Hace login como manager.
 *  2) Navega al formulario.
 *  3) Rellena con datos validos, sobreescribiendo UN solo campo.
 *  4) Envia y verifica que el sistema lo rechaza.
 */

/**
 * Helper: hace login, navega al form, lo rellena con `overrides` y lo envia.
 * Devuelve el NewCustomerPage para que el test haga las aserciones.
 */
async function setupAndSubmit(
  page: Page,
  overrides: Partial<CustomerData>
): Promise<NewCustomerPage> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAsManager();

  await page.getByRole('link', { name: 'New Customer' }).click();
  await page.waitForURL(/addcustomerpage/, { timeout: 60000 });

  const newCustomerPage = new NewCustomerPage(page);
  await newCustomerPage.waitUntilReady();

  await newCustomerPage.fillForm(buildValidCustomer(overrides));
  await newCustomerPage.submit();

  return newCustomerPage;
}

test.describe('Guru99 Bank - Validaciones del formulario New Customer', () => {

  test.beforeEach(async ({ page }) => {
    // Manejar alert() del sitio (Guru99 los usa para errores y confirmaciones).
    page.on('dialog', async (dialog) => {
      console.log('DIALOG:', dialog.message());
      await dialog.accept();
    });

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
  // VALIDACIONES DEL CAMPO PIN
  // ============================================================

  test('PIN con menos de 6 digitos debe ser rechazado', async ({ page }) => {
    const form = await setupAndSubmit(page, { pin: '28001' });
    await form.expectInlineError('PIN Code must have 6 Digits');
    await form.expectNotSuccess();
  });

  test('PIN con letras debe ser rechazado', async ({ page }) => {
    const form = await setupAndSubmit(page, { pin: 'abcdef' });
    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });

  test('PIN vacio debe ser rechazado', async ({ page }) => {
    const form = await setupAndSubmit(page, { pin: '' });
    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });

  test('PIN con 7 digitos: el campo limita a 6 por MAXLENGTH', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAsManager();

    await page.getByRole('link', { name: 'New Customer' }).click();
    await page.waitForURL(/addcustomerpage/, { timeout: 60000 });

    const form = new NewCustomerPage(page);
    await form.waitUntilReady();

    const pinField = form.getPinField();
    await pinField.pressSequentially('1234567');
    const value = await pinField.inputValue();
    test.expect(value.length).toBeLessThanOrEqual(6);
  });

  // ============================================================
  // VALIDACIONES DE FORMATO
  // ============================================================

  test('Nombre con numeros debe ser rechazado', async ({ page }) => {
    const form = await setupAndSubmit(page, { name: 'Test123' });
    await form.expectInlineError('Numbers are not allowed');
    await form.expectNotSuccess();
  });

  test('Email sin @ debe ser rechazado', async ({ page }) => {
    const form = await setupAndSubmit(page, { email: 'correo-sin-arroba' });
    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });

  // ============================================================
  // VALIDACIONES DE CAMPOS EN BLANCO
  // ============================================================

  test('Fecha de nacimiento en blanco debe ser rechazada', async ({ page }) => {
    const form = await setupAndSubmit(page, { dateOfBirth: '' });
    await form.expectInlineError('Date Field must not be blank');
    await form.expectNotSuccess();
  });

  test('Address en blanco debe ser rechazada', async ({ page }) => {
    const form = await setupAndSubmit(page, { address: '' });
    await form.expectInlineError('Address Field must not be blank');
    await form.expectNotSuccess();
  });

  test('City en blanco debe ser rechazada', async ({ page }) => {
    const form = await setupAndSubmit(page, { city: '' });
    await form.expectInlineError('City Field must not be blank');
    await form.expectNotSuccess();
  });

  test('State en blanco debe ser rechazado', async ({ page }) => {
    const form = await setupAndSubmit(page, { state: '' });
    await form.expectInlineError('State must not be blank');
    await form.expectNotSuccess();
  });

  test('Mobile en blanco debe ser rechazado', async ({ page }) => {
    const form = await setupAndSubmit(page, { mobile: '' });
    await form.expectInlineError('Mobile no must not be blank');
    await form.expectNotSuccess();
  });

  test('Email en blanco debe ser rechazado', async ({ page }) => {
    const form = await setupAndSubmit(page, { email: '' });
    await form.expectInlineError('Email-ID must not be blank');
    await form.expectNotSuccess();
  });

  test('Password en blanco debe ser rechazado', async ({ page }) => {
    const form = await setupAndSubmit(page, { password: '' });
    await form.expectInlineError('Password must not be blank');
    await form.expectNotSuccess();
  });
    // ============================================================
  // VALIDACIONES DE UNICIDAD
  // ============================================================

  test('Email duplicado: segundo registro con mismo email es rechazado', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAsManager();

    const form = new NewCustomerPage(page);

    // --- 1er registro: cliente con email unico, debe triunfar ---
    await page.getByRole('link', { name: 'New Customer' }).click();
    await page.waitForURL(/addcustomerpage/, { timeout: 60000 });
    await form.waitUntilReady();

    const original = buildValidCustomer();
    await form.fillForm(original);
    await form.submit();
    await form.expectSuccess();

    // --- 2do registro: MISMO email, debe ser rechazado ---
    await page.getByRole('link', { name: 'New Customer' }).click();
    await page.waitForURL(/addcustomerpage/, { timeout: 60000 });
    await form.waitUntilReady();

    const duplicate = buildValidCustomer({ email: original.email });
    await form.fillForm(duplicate);

    const message = await form.submitExpectingError();
   // console.log('>>> MENSAJE DEL SITIO:', JSON.stringify(message)); verifico cual es el mensaje exacto
    expect(message).toContain('Email Address Already Exist');

    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });
});