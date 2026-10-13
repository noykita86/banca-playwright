import { test, expect } from '../fixtures/auth.fixture';
import { Page } from '@playwright/test';
import { NewCustomerPage, CustomerData } from '../pages/NewCustomerPage';
import { buildValidCustomer } from '../fixtures/customer';

test.setTimeout(180000);

/**
 * Validaciones del formulario "New Customer" de Guru99 Bank.
 *
 * Cada test:
 *  1) Usa el fixture `loggedInPage` (ya autenticado por storageState).
 *  2) Navega al formulario.
 *  3) Rellena con datos validos, sobreescribiendo UN solo campo.
 *  4) Envia y verifica que el sistema lo rechaza.
 *
 * Los bloqueos de terceros y el dialog handler los aplica
 * automaticamente fixtures/base.fixture.ts.
 */

/**
 * Helper: navega al form, lo rellena con `overrides` y lo envia.
 * Recibe `loggedInPage` (ya autenticado por el fixture).
 */
async function setupAndSubmit(
  loggedInPage: Page,
  overrides: Partial<CustomerData>
): Promise<NewCustomerPage> {
  await loggedInPage.getByRole('link', { name: 'New Customer' }).click();
  await loggedInPage.waitForURL(/addcustomerpage/, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });

  const newCustomerPage = new NewCustomerPage(loggedInPage);
  await newCustomerPage.waitUntilReady();

  await newCustomerPage.fillForm(buildValidCustomer(overrides));
  await newCustomerPage.submit();

  return newCustomerPage;
}

test.describe('Guru99 Bank - Validaciones del formulario New Customer', () => {

  // ============================================================
  // VALIDACIONES DEL CAMPO PIN
  // ============================================================

  test('PIN con menos de 6 digitos debe ser rechazado', async ({ loggedInPage }) => {
    const form = await setupAndSubmit(loggedInPage, { pin: '28001' });
    await form.expectInlineError('PIN Code must have 6 Digits');
    await form.expectNotSuccess();
  });

  test('PIN con letras debe ser rechazado', async ({ loggedInPage }) => {
    const form = await setupAndSubmit(loggedInPage, { pin: 'abcdef' });
    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });

  test('PIN vacio debe ser rechazado', async ({ loggedInPage }) => {
    const form = await setupAndSubmit(loggedInPage, { pin: '' });
    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });

  test('PIN con 7 digitos: el campo limita a 6 por MAXLENGTH', async ({ loggedInPage }) => {
    await loggedInPage.getByRole('link', { name: 'New Customer' }).click();
    await loggedInPage.waitForURL(/addcustomerpage/, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });

    const form = new NewCustomerPage(loggedInPage);
    await form.waitUntilReady();

    const pinField = form.getPinField();
    await pinField.pressSequentially('1234567');
    const value = await pinField.inputValue();
    expect(value.length).toBeLessThanOrEqual(6);
  });

  // ============================================================
  // VALIDACIONES DE FORMATO
  // ============================================================

  test('Nombre con numeros debe ser rechazado', async ({ loggedInPage }) => {
    const form = await setupAndSubmit(loggedInPage, { name: 'Test123' });
    await form.expectInlineError('Numbers are not allowed');
    await form.expectNotSuccess();
  });

  test('Email sin @ debe ser rechazado', async ({ loggedInPage }) => {
    const form = await setupAndSubmit(loggedInPage, { email: 'correo-sin-arroba' });
    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });

  // ============================================================
  // VALIDACIONES DE CAMPOS EN BLANCO
  // ============================================================

  test('Fecha de nacimiento en blanco debe ser rechazada', async ({ loggedInPage }) => {
    const form = await setupAndSubmit(loggedInPage, { dateOfBirth: '' });
    await form.expectInlineError('Date Field must not be blank');
    await form.expectNotSuccess();
  });

  test('Address en blanco debe ser rechazada', async ({ loggedInPage }) => {
    const form = await setupAndSubmit(loggedInPage, { address: '' });
    await form.expectInlineError('Address Field must not be blank');
    await form.expectNotSuccess();
  });

  test('City en blanco debe ser rechazada', async ({ loggedInPage }) => {
    const form = await setupAndSubmit(loggedInPage, { city: '' });
    await form.expectInlineError('City Field must not be blank');
    await form.expectNotSuccess();
  });

  test('State en blanco debe ser rechazado', async ({ loggedInPage }) => {
    const form = await setupAndSubmit(loggedInPage, { state: '' });
    await form.expectInlineError('State must not be blank');
    await form.expectNotSuccess();
  });

  test('Mobile en blanco debe ser rechazado', async ({ loggedInPage }) => {
    const form = await setupAndSubmit(loggedInPage, { mobile: '' });
    await form.expectInlineError('Mobile no must not be blank');
    await form.expectNotSuccess();
  });

  test('Email en blanco debe ser rechazado', async ({ loggedInPage }) => {
    const form = await setupAndSubmit(loggedInPage, { email: '' });
    await form.expectInlineError('Email-ID must not be blank');
    await form.expectNotSuccess();
  });

  test('Password en blanco debe ser rechazado', async ({ loggedInPage }) => {
    const form = await setupAndSubmit(loggedInPage, { password: '' });
    await form.expectInlineError('Password must not be blank');
    await form.expectNotSuccess();
  });

  // ============================================================
  // VALIDACIONES DE UNICIDAD
  // ============================================================

  test('Email duplicado: segundo registro con mismo email es rechazado', async ({ loggedInPage }) => {
    const form = new NewCustomerPage(loggedInPage);

    // ⭐ Handler de dialogs para el PRIMER registro.
    //    Si el sitio muestra un alert (validación, email duplicado),
    //    lo capturamos aquí y vemos el mensaje.
    let firstDialogMessage = '';
    const firstDialogHandler = async (dialog: any) => {
      firstDialogMessage = dialog.message();
      console.log('⚠️  DIALOG 1er registro:', firstDialogMessage);
      await dialog.accept();
    };
    loggedInPage.on('dialog', firstDialogHandler);

    // --- 1er registro: cliente con email unico, deberia triunfar ---
    await loggedInPage.getByRole('link', { name: 'New Customer' }).click();
    await loggedInPage.waitForURL(/addcustomerpage/, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await form.waitUntilReady();

    const original = buildValidCustomer();
    console.log('>>> Email generado:', original.email);
    await form.fillForm(original);
    await form.submit();

    // Esperar un momento para que aparezca el dialog si hay.
    await loggedInPage.waitForTimeout(2000);

    // Si aparecio un dialog, mostrarlo en el error.
    if (firstDialogMessage) {
      throw new Error(`El 1er registro mostro un alert: "${firstDialogMessage}"`);
    }

    await form.expectSuccess();

    // Quitamos el handler para no interferir con el 2do registro.
    loggedInPage.off('dialog', firstDialogHandler);

    // --- 2do registro: MISMO email, debe ser rechazado ---
    await loggedInPage.getByRole('link', { name: 'New Customer' }).click();
    await loggedInPage.waitForURL(/addcustomerpage/, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await form.waitUntilReady();

    const duplicate = buildValidCustomer({ email: original.email });
    await form.fillForm(duplicate);

    const message = await form.submitExpectingError();
    expect(message).toContain('Email Address Already Exist');

    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });
});