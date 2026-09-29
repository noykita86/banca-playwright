import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NewAccountPage } from '../pages/NewAccountPage';

test.setTimeout(90000);

const CUSTOMER_ID = '97904';

async function setupNewAccount(page: Page): Promise<NewAccountPage> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAsManager();

  await page.goto('https://demo.guru99.com/V4/manager/addAccount.php', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  const form = new NewAccountPage(page);
  await form.waitUntilReady();
  return form;
}

test.describe('Guru99 Bank - Modulo New Account', () => {

  test.beforeEach(async ({ page }) => {
    page.on('dialog', async dialog => {
      console.log('DIALOG:', dialog.message());
      await dialog.accept();
    });

    await page.route('**/*', route => {
      const url = route.request().url();
      const blocked = [
        'googletagmanager.com', 'google-analytics.com', 'clarity.ms',
        'convertbox.com', 'guru99.live', 'facebook.net', 'doubleclick.net',
      ];
      if (blocked.some(d => url.includes(d))) return route.abort();
      return route.continue();
    });
  });

  test('Crear cuenta con deposito inicial 500: exito', async ({ page }) => {
    const form = await setupNewAccount(page);
    await form.fillForm({
      customerId: CUSTOMER_ID,
      accountType: 'Savings',
      initialDeposit: '500',
    });
    await form.submit();
    await form.expectSuccess();
  });

  test('Customer ID inexistente: rechazado', async ({ page }) => {
    const form = await setupNewAccount(page);
    await form.fillForm({
      customerId: '99999999',
      accountType: 'Savings',
      initialDeposit: '500',
    });
    const msg = await form.submitExpectingError();
  //  console.log('>>> MENSAJE:', JSON.stringify(msg));
    expect(msg).toContain('Customer does not exist');
    await form.expectNotSuccess();
  });

  test('Initial deposit menor a 500: rechazado', async ({ page }) => {
    const form = await setupNewAccount(page);
    await form.fillForm({
      customerId: CUSTOMER_ID,
      accountType: 'Savings',
      initialDeposit: '100',
    });
    await form.submit();
    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });

  test('Customer ID con letras: rechazado', async ({ page }) => {
    const form = await setupNewAccount(page);
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