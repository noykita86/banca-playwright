import { test, expect } from '../fixtures/auth.fixture';
import { Page } from '@playwright/test';
import { FundTransferPage } from '../pages/FundTransferPage';
import { NewAccountPage } from '../pages/NewAccountPage';
import { NewCustomerPage } from '../pages/NewCustomerPage';
import { buildValidCustomer } from '../fixtures/customer';
import { env } from '../config/env';
import * as path from 'path';

test.setTimeout(180000);

// ============================================================
// Helpers
// ============================================================

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

  return (await loggedInPage
    .locator('td:has-text("Customer ID") + td')
    .first()
    .innerText()).trim();
}

async function createAccountAndGetId(
  loggedInPage: Page,
  customerId: string,
  initialDeposit: string = '5000'
): Promise<string> {
  await loggedInPage.goto(`${env.baseUrl}/V4/manager/addAccount.php`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  const accountForm = new NewAccountPage(loggedInPage);
  await accountForm.waitUntilReady();
  await accountForm.fillForm({
    customerId,
    accountType: 'Savings',
    initialDeposit,
  });
  await accountForm.submit();
  await accountForm.expectSuccess();

  return (await loggedInPage
    .locator('td:has-text("Account ID") + td')
    .first()
    .innerText()).trim();
}

async function goToFundTransfer(page: Page): Promise<FundTransferPage> {
  await page.goto(`${env.baseUrl}/V4/manager/FundTransInput.php`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  const form = new FundTransferPage(page);
  await form.waitUntilReady();
  return form;
}

// ============================================================
// GRUPO 1: Validaciones de formato (NO necesitan datos reales)
// Se ejecutan rapido, sin setup.
// ============================================================

test.describe('Guru99 Bank - Fund Transfer: validaciones de formato', () => {

  test('Payer account con letras: inline "Characters are not allowed"', async ({ loggedInPage }) => {
    const form = await goToFundTransfer(loggedInPage);

    // Estado 2: al escribir letras aparece inline SIN hacer submit.
    const payerField = form.getPayerAccountField();
    await payerField.fill('abc');
    await loggedInPage.waitForTimeout(800);

    await expect(
      loggedInPage.getByText('Characters are not allowed')
    ).toBeVisible();

    await form.expectStillOnForm();
  });

  test('Payer account vaciado tras escribir: inline "must not be blank"', async ({ loggedInPage }) => {
    const form = await goToFundTransfer(loggedInPage);

    // Estado 3: escribimos numeros y luego borramos → inline sin submit.
    const payerField = form.getPayerAccountField();
    await payerField.fill('123');
    await loggedInPage.waitForTimeout(500);
    await payerField.fill('');
    await loggedInPage.waitForTimeout(800);

    await expect(
      loggedInPage.getByText(/Payers Account Number must not be blank/i)
    ).toBeVisible();

    await form.expectStillOnForm();
  });

  test('Amount con letras: rechazado', async ({ loggedInPage }) => {
    const form = await goToFundTransfer(loggedInPage);
    await form.fillForm({
      payerAccount: '12345678',
      payeeAccount: '87654321',
      amount: 'abc',
      description: 'letras amount',
    });
    await form.submit();
    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });

  test('Amount vacio: rechazado', async ({ loggedInPage }) => {
    const form = await goToFundTransfer(loggedInPage);
    await form.fillForm({
      payerAccount: '12345678',
      payeeAccount: '87654321',
      amount: '',
      description: 'monto vacio',
    });
    await form.submit();
    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });

  test('Description acepta maximo 20 caracteres (MAXLENGTH)', async ({ loggedInPage }) => {
    const form = await goToFundTransfer(loggedInPage);
    const descField = form.getDescriptionField();
    await descField.pressSequentially('123456789012345678901234567890');
    const value = await descField.inputValue();
    expect(value.length).toBeLessThanOrEqual(20);
  });
});

// ============================================================
// GRUPO 2: Flujos con cuentas reales.
// `describe.serial` + `beforeAll` → los datos se crean UNA VEZ.
// ============================================================

test.describe.serial('Guru99 Bank - Fund Transfer: flujos con cuentas reales', () => {

  let payerAccount: string;
  let payeeAccount: string;

  test.beforeAll(async ({ browser }) => {
    const authFile = path.join(__dirname, '..', '.auth', 'manager.json');

    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();

    await page.goto(`${env.baseUrl}/V4/manager/Managerhomepage.php`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    const customerId = await createCustomerAndGetId(page);
    payerAccount = await createAccountAndGetId(page, customerId, '5000');
    payeeAccount = await createAccountAndGetId(page, customerId, '1000');

    console.log('>>> Datos creados UNA VEZ:');
    console.log('  Customer:', customerId);
    console.log('  Payer:', payerAccount);
    console.log('  Payee:', payeeAccount);

    await context.close();
  });

  test('Transferencia valida de $1: exito', async ({ loggedInPage }) => {
    const form = await goToFundTransfer(loggedInPage);
    await form.fillForm({
      payerAccount,
      payeeAccount,
      amount: '1',
      description: 'test transfer 1',
    });
    await form.submit();
    await form.expectSuccess();
  });

  test('Saldo insuficiente: rechazado', async ({ loggedInPage }) => {
    const form = await goToFundTransfer(loggedInPage);
    await form.fillForm({
      payerAccount,
      payeeAccount,
      amount: '999999999',
      description: 'monto imposible',
    });
    const message = await form.submitExpectingError();
    expect(message).toContain('Transfer Failed. Account Balance low');
    await form.expectNotSuccess();
  });
});