import { Page, Locator, expect } from '@playwright/test';

/**
 * Datos del formulario "Fund Transfer".
 */
export type FundTransferData = {
  payerAccount: string;
  payeeAccount: string;
  amount: string;
  description: string;
};

/**
 * Page Object Model del formulario "Fund Transfer" de Guru99 Bank.
 *
 * Ojo con los name reales del sitio:
 *  - Amount usa "ammount" (con doble m) - es un typo del propio Guru99.
 *  - Description usa "desc".
 */
export class FundTransferPage {
  private readonly payerAccountField: Locator;
  private readonly payeeAccountField: Locator;
  private readonly amountField: Locator;
  private readonly descriptionField: Locator;
  private readonly submitButton: Locator;
  private readonly resetButton: Locator;
  private readonly successMessage: Locator;

  constructor(private readonly page: Page) {
    this.payerAccountField = page.locator('input[name="payersaccount"]');
    this.payeeAccountField = page.locator('input[name="payeeaccount"]');
    this.amountField = page.locator('input[name="ammount"]');
    this.descriptionField = page.locator('input[name="desc"]');
    this.submitButton = page.getByRole('button', { name: 'Submit' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.successMessage = page.getByText('Fund Transfer Details');
  }

  /** Espera a que el formulario este listo. */
  async waitUntilReady(): Promise<void> {
    await this.payerAccountField.waitFor({ state: 'visible', timeout: 60000 });
  }

  /** Rellena los 4 campos. */
  async fillForm(data: FundTransferData): Promise<void> {
    await this.payerAccountField.fill(data.payerAccount);
    await this.payeeAccountField.fill(data.payeeAccount);
    await this.amountField.fill(data.amount);
    await this.descriptionField.fill(data.description);
  }

  /** Click en Submit. */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Verifica que la transferencia fue exitosa. */
  async expectSuccess(): Promise<void> {
    await expect(this.successMessage).toBeVisible();
  }

  /** Verifica que NO fue exitosa. */
  async expectNotSuccess(): Promise<void> {
    await expect(this.successMessage).not.toBeVisible();
  }

  /** Verifica que seguimos en el formulario. */
  async expectStillOnForm(): Promise<void> {
    await expect(this.submitButton).toBeVisible();
  }

  /** Verifica mensaje inline especifico (validaciones de letras/campos). */
  async expectInlineError(message: string): Promise<void> {
    await expect(this.page.getByText(message)).toBeVisible();
  }

  /**
   * Hace submit esperando un alert() nativo (ej. saldo insuficiente).
   */
  async submitExpectingError(): Promise<string> {
    const [dialog] = await Promise.all([
      this.page.waitForEvent('dialog'),
      this.submit(),
    ]);
    const message = dialog.message();
    try {
      await dialog.accept();
    } catch {
      // ya aceptado por otro handler
    }
    return message;
  }

  /** Getters para tests de validacion (letras, maxlength, etc.) */
  getPayerAccountField(): Locator { return this.payerAccountField; }
  getPayeeAccountField(): Locator { return this.payeeAccountField; }
  getAmountField(): Locator { return this.amountField; }
  getDescriptionField(): Locator { return this.descriptionField; }
}