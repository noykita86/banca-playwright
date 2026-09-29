import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { FundTransferPage } from '../pages/FundTransferPage';

test.setTimeout(90000);

/**
 * Datos fijos de las 2 cuentas existentes en el demo.
 * Los montos cambian a lo largo del tiempo por las transferencias,
 * por eso los tests usan valores pequenos o imposibles de cumplir.
 */
const PAYER_ACCOUNT = '185638';  // cliente 2, ~540 de saldo
const PAYEE_ACCOUNT = '185637';  // cliente 1, ~560 de saldo

/**
 * Helper: hace login y navega al formulario de Fund Transfer.
 * Devuelve el FundTransferPage listo para usar.
 */
async function setupFundTransfer(page: Page): Promise<FundTransferPage> {
    const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAsManager();

 // await page.getByRole('link', { name: 'Fund Transfer' }).click();
  //await page.waitForURL(/FundTransInput/, { timeout: 60000 });
  await page.goto('https://demo.guru99.com/V4/manager/FundTransInput.php', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  const fundTransferPage = new FundTransferPage(page);
  await fundTransferPage.waitUntilReady();
  return fundTransferPage;
}

test.describe('Guru99 Bank - Modulo Fund Transfer', () => {

  test.beforeEach(async ({ page }) => {
    // Manejar alert() nativos (saldo insuficiente, cuentas invalidas, etc.).
    page.on('dialog', async dialog => {
      console.log('DIALOG:', dialog.message());
      await dialog.accept();
    });

    // Bloquear recursos de terceros.
    await page.route('**/*', route => {
      const url = route.request().url();
      const blockedDomains = [
        'googletagmanager.com', 'google-analytics.com', 'clarity.ms',
        'convertbox.com', 'guru99.live', 'facebook.net', 'doubleclick.net',
      ];
      if (blockedDomains.some(domain => url.includes(domain))) {
        return route.abort();
      }
      return route.continue();
    });
  });

  // ============================================================
  // HAPPY PATH
  // ============================================================

  test('Transferencia valida de $1: exito', async ({ page }) => {
    const form = await setupFundTransfer(page);
    await form.fillForm({
      payerAccount: PAYER_ACCOUNT,
      payeeAccount: PAYEE_ACCOUNT,
      amount: '1',
      description: 'test transfer 1',
    });
    await form.submit();
    await form.expectSuccess();
  });

  // ============================================================
  // SALDO INSUFICIENTE (modo descubrimiento)
  // ============================================================

  test('Saldo insuficiente: rechazado', async ({ page }) => {
    const form = await setupFundTransfer(page);
    await form.fillForm({
      payerAccount: PAYER_ACCOUNT,
      payeeAccount: PAYEE_ACCOUNT,
      amount: '999999999',
      description: 'monto imposible',
    });

    const message = await form.submitExpectingError();
    // console.log('>>> MENSAJE DEL SITIO:', JSON.stringify(message));
    
    // expect(message).toContain('...');  // fijar tras descubrimiento

    expect(message).toContain('Transfer Failed. Account Balance low');
    await form.expectNotSuccess();
  });

  // ============================================================
  // VALIDACIONES DE FORMATO
  // ============================================================

  test('Payer account con letras: rechazado', async ({ page }) => {
    const form = await setupFundTransfer(page);
    await form.fillForm({
      payerAccount: 'abc',
      payeeAccount: PAYEE_ACCOUNT,
      amount: '10',
      description: 'letras payer',
    });
    await form.submit();

    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });

  test('Amount con letras: rechazado', async ({ page }) => {
    const form = await setupFundTransfer(page);
    await form.fillForm({
      payerAccount: PAYER_ACCOUNT,
      payeeAccount: PAYEE_ACCOUNT,
      amount: 'abc',
      description: 'letras amount',
    });
    await form.submit();

    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });

  test('Amount vacio: rechazado', async ({ page }) => {
    const form = await setupFundTransfer(page);
    await form.fillForm({
      payerAccount: PAYER_ACCOUNT,
      payeeAccount: PAYEE_ACCOUNT,
      amount: '',
      description: 'monto vacio',
    });
    await form.submit();

    await form.expectNotSuccess();
    await form.expectStillOnForm();
  });

  // ============================================================
  // VALIDACION DE MAXLENGTH EN DESCRIPTION (20 chars)
  // ============================================================

  test('Description acepta maximo 20 caracteres (MAXLENGTH)', async ({ page }) => {
    const form = await setupFundTransfer(page);

    const descField = form.getDescriptionField();
    await descField.pressSequentially('123456789012345678901234567890');
    const value = await descField.inputValue();
    test.expect(value.length).toBeLessThanOrEqual(20);
  });
});