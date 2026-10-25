import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env';

/**
 * Configuracion de Playwright para el proyecto Banca.
 *
 * Estrategias anti-flakiness aplicadas:
 *  - retries: reintenta tests fallidos por causas puntuales (red, lentitud).
 *  - workers: limita la concurrencia para no sobrecargar el sistema ni el sitio.
 *  - timeout: tiempo maximo por test, centralizado aqui.
 *  - expect.timeout: tiempo maximo para las aserciones (mas generoso que el default).
 *  - trace: guarda la traza solo cuando un test falla y se reintenta.
 *  - slowMo: cámara lenta opcional para depurar, activada por variable de entorno.
 *
 * Como activar slowMo (solo para depurar, no en CI):
 *   $env:PLAYWRIGHT_SLOW_MO=800; npx playwright test --headed --workers=1
 *
 * Como limpiar la variable en la misma sesion de PowerShell:
 *   $env:PLAYWRIGHT_SLOW_MO=""
 */
export default defineConfig({

  // Carpeta donde Playwright busca los tests.
  testDir: './tests',

  // ------------------------------------------------------------
  // ANTI-FLAKINESS: reintentos
  // ------------------------------------------------------------
  retries: process.env.CI ? 2 : 0,

  // ------------------------------------------------------------
  // ANTI-FLAKINESS: concurrencia
  // ------------------------------------------------------------
  workers: process.env.CI ? 1 : 1,

  // ------------------------------------------------------------
  // ANTI-FLAKINESS: timeouts
  // ------------------------------------------------------------
  timeout: 180 * 1000,

  expect: {
    timeout: 180 * 1000,
  },

  // ------------------------------------------------------------
  // PARALELISMO
  // ------------------------------------------------------------
  fullyParallel: false,

  // ------------------------------------------------------------
  // REPORTERS (ACTUALIZADO PARA XRAY)
  // ------------------------------------------------------------
  reporter: [
    ['list'], 
    ['html'],
    ['playwright-xray', {
      jira: {
        url: 'https://qa-noyka.atlassian.net',
        type: 'cloud',
        apiVersion: '1.0',
      },
      cloud: {
        client_id: process.env.XRAY_CLIENT_ID || '',
        client_secret: process.env.XRAY_CLIENT_SECRET || '',
      },
      projectKey: process.env.XRAY_PROJECT_KEY || 'QT', // Usa la variable de entorno o por defecto QT
      testPlan: 'QT-3',
      debug: true, // Muestra el proceso en la consola
    }]
  ],

  // ------------------------------------------------------------
  // CONFIGURACION COMPARTIDA POR TODOS LOS PROYECTOS
  // ------------------------------------------------------------
  use: {
    baseURL: env.baseUrl,
    actionTimeout: 60 * 1000,
    navigationTimeout: 120 * 1000,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    launchOptions: {
      slowMo: process.env.PLAYWRIGHT_SLOW_MO
        ? Number(process.env.PLAYWRIGHT_SLOW_MO)
        : 0,
    },
  },

  // ------------------------------------------------------------
  // PROYECTOS (navegadores)
  // ------------------------------------------------------------
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});