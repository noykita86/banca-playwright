import { test, expect } from '../fixtures/base.fixture';

/**
 * ============================================================
 * DEMO: Mocking de MFA/OTP con Playwright
 * ============================================================
 *
 * Guru99 NO implementa MFA/OTP. Este spec demuestra COMO se
 * probaria en un banco real, interceptando las llamadas a la API
 * con `page.route()` y simulando las respuestas del backend.
 *
 * Truco: usamos un dominio ficticio (`https://fake-bank.test`)
 * y lo interceptamos COMPLETAMENTE con `page.route`. Asi el
 * navegador cree que esta navegando a un sitio real, pero
 * todas las respuestas las fabricamos nosotros.
 *
 * Patron aplicado:
 *  1) El navegador navega al dominio ficticio.
 *  2) `page.route()` intercepta TODAS las llamadas.
 *  3) El endpoint /api/login devuelve "MFA required".
 *  4) El endpoint /api/otp/verify devuelve exito o rechazo.
 *
 * Ventajas de este enfoque:
 *  - No depende de un backend real con MFA.
 *  - Permite simular casos de exito y de fallo del OTP.
 *  - Sirve de plantilla para entornos bancarios reales.
 */

const FAKE_DOMAIN = 'https://fake-bank.test';

test.describe('DEMO - Flujo MFA/OTP con mocking', () => {

  test('QT-41 | Login con MFA: OTP valido -> dashboard', async ({ page }) => {

    // ---------------------------------------------------------
    // 1) Interceptamos la navegacion inicial al dominio ficticio
    //    para que no intente salir a internet.
    // ---------------------------------------------------------
    await page.route(`${FAKE_DOMAIN}/**`, async route => {
      const url = route.request().url();

      if (url.endsWith('/api/login')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'MFA_REQUIRED',
            challengeId: 'challenge-abc-123',
          }),
        });
        return;
      }

      if (url.endsWith('/api/otp/verify')) {
        const body = route.request().postDataJSON();
        expect(body.otp).toBe('123456');
        expect(body.challengeId).toBe('challenge-abc-123');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'OK',
            sessionToken: 'fake-session-token-xyz',
          }),
        });
        return;
      }

      // Cualquier otra ruta: devolvemos un HTML minimo.
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>Fake Bank</body></html>',
      });
    });

    // ---------------------------------------------------------
    // 2) Navegamos al dominio ficticio.
    //    Playwright lo intercepta y NO sale a internet.
    // ---------------------------------------------------------
    await page.goto(FAKE_DOMAIN);

    // ---------------------------------------------------------
    // 3) Ejecutamos el flujo login -> MFA desde el navegador.
    // ---------------------------------------------------------
    const loginResponse = await page.evaluate(async (domain) => {
      const res = await fetch(`${domain}/api/login`, {
        method: 'POST',
        body: JSON.stringify({ user: 'test', pass: 'test' }),
      });
      return res.json();
    }, FAKE_DOMAIN);

    expect(loginResponse.status).toBe('MFA_REQUIRED');
    expect(loginResponse.challengeId).toBe('challenge-abc-123');

    const otpResponse = await page.evaluate(async (domain) => {
      const res = await fetch(`${domain}/api/otp/verify`, {
        method: 'POST',
        body: JSON.stringify({ otp: '123456', challengeId: 'challenge-abc-123' }),
      });
      return res.json();
    }, FAKE_DOMAIN);

    expect(otpResponse.status).toBe('OK');
    expect(otpResponse.sessionToken).toBe('fake-session-token-xyz');
  });

  // ---------------------------------------------------------
  // Caso negativo: OTP incorrecto -> rechazo.
  // ---------------------------------------------------------
  test('QT-42 | Login con MFA: OTP invalido -> rechazo', async ({ page }) => {

    await page.route(`${FAKE_DOMAIN}/**`, async route => {
      const url = route.request().url();

      if (url.endsWith('/api/login')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'MFA_REQUIRED', challengeId: 'challenge-xyz' }),
        });
        return;
      }

      if (url.endsWith('/api/otp/verify')) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'INVALID_OTP', message: 'Codigo incorrecto' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>Fake Bank</body></html>',
      });
    });

    await page.goto(FAKE_DOMAIN);

    const otpResponse = await page.evaluate(async (domain) => {
      const res = await fetch(`${domain}/api/otp/verify`, {
        method: 'POST',
        body: JSON.stringify({ otp: '000000', challengeId: 'challenge-xyz' }),
      });
      return { status: res.status, body: await res.json() };
    }, FAKE_DOMAIN);

    expect(otpResponse.status).toBe(401);
    expect(otpResponse.body.status).toBe('INVALID_OTP');
  });
});