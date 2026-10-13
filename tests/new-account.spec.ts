import { test, expect } from '../fixtures/auth.fixture';
import { Page } from '@playwright/test';
import { NewAccountPage } from '../pages/NewAccountPage';
import { NewCustomerPage } from '../pages/NewCustomerPage';
import { buildValidCustomer } from '../fixtures/customer';
import { env } from '../config/env';

test.setTimeout(180000);

/**
 * Crea un Customer via UI y devuelve su Customer ID.
 *
 * Esto permite que cada test tenga un cliente PROPIO del manager
 * actual, evitando depender de un ID hardcoded en .env que puede:
 *   - Haber sido borrado (Guru99 limpia cuentas cada 20 dias).
 *   - Pertenecer a otro manager (error "not authorize").
 */
async function createCustomerAndGetId(loggedInPage: Page): Promise<string> {
  await loggedInPage.getByRole('link', { name: 'New Customer' }).click();
  await loggedInPage.waitForURL(/addcustomerpage/, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });

  const customerForm = new NewCustomerPage(loggedInPage);
  await customerForm.waitUntilReady();
  await customerForm.fillForm(buildValidCustomer());
  await customerForm.submit();
  await customerForm.expectSuccess();

  // En la pagina de exito, Guru99 muestra "Customer ID" seguido del valor.
  // Buscamos la celda con ese texto y tomamos la celda hermana.
  const customerId = await loggedInPage
    .locator('td:has-text("Customer ID") + td')
    .first()
    .innerText();

  return customerId.trim();
}

/**
 * Helper: navega al formulario "New Account" y devuelve el Page Object.
 */
async function setupNewAccount(loggedInPage: Page): Promise<NewAccountPage> {
  await loggedInPage.goto(`${env.baseUrl}/V4/manager/addAccount.php`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  const form = new NewAccountPage(loggedInPage);
  await form.waitUntilReady();
  return form;
}

test.describe('Guru99 Bank - Modulo New Account', () => {

 test('Crear cuenta con deposito inicial 500: exito', { tag: '@smoke' }, async ({ loggedInPage }) => {

    //  Creamos un Customer fresco automaticamente.
    const customerId = await createCustomerAndGetId(loggedInPage);
    console.log('>>> Customer ID generado:', customerId);

    const form = await setupNewAccount(loggedInPage);
    await form.fillForm({
      customerId,
      accountType: 'Savings',
      initialDeposit: '500',
    });
    await form.submit();
    await form.expectSuccess();
  });

  test('Customer ID inexistente: rechazado', async ({ loggedInPage }) => {
    const form = await setupNewAccount(loggedInPage);
    await form.fillForm({
      customerId: '99999999',
      accountType: 'Savings',
      initialDeposit: '500',
    });
    const msg = await form.submitExpectingError();
    expect(msg).toContain('Customer does not exist');
    await form.expectNotSuccess();
  });

  test('Initial deposit menor a 500: rechazado', async ({ loggedInPage }) => {

    // Creamos un Customer valido para este test tambien.
    const customerId = await createCustomerAndGetId(loggedInPage);

    const form = await setupNewAccount(loggedInPage);
    await form.fillForm({
      customerId,
      accountType: 'Savings',
      initialDeposit: '100',
    });
    await form.submit();
    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });

  test('Customer ID con letras: rechazado', async ({ loggedInPage }) => {
    const form = await setupNewAccount(loggedInPage);
    await form.fillForm({
      customerId: 'abc',
      accountType: 'Savings',
      initialDeposit: '500',
    });
    await form.submit();
    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });
});