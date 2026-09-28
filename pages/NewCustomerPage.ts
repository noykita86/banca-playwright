import { Page, Locator, expect } from '@playwright/test';

/**
 * Estructura de datos del formulario "New Customer".
 * Exportada para que tests y factory la reutilicen.
 */
export type CustomerData = {
  name: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  mobile: string;
  email: string;
  password: string;
};

/**
 * Page Object Model del formulario "New Customer" de Guru99 Bank.
 */
export class NewCustomerPage {
  private readonly nameField: Locator;
  private readonly dobField: Locator;
  private readonly addressField: Locator;
  private readonly cityField: Locator;
  private readonly stateField: Locator;
  private readonly pinField: Locator;
  private readonly mobileField: Locator;
  private readonly emailField: Locator;
  private readonly passwordField: Locator;
  private readonly submitButton: Locator;
  private readonly successMessage: Locator;

  constructor(private readonly page: Page) {
    this.nameField = page.locator('input[name="name"]');
    this.dobField = page.locator('input[name="dob"]');
    this.addressField = page.locator('textarea[name="addr"]');
    this.cityField = page.locator('input[name="city"]');
    this.stateField = page.locator('input[name="state"]');
    this.pinField = page.locator('input[name="pinno"]');
    this.mobileField = page.locator('input[name="telephoneno"]');
    this.emailField = page.locator('input[name="emailid"]');
    this.passwordField = page.locator('input[name="password"]');
    this.submitButton = page.locator('input[name="sub"]');
    this.successMessage = page.getByText('Customer Registered Successfully');
  }

  /** Espera a que el formulario este listo (campo "name" visible). */
  async waitUntilReady(): Promise<void> {
    await this.nameField.waitFor({ state: 'visible', timeout: 60000 });
  }

  /** Rellena TODOS los campos del formulario. */
  async fillForm(data: CustomerData): Promise<void> {
    await this.nameField.fill(data.name);
    await this.dobField.fill(data.dateOfBirth);
    await this.addressField.fill(data.address);
    await this.cityField.fill(data.city);
    await this.stateField.fill(data.state);
    await this.pinField.fill(data.pin);
    await this.mobileField.fill(data.mobile);
    await this.emailField.fill(data.email);
    await this.passwordField.fill(data.password);
  }

  /** Hace click en el boton Submit. */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Verifica que el registro fue exitoso. */
  async expectSuccess(): Promise<void> {
    await expect(this.successMessage).toBeVisible();
  }

  /** Verifica que el registro NO fue exitoso. */
  async expectNotSuccess(): Promise<void> {
    await expect(this.successMessage).not.toBeVisible();
  }

  /** Verifica que aparece un mensaje inline especifico. */
  async expectInlineError(message: string): Promise<void> {
    await expect(this.page.getByText(message)).toBeVisible();
  }

  /** Verifica que seguimos en el formulario (Submit visible). */
  async expectStillOnForm(): Promise<void> {
    await expect(this.submitButton).toBeVisible();
  }

  /** Devuelve el locator del campo PIN (para tests de MAXLENGTH). */
  getPinField(): Locator {
    return this.pinField;
  }
    /**
   * Hace submit esperando que aparezca un alert() nativo del sitio
   * (caso tipico: email duplicado, u otros errores que Guru99 muestra
   * como dialogo). Devuelve el mensaje mostrado para que el test lo valide.
   *
   * Nota: si un handler global .on('dialog') ya acepta el dialogo
   * (como hace el beforeEach de customer-validation.spec.ts), el try/catch
   * evita el error "dialog already handled".
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
      // El dialogo ya fue aceptado por otro handler. Ignoramos.
    }
    return message;
  }
}