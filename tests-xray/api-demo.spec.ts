import { test, expect } from '@playwright/test';

/**
 * ============================================================
 * DEMO: API testing con el fixture `request` de Playwright
 * ============================================================
 *
 * El fixture `request` permite hacer peticiones HTTP sin abrir
 * navegador. Es la forma recomendada de Playwright para:
 *
 *  - Validar contratos de API (status, headers, body).
 *  - Preparar datos antes de un test de UI (setup).
 *  - Limpiar datos despues de un test (teardown).
 *  - Verificar el estado del backend tras una accion de UI.
 *
 * En una app bancaria real, este patron se usaria, por ejemplo, para:
 *  - Crear un cliente via API y luego validarlo en la UI.
 *  - Consultar el saldo via API y compararlo con lo que muestra la UI.
 *  - Inyectar una transferencia y verificar que se refleje en el historial.
 *
 * Usamos jsonplaceholder.typicode.com (API publica y estable) como
 * sustituto porque Guru99 no expone endpoints REST.
 */

const API_BASE = 'https://jsonplaceholder.typicode.com';

test.describe('DEMO - API Testing con APIRequestContext', () => {

  test('QT-6 | GET /posts/1 devuelve un post valido', async ({ request }) => {
    const response = await request.get(`${API_BASE}/posts/1`);

    // Validaciones basicas de la respuesta HTTP.
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    // Parseamos el JSON y validamos el contrato.
    const body = await response.json();
    expect(body).toMatchObject({
      userId: expect.any(Number),
      id: 1,
      title: expect.any(String),
      body: expect.any(String),
    });
  });

  test('QT-7 | POST /posts crea un recurso', async ({ request }) => {
    const response = await request.post(`${API_BASE}/posts`, {
      data: {
        title: 'Transferencia de prueba',
        body: 'Monto: 500 EUR',
        userId: 1,
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.title).toBe('Transferencia de prueba');
    expect(body.userId).toBe(1);
    expect(body.id).toBeDefined();
  });

  test('QT-8 | GET /posts/999999 devuelve 404', async ({ request }) => {
    const response = await request.get(`${API_BASE}/posts/999999`);
    expect(response.status()).toBe(404);
  });

  test('Setup via API + validacion en UI (patron hibrido)', async ({ request, page }) => {
    // ---------------------------------------------------------
    // 1) Creamos un recurso via API (rapido, sin navegador).
    // ---------------------------------------------------------
    const createResponse = await request.post(`${API_BASE}/posts`, {
      data: { title: 'Setup desde API', userId: 42 },
    });
    expect(createResponse.status()).toBe(201);

    const created = await createResponse.json();
    expect(created.title).toBe('Setup desde API');

    // ---------------------------------------------------------
    // 2) En una app real, aqui abririamos la UI y verificariamos
    //    que el recurso creado aparece. Aqui solo abrimos una
    //    pagina en blanco para demostrar el patron.
    // ---------------------------------------------------------
    await page.goto('about:blank');
    expect(page.url()).toBe('about:blank');

    // ---------------------------------------------------------
    // 3) Teardown: borramos el recurso creado.
    // ---------------------------------------------------------
    const deleteResponse = await request.delete(`${API_BASE}/posts/${created.id}`);
    expect([200, 204]).toContain(deleteResponse.status());
  });
});