import { Page, Locator, expect } from '@playwright/test';

export class BalanceEnquiryPage {
  private readonly accountField: Locator;
  private readonly submitButton: Locator;
  private readonly resetButton: Locator;
  private readonly successMessage: Locator;

  constructor(private readonly page: Page) {
    this.accountField = page.locator('input[name="accountno"]');
    this.submitButton = page.locator('input[name="AccSubmit"]');
    this.resetButton = page.locator('input[name="res"]');
    this.successMessage = page.getByText(/Balance Details/);
  }

  async waitUntilReady(): Promise<void> {
    await this.accountField.waitFor({ state: 'visible', timeout: 60000 });
  }

  async fillAccount(accountNo: string): Promise<void> {
    await this.accountField.fill(accountNo);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Hace submit capturando el alert nativo si aparece.
   * Devuelve el mensaje del alert (o '' si no hubo alert).
   */
  async submitExpectingError(): Promise<string> {
    let message = '';

    const handler = async (dialog: any) => {
      message = dialog.message();
      try {
        await dialog.accept();
      } catch {
        // ya aceptado
      }
    };
    this.page.once('dialog', handler);

    await this.submit();

    if (!message) {
      await this.page.waitForTimeout(800);
    }

    return message;
  }

  async expectSuccess(): Promise<void> {
    await expect(this.successMessage).toBeVisible();
  }

  async expectNotSuccess(): Promise<void> {
    await expect(this.successMessage).not.toBeVisible();
  }

  async expectStillOnForm(): Promise<void> {
    await expect(this.submitButton).toBeVisible();
  }
}