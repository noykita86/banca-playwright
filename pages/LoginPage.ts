import { Page, expect } from '@playwright/test';
import { env } from '../config/env';

/**
 * Page Object Model de la pagina de login de Guru99 Bank.
 *
 * Encapsula los selectores y acciones del login, de modo que los tests
 * no repitan `page.locator('input[name="uid"]')` cada vez.
 *
 * Uso tipico en un test:
 *   const loginPage = new LoginPage(page);
 *   await loginPage.goto();
 *   await loginPage.loginAsManager();
 */
export class LoginPage {
  private readonly uidField;
  private readonly passwordField;
  private readonly loginButton;

  constructor(private readonly page: Page) {
    this.uidField = page.locator('input[name="uid"]');
    this.passwordField = page.locator('input[name="password"]');
    this.loginButton = page.locator('input[name="btnLogin"]');
  }

  /** Navega a la pagina de login y espera a que el formulario este listo. */
  async goto(): Promise<void> {
    await this.page.goto(`${env.baseUrl}/V4/index.php`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.uidField.waitFor({ state: 'visible', timeout: 30000 });
  }

  /** Rellena credenciales y hace click en Login. No espera el dashboard. */
  async login(username: string, password: string): Promise<void> {
    await this.uidField.fill(username);
    await this.passwordField.fill(password);
    await this.loginButton.click();
  }

  /** Login con credenciales del manager desde `.env` + espera el dashboard. */
  async loginAsManager(): Promise<void> {
    await this.login(env.user.email, env.user.password);
    await this.page
      .getByRole('link', { name: 'New Customer' })
      .waitFor({ state: 'visible', timeout: 30000 });
  }

  /** Verifica que el login fue exitoso. */
  async expectLoggedIn(): Promise<void> {
    await expect(
      this.page.getByRole('link', { name: 'New Customer' })
    ).toBeVisible();
  }
}