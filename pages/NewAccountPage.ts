import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model del formulario "New Account" de Guru99 Bank.
 */
export class NewAccountPage {
  private readonly customerIdField: Locator;
  private readonly accountTypeSelect: Locator;
  private readonly initialDepositField: Locator;
  private readonly submitButton: Locator;
  private readonly resetButton: Locator;
  private readonly successMessage: Locator;

  constructor(private readonly page: Page) {
    this.customerIdField = page.locator('input[name="cusid"]');
    this.accountTypeSelect = page.locator('select[name="selaccount"]');
    this.initialDepositField = page.locator('input[name="inideposit"]');
    this.submitButton = page.getByRole('button', { name: 'Submit' });
 // this.submitButton = page.locator('input[name="submit"]');
    this.resetButton = page.locator('input[name="reset"]');
    this.successMessage = page.getByText('Account Generated Successfully!!!');
  }

  /** Espera a que el formulario este listo. */
  async waitUntilReady(): Promise<void> {
    await this.customerIdField.waitFor({ state: 'visible', timeout: 60000 });
  }

  /** Rellena el formulario de nueva cuenta. */
  async fillForm(data: {
    customerId: string;
    accountType: string;
    initialDeposit: string;
  }): Promise<void> {
    await this.customerIdField.fill(data.customerId);
    await this.accountTypeSelect.selectOption(data.accountType);
    await this.initialDepositField.fill(data.initialDeposit);
  }

  /** Hace click en el boton Submit. */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Verifica que la cuenta fue creada exitosamente. */
  async expectSuccess(): Promise<void> {
    await expect(this.successMessage).toBeVisible();
  }

  /** Verifica que NO se creo la cuenta. */
  async expectNotSuccess(): Promise<void> {
    await expect(this.successMessage).not.toBeVisible();
  }

  /** Verifica que seguimos en el formulario. */
  async expectStillOnForm(): Promise<void> {
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Hace submit esperando un alert() nativo (ej. customer id invalido).
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
}