import { test, expect } from '../fixtures/auth.fixture';
import { Page } from '@playwright/test';
import { BalanceEnquiryPage } from '../pages/BalanceEnquiryPage';
import { env } from '../config/env';

test.setTimeout(180000);

async function setupBalanceEnquiry(loggedInPage: Page): Promise<BalanceEnquiryPage> {
  await loggedInPage.goto(`${env.baseUrl}/V4/manager/BalEnqInput.php`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  const form = new BalanceEnquiryPage(loggedInPage);
  await form.waitUntilReady();
  return form;
}

test.describe('Guru99 Bank - Modulo Balance Enquiry', () => {

  // Happy path roto por el demo (error 500). Cuando se arregle, quitar fixme.
  test.fixme('Cuenta existente: muestra el saldo', async ({ loggedInPage }) => {
    const form = await setupBalanceEnquiry(loggedInPage);
    await form.fillAccount('12345678');
    await form.submit();
    await expect(loggedInPage.getByText(/Balance Details/)).toBeVisible();
  });

  test('QT-10 | Cuenta inexistente: alert "Account does not exist"', async ({ loggedInPage }) => {
    const form = await setupBalanceEnquiry(loggedInPage);
    await form.fillAccount('99999999');

    const message = await form.submitExpectingError();
    expect(message).toContain('Account does not exist');
    await form.expectStillOnForm();
  });

  test('QT-11 | Cuenta vacia (inicial) + Submit: alert "Please fill all fields"', async ({ loggedInPage }) => {
    const form = await setupBalanceEnquiry(loggedInPage);

    // Campo vacio sin haber escrito + Submit → alert.
    const message = await form.submitExpectingError();
    expect(message).toContain('Please fill all fields');

    await form.expectStillOnForm();
  });

    test('QT-12 | Cuenta con letras: inline "Characters are not allowed"', async ({ loggedInPage }) => {
    const form = await setupBalanceEnquiry(loggedInPage);

    // pressSequentially dispara input/keyup en cada letra
    // → Guru99 muestra el inline automaticamente.
    const accountField = loggedInPage.locator('input[name="accountno"]');
    await accountField.pressSequentially('abc', { delay: 100 });
    await loggedInPage.waitForTimeout(800);

    await expect(
      loggedInPage.getByText('Characters are not allowed')
    ).toBeVisible();

    await form.expectStillOnForm();
  });

   test('QT-13 | Cuenta vaciada: inline "Account Number must not be blank"', async ({ loggedInPage }) => {
    const form = await setupBalanceEnquiry(loggedInPage);

    // Escribimos y borramos → inline sin submit.
    await form.fillAccount('123');
    await loggedInPage.waitForTimeout(500);
    await form.fillAccount('');
    await loggedInPage.waitForTimeout(800);

    await expect(
      loggedInPage.getByText('Account Number must not be blank')
    ).toBeVisible();

    await form.expectStillOnForm();
  });
});