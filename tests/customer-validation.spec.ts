import { test, expect, Page } from '@playwright/test';
import { env } from '../config/env';

test.setTimeout(90000); // 90 segundos

/**
 * Pruebas de validacion de campos del formulario "New Customer" en Guru99 Bank.
 *
 * Cada test verifica que el sitio RECHAZA datos invalidos en alguno de los
 * campos, mostrando mensajes inline (al lado del campo) o el popup
 * generico "please fill all fields".
 *
 * NOTA SOBRE FLAKINESS:
 * Guru99 Bank es un sitio lento y a veces inestable. Para reducir fallos
 * aleatorios, el helper `gotoNewCustomerForm` espera explicitamente a que
 * el formulario este visible antes de devolver el control al test. Asi se
 * evita que un `fill` se ejecute antes de que la pagina haya cargado.
 *
 * NOTA SOBRE DATOS:
 * Las credenciales y la URL base vienen de `.env` a traves de `config/env.ts`.
 * Los datos validos se generan con `buildValidCustomer()`, que produce un
 * email unico por invocacion. Esto evita colisiones con la base de datos
 * persistente de Guru99 (que rechaza emails ya existentes).
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

/**
 * Devuelve datos VALIDOS frescos del cliente.
 * Llamar una vez por test. Acepta overrides para invalidar un campo puntual.
 */
function buildValidCustomer(overrides: Partial<CustomerData> = {}): CustomerData {
  return {
    name: 'Test User',
    dateOfBirth: '1990-01-01',
    address: 'Calle Falsa 123',
    city: 'Madrid',
    state: 'Madrid',
    pin: '280001',          // 6 digitos (valido)
    mobile: '6001234567',   // 10 digitos (valido)
    email: uniqueEmail(),   // unico por test
    password: 'TestPass123',
    ...overrides,
  };
}

/** Inicia sesion en Guru99 Bank usando credenciales de `.env`. */
async function login(page: Page): Promise<void> {
  await page.locator('input[name="uid"]').fill(env.user.email);
  await page.locator('input[name="password"]').fill(env.user.password);
  await page.locator('input[name="btnLogin"]').click();
}

/**
 * Completa el formulario "New Customer" con los datos que recibe.
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

/**
 * Helper: hace login y navega al formulario "New Customer".
 *
 * PROTECCION ANTI-FLAKINESS:
 * Despues de hacer clic en el enlace "New Customer", esperamos a que el
 * campo `input[name="name"]` del formulario este visible antes de devolver
 * el control. Esto evita que el test intente rellenar el formulario antes
 * de que la pagina haya terminado de cargar (que era la causa del fallo
 * aleatorio "Test timeout of 90000ms exceeded" en locator.fill).
 *
 * `waitFor` con timeout de 30s es mas que suficiente en condiciones normales;
 * si el formulario no aparece en ese tiempo, hay un problema real de red o
 * del sitio, y queremos que el test falle rapido con un error claro.
 */
async function gotoNewCustomerForm(page: Page): Promise<void> {
  // Navegar a la pagina de login. La URL viene de `.env` (BASE_URL).
  await page.goto(`${env.baseUrl}/V4/index.php`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  // Iniciar sesion con el usuario manager (credenciales desde `.env`).
  await login(page);

  // Esperar a que la pagina de bienvenida del manager haya cargado.
  // El enlace "New Customer" solo esta disponible tras el login correcto.
  const newCustomerLink = page.getByRole('link', { name: 'New Customer' });
  await newCustomerLink.waitFor({ state: 'visible', timeout: 30000 });
  await newCustomerLink.click();

  // ESPERA CRITICA: confirmar que el formulario esta visible antes de continuar.
  // Sin esto, el primer `fill` puede ejecutarse sobre una pagina que aun no
  // ha terminado de renderizar los campos, provocando el timeout aleatorio.
  await page.locator('input[name="name"]').waitFor({ state: 'visible', timeout: 30000 });
}

test.describe('Guru99 Bank - Validaciones del formulario New Customer', () => {

  // Antes de cada test: registrar dialog handler y bloquear terceros.
  test.beforeEach(async ({ page }) => {

    // Manejar cualquier alert() del sitio (Guru99 los usa para errores y confirmaciones).
    page.on('dialog', async (dialog) => {
      console.log('DIALOG:', dialog.message());
      await dialog.accept();
    });

    // Bloquear recursos de terceros (analytics, ads) para acelerar la carga.
    // Sin este bloqueo, el sitio tarda mucho mas y aumenta la flakiness.
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
  });

  // ============================================================
  // VALIDACIONES DEL CAMPO PIN
  // ============================================================

  test('PIN con menos de 6 digitos debe ser rechazado', async ({ page }) => {
    await gotoNewCustomerForm(page);
    const invalidData = buildValidCustomer({ pin: '28001' });
    await fillNewCustomerForm(page, invalidData);
    await page.locator('input[name="sub"]').click();
    await expect(page.getByText('PIN Code must have 6 Digits')).toBeVisible();
    await expect(page.getByText('Customer Registered Successfully')).not.toBeVisible();
  });

  test('PIN con letras debe ser rechazado', async ({ page }) => {
    await gotoNewCustomerForm(page);
    const invalidData = buildValidCustomer({ pin: 'abcdef' });
    await fillNewCustomerForm(page, invalidData);
    await page.locator('input[name="sub"]').click();
    // El sitio filtra las letras (por onKeyUp), el campo queda sin numeros validos
    // y se dispara el popup generico "please fill all fields". No verificamos
    // un mensaje inline especifico porque el sitio no lo muestra en este caso.
    await expect(page.getByText('Customer Registered Successfully')).not.toBeVisible();
    await expect(page.locator('input[name="sub"]')).toBeVisible();
  });

  test('PIN vacio debe ser rechazado', async ({ page }) => {
    await gotoNewCustomerForm(page);
    const invalidData = buildValidCustomer({ pin: '' });
    await fillNewCustomerForm(page, invalidData);
    await page.locator('input[name="sub"]').click();
    // Con el PIN vacio el sitio no muestra el mensaje inline, dispara popup generico.
    await expect(page.getByText('Customer Registered Successfully')).not.toBeVisible();
    await expect(page.locator('input[name="sub"]')).toBeVisible();
  });

  test('PIN con 7 digitos: el campo limita a 6 por MAXLENGTH', async ({ page }) => {
    await gotoNewCustomerForm(page);
    const pinField = page.locator('input[name="pinno"]');
    // Usamos pressSequentially para simular tecleo real (respeta MAXLENGTH).
    await pinField.pressSequentially('1234567');
    const value = await pinField.inputValue();
    // El atributo MAXLENGTH="6" del HTML debe limitar el valor a 6 caracteres.
    expect(value.length).toBeLessThanOrEqual(6);
  });

  // ============================================================
  // VALIDACIONES DE FORMATO (mensajes inline especificos)
  // ============================================================

  test('Nombre con numeros debe ser rechazado', async ({ page }) => {
    await gotoNewCustomerForm(page);
    const invalidData = buildValidCustomer({ name: 'Test123' });
    await fillNewCustomerForm(page, invalidData);
    await page.locator('input[name="sub"]').click();
    await expect(page.getByText('Numbers are not allowed')).toBeVisible();
    await expect(page.getByText('Customer Registered Successfully')).not.toBeVisible();
  });

  test('Email sin @ debe ser rechazado', async ({ page }) => {
    await gotoNewCustomerForm(page);
    const invalidData = buildValidCustomer({ email: 'correo-sin-arroba' });
    await fillNewCustomerForm(page, invalidData);
    await page.locator('input[name="sub"]').click();
    // No conocemos aun el mensaje inline exacto; verificamos que no se registro.
    await expect(page.getByText('Customer Registered Successfully')).not.toBeVisible();
    await expect(page.locator('input[name="sub"]')).toBeVisible();
  });

  // ============================================================
  // VALIDACIONES DE CAMPOS EN BLANCO (mensajes inline + popup)
  // ============================================================

  test('Fecha de nacimiento en blanco debe ser rechazada', async ({ page }) => {
    await gotoNewCustomerForm(page);
    const invalidData = buildValidCustomer({ dateOfBirth: '' });
    await fillNewCustomerForm(page, invalidData);
    await page.locator('input[name="sub"]').click();
    await expect(page.getByText('Date Field must not be blank')).toBeVisible();
    await expect(page.getByText('Customer Registered Successfully')).not.toBeVisible();
  });

  test('Address en blanco debe ser rechazada', async ({ page }) => {
    await gotoNewCustomerForm(page);
    const invalidData = buildValidCustomer({ address: '' });
    await fillNewCustomerForm(page, invalidData);
    await page.locator('input[name="sub"]').click();
    await expect(page.getByText('Address Field must not be blank')).toBeVisible();
    await expect(page.getByText('Customer Registered Successfully')).not.toBeVisible();
  });

  test('City en blanco debe ser rechazada', async ({ page }) => {
    await gotoNewCustomerForm(page);
    const invalidData = buildValidCustomer({ city: '' });
    await fillNewCustomerForm(page, invalidData);
    await page.locator('input[name="sub"]').click();
    await expect(page.getByText('City Field must not be blank')).toBeVisible();
    await expect(page.getByText('Customer Registered Successfully')).not.toBeVisible();
  });

  test('State en blanco debe ser rechazado', async ({ page }) => {
    await gotoNewCustomerForm(page);
    const invalidData = buildValidCustomer({ state: '' });
    await fillNewCustomerForm(page, invalidData);
    await page.locator('input[name="sub"]').click();
    await expect(page.getByText('State must not be blank')).toBeVisible();
    await expect(page.getByText('Customer Registered Successfully')).not.toBeVisible();
  });

  test('Mobile en blanco debe ser rechazado', async ({ page }) => {
    await gotoNewCustomerForm(page);
    const invalidData = buildValidCustomer({ mobile: '' });
    await fillNewCustomerForm(page, invalidData);
    await page.locator('input[name="sub"]').click();
    await expect(page.getByText('Mobile no must not be blank')).toBeVisible();
    await expect(page.getByText('Customer Registered Successfully')).not.toBeVisible();
  });

  test('Email en blanco debe ser rechazado', async ({ page }) => {
    await gotoNewCustomerForm(page);
    const invalidData = buildValidCustomer({ email: '' });
    await fillNewCustomerForm(page, invalidData);
    await page.locator('input[name="sub"]').click();
    await expect(page.getByText('Email-ID must not be blank')).toBeVisible();
    await expect(page.getByText('Customer Registered Successfully')).not.toBeVisible();
  });

  test('Password en blanco debe ser rechazado', async ({ page }) => {
    await gotoNewCustomerForm(page);
    const invalidData = buildValidCustomer({ password: '' });
    await fillNewCustomerForm(page, invalidData);
    await page.locator('input[name="sub"]').click();
    await expect(page.getByText('Password must not be blank')).toBeVisible();
    await expect(page.getByText('Customer Registered Successfully')).not.toBeVisible();
  });
});