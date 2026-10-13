import { test as base } from './base.fixture';
import { Page, request as playwrightRequest } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { env } from '../config/env';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(__dirname, '..', '.auth', 'manager.json');

/**
 * Valida si la sesion guardada sigue activa.
 *
 * Hace una peticion ligera al dashboard y comprueba DOS cosas:
 *   1) Que el status sea 200 (no redireccion al login).
 *   2) Que el HTML NO contenga el mensaje "User id is wrong",
 *      que Guru99 inyecta cuando la sesion PHP expiro aunque el
 *      status siga siendo 200.
 *
 * Si cualquiera de las dos falla, la sesion se considera invalida.
 */
async function isSessionValid(): Promise<boolean> {
  if (!fs.existsSync(AUTH_FILE)) return false;

  const apiContext = await playwrightRequest.newContext({
    storageState: AUTH_FILE,
    baseURL: env.baseUrl,
    ignoreHTTPSErrors: true,
  });

  try {
    const response = await apiContext.get('/V4/manager/Managerhomepage.php', {
      maxRedirects: 0,
    });

    // 302 u otro status distinto de 200 = redireccion al login.
    if (response.status() !== 200) return false;

    const html = await response.text();

    // ⭐ Validacion fuerte: Guru99 devuelve el HTML del dashboard
    //    pero con un script que dispara alert('Your User id is wrong')
    //    cuando la sesion PHP ya expiro.
    if (html.includes('User id is wrong')) {
      console.log('⚠️  HTML contiene "User id is wrong" → sesion invalida');
      return false;
    }

    // Validaciones adicionales por si acaso.
    const looksLikeLoginForm =
      html.includes('name="uid"') && html.includes('name="password"');
    const looksLikeDashboard =
      html.includes('New Customer') || html.includes('name="name"');

    if (looksLikeLoginForm && !looksLikeDashboard) return false;

    return looksLikeDashboard;
  } catch {
    return false;
  } finally {
    await apiContext.dispose();
  }
}

/**
 * Regenera el storageState haciendo login fresco.
 * Se llama cuando isSessionValid() devuelve false.
 */
async function refreshSession(browser: any): Promise<void> {
  if (fs.existsSync(AUTH_FILE)) fs.unlinkSync(AUTH_FILE);

  const loginContext = await browser.newContext();
  const loginPage = await loginContext.newPage();

  const login = new LoginPage(loginPage);
  await login.goto();
  await login.loginAsManager();

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await loginContext.storageState({ path: AUTH_FILE });
  await loginContext.close();

  console.log('✅ Sesion regenerada');
}

export const test = base.extend<{ loggedInPage: Page }>({

  loggedInPage: async ({ browser }, use) => {

    // ---------------------------------------------------------
    // 1) Validacion proactiva: si la sesion no existe o ya no sirve,
    //    la regeneramos automaticamente antes del test.
    // ---------------------------------------------------------
    const valid = await isSessionValid();

    if (!valid) {
      console.log('♻️  Sesion invalida o inexistente. Regenerando...');
      await refreshSession(browser);
    } else {
      console.log('✅ Sesion valida, reutilizando');
    }

    // ---------------------------------------------------------
    // 2) Creamos contexto con la sesion guardada y navegamos
    //    al dashboard para entregar una pagina lista al test.
    // ---------------------------------------------------------
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();

    await page.goto(`${env.baseUrl}/V4/manager/Managerhomepage.php`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // ---------------------------------------------------------
    // 3) Entregamos la pagina al test.
    // ---------------------------------------------------------
    await use(page);

    await context.close();
  },
});

export { expect } from '@playwright/test';