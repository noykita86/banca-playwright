import { test } from '../fixtures/auth.fixture';
import { NewCustomerPage } from '../pages/NewCustomerPage';
import { buildValidCustomer } from '../fixtures/customer';

test.setTimeout(180000);

/**
 * Prueba de creacion de un nuevo cliente en Guru99 Bank (V4).
 *
 * Refactorizado a Page Object Model + fixture de autenticacion:
 *  - `loggedInPage` viene ya autenticado (reutiliza storageState).
 *  - NewCustomerPage encapsula el formulario y sus aserciones.
 *  - buildValidCustomer() genera datos frescos (email unico por corrida).
 */

test.describe('Guru99 Bank - New Customer', () => {
  test('QT-14 | registra un nuevo cliente correctamente', { tag: '@smoke' }, async ({ loggedInPage }) => {

    // 1) Navegar al formulario "New Customer".
    await loggedInPage.getByRole('link', { name: 'New Customer' }).click();
    await loggedInPage.waitForURL(/addcustomerpage/, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });

    // 2) Esperar a que el formulario este listo.
    const newCustomerPage = new NewCustomerPage(loggedInPage);
    await newCustomerPage.waitUntilReady();

    // 3) Rellenar con datos frescos y enviar.
    await newCustomerPage.fillForm(buildValidCustomer());
    await newCustomerPage.submit();

    // 4) Verificar exito.
    await newCustomerPage.expectSuccess();
  });
});