import { test, expect, Page } from '@playwright/test';
import { env } from '../config/env';

test.setTimeout(90000); // 90 segundos

/**
 * Prueba de creacion de un nuevo cliente en Guru99 Bank (V4).
 *
 * Navega a la pagina principal, inicia sesion con las credenciales del
 * usuario demo, abre el formulario 'New Customer', lo completa con los
 * datos de un cliente de prueba, envia el formulario y verifica que el
 * sistema confirma el registro mostrando 'Customer Registered Successfully'.
 *
 * NOTA SOBRE DATOS:
 * Las credenciales y la URL base vienen de `.env` a traves de `config/env.ts`.
 * El email se genera dinamicamente en cada corrida para evitar el error
 * "Email Address Already Exist" (Guru99 persiste los registros en su BD).
 */

/** Estructura de datos del formulario New Customer. */
type CustomerData = {
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

/** Genera un email unico y corto (Guru99 limita a 30 chars el campo). */
function uniqueEmail(): string {
  const ts = Date.now().toString(36);                    // ~8 chars
  const rnd = Math.random().toString(36).slice(2, 6);    // 4 chars
  return `qa${ts}${rnd}@example.com`;                    // ~26 chars total
}

/** Devuelve datos validos del cliente de prueba. */
function buildCustomer(): CustomerData {
  return {
    name: 'Test User',
    dateOfBirth: '1990-01-01',
    address: 'Calle Falsa 123',
    city: 'Madrid',
    state: 'Madrid',
    pin: '280001',          // 6 digitos (Guru99 lo exige)
    mobile: '6001234567',   // 10 digitos (Guru99 lo exige)
    email: uniqueEmail(),   // unico por corrida
    password: 'TestPass123',
  };
}

/** Inicia sesion en Guru99 Bank usando credenciales de `.env`. */
async function login(page: Page): Promise<void> {
  await page.locator('input[name="uid"]').fill(env.user.email);
  await page.locator('input[name="password"]').fill(env.user.password);
  await page.locator('input[name="btnLogin"]').click();
}

/**
 * Completa el formulario 'New Customer' con los datos del cliente.
 */
async function fillNewCustomerForm(page: Page, data: CustomerData): Promise<void> {
  await page.locator('input[name="name"]').fill(data.name);
  await page.locator('input[name="dob"]').fill(data.dateOfBirth);
  await page.locator('textarea[name="addr"]').fill(data.address);
  await page.locator('input[name="city"]').fill(data.city);
  await page.locator('input[name="state"]').fill(data.state);
  await page.locator('input[name="pinno"]').fill(data.pin);
  await page.locator('input[name="telephoneno"]').fill(data.mobile);
  await page.locator('input[name="emailid"]').fill(data.email);
  await page.locator('input[name="password"]').fill(data.password);
}

test.describe('Guru99 Bank - New Customer', () => {
  test('registra un nuevo cliente correctamente', async ({ page }) => {

    // 1) PRIMERO: manejar cualquier alert() del sitio.
    //    Debe ir ANTES de cualquier goto o click, si no bloquea la pagina.
    page.on('dialog', async (dialog) => {
      console.log('DIALOG:', dialog.message());
      await dialog.accept();
    });

    // 2) Bloquear recursos de terceros (analytics, ads) que ralentizan la carga.
    await page.route('**/*', route => {
      const url = route.request().url();
      const blockedDomains = [
        'googletagmanager.com',
        'google-analytics.com',
        'clarity.ms',
        'convertbox.com',
        'guru99.live',
        'facebook.net',
        'doubleclick.net',
      ];
      if (blockedDomains.some(domain => url.includes(domain))) {
        return route.abort();
      }
      return route.continue();
    });

    // 3) Navega a la pagina de login.
    await page.goto(`${env.baseUrl}/V4/index.php`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // 4) Inicia sesion con el usuario manager (credenciales desde `.env`).
    await login(page);

    // 5) Espera a que el enlace 'New Customer' este visible antes de clickear.
    //    PROTECCION ANTI-FLAKINESS: si hacemos click antes de que el manager
    //    dashboard termine de renderizar, el click puede fallar o navegar antes
    //    de tiempo. La espera explicita evita ese tipo de fallos aleatorios.
    const newCustomerLink = page.getByRole('link', { name: 'New Customer' });
    await newCustomerLink.waitFor({ state: 'visible', timeout: 30000 });
    await newCustomerLink.click();

    // 6) ESPERA CRITICA: confirmar que el formulario esta visible antes de
    //    intentar rellenar. Sin esto, el primer `fill` puede ejecutarse sobre
    //    una pagina que aun no ha terminado de renderizar (causa tipica de
    //    "Test timeout of 90000ms exceeded" en locator.fill).
    await page.locator('input[name="name"]').waitFor({ state: 'visible', timeout: 30000 });

    // 7) Rellena el formulario con datos frescos (email unico por corrida).
    const customer = buildCustomer();
    await fillNewCustomerForm(page, customer);

    // 8) Envia el formulario y verifica el mensaje de exito.
    await page.locator('input[name="sub"]').click();
    await expect(page.getByText('Customer Registered Successfully')).toBeVisible();
  });
});