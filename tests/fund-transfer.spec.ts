import { test, expect } from '../fixtures/auth.fixture';
import { Page } from '@playwright/test';
import { FundTransferPage } from '../pages/FundTransferPage';
import { NewAccountPage } from '../pages/NewAccountPage';
import { NewCustomerPage } from '../pages/NewCustomerPage';
import { buildValidCustomer } from '../fixtures/customer';
import { env } from '../config/env';

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

  let dialogMessage = '';
  loggedInPage.once('dialog', async dialog => {
    dialogMessage = dialog.message();
    console.log('⚠️  DIALOG al crear customer:', dialogMessage);
    await dialog.accept();
  });

  await customerForm.fillForm(buildValidCustomer());
  await customerForm.submit();
  await loggedInPage.waitForTimeout(2000);

  if (dialogMessage) {
    throw new Error(`No se pudo crear el customer: "${dialogMessage}"`);
  }

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
// GRUPO 1: Validaciones de formato
// ============================================================

test.describe('Guru99 Bank - Fund Transfer: validaciones de formato', () => {

  test('Payer account con letras: inline "Characters are not allowed"', async ({ loggedInPage }) => {
    const form = await goToFundTransfer(loggedInPage);

    const payerField = form.getPayerAccountField();
    await payerField.click();
    await loggedInPage.keyboard.type('abc', { delay: 150 });
    await loggedInPage.keyboard.press('Tab');
    await loggedInPage.waitForTimeout(1500);

    await expect(
      loggedInPage.getByText('Characters are not allowed').first()
    ).toBeVisible();

    await form.expectStillOnForm();
  });

  test('Payer account vaciado: inline "Payers Account Number must not be blank"', async ({ loggedInPage }) => {
    const form = await goToFundTransfer(loggedInPage);

    const payerField = form.getPayerAccountField();
    await payerField.click();
    await loggedInPage.keyboard.type('123', { delay: 150 });
    await loggedInPage.waitForTimeout(300);

    await loggedInPage.keyboard.press('Backspace');
    await loggedInPage.keyboard.press('Backspace');
    await loggedInPage.keyboard.press('Backspace');
    await loggedInPage.keyboard.press('Tab');
    await loggedInPage.waitForTimeout(1500);

    await expect(
      loggedInPage.getByText('Payers Account Number must not be blank')
    ).toBeVisible();

    await form.expectStillOnForm();
  });

  test('Amount con letras: inline "Characters are not allowed"', async ({ loggedInPage }) => {
    const form = await goToFundTransfer(loggedInPage);

    const amountField = form.getAmountField();
    await amountField.click();
    await loggedInPage.keyboard.type('abc', { delay: 150 });
    await loggedInPage.keyboard.press('Tab');
    await loggedInPage.waitForTimeout(1500);

    await expect(
      loggedInPage.getByText('Characters are not allowed').first()
    ).toBeVisible();

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
// ============================================================

test.describe.serial('Guru99 Bank - Fund Transfer: flujos con cuentas reales', () => {

  let payerAccount: string;
  let payeeAccount: string;

  test('Setup: crear customer + 2 cuentas', async ({ loggedInPage }) => {
    test.setTimeout(300000);

    const customerId = await createCustomerAndGetId(loggedInPage);
    payerAccount = await createAccountAndGetId(loggedInPage, customerId, '5000');
    payeeAccount = await createAccountAndGetId(loggedInPage, customerId, '1000');

    console.log('>>> Datos creados UNA VEZ:');
    console.log('  Customer:', customerId);
    console.log('  Payer:', payerAccount);
    console.log('  Payee:', payeeAccount);
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