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
  // Local: 1 reintento (Guru99 es lento y falla esporadicamente).
  // CI: 2 reintentos (mas margen, la red del runner es menos predecible).
  // Los reintentos cubren fallos puntuales de red sin ocultar bugs reales,
  // porque si un test falla siempre, seguira fallando tras los reintentos.
  retries: process.env.CI ? 2 : 1,

  // ------------------------------------------------------------
  // ANTI-FLAKINESS: concurrencia
  // ------------------------------------------------------------
  // En local 1 worker: los tests corren uno a uno, mas lento pero estable.
  // En CI 1 worker: mismo motivo, y ademas el sitio demo es propenso a
  // saturarse si recibe muchas peticiones simultaneas.
  // Si en el futuro los tests son independientes y estables, se puede subir.
  workers: process.env.CI ? 1 : 1,

  // ------------------------------------------------------------
  // ANTI-FLAKINESS: timeouts
  // ------------------------------------------------------------
  // Tiempo maximo por test completo. 90s da margen a sitios lentos.
  timeout: 90 * 1000,

  // Tiempo maximo que esperan las aserciones (expect).
  // El valor por defecto es 5s; lo subimos a 10s para dar margen
  // a que aparezcan mensajes inline o cambie el DOM en sitios lentos.
  expect: {
    timeout: 10 * 1000,
  },

  // ------------------------------------------------------------
  // PARALELISMO
  // ------------------------------------------------------------
  // fullyParallel=false: los tests dentro de un mismo archivo corren en serie.
  // Es lo recomendado cuando los tests comparten estado (login, sesion, etc.)
  // o cuando el sitio bajo prueba es inestable.
  fullyParallel: false,

  // ------------------------------------------------------------
  // REPORTERS
  // ------------------------------------------------------------
  // 'list': salida compacta en la terminal (util para ver el progreso).
  // 'html': genera un reporte HTML navegable con capturas y trazas.
  reporter: [['list'], ['html']],

  // ------------------------------------------------------------
  // CONFIGURACION COMPARTIDA POR TODOS LOS PROYECTOS
  // ------------------------------------------------------------
  use: {

    // URL base viene de .env (BASE_URL) a traves de config/env.ts.
    // Los tests construyen rutas explicitas: `${env.baseUrl}/V4/index.php`
    baseURL: env.baseUrl,

    // Ignorar errores de certificado SSL.
    // Necesario en este equipo por el problema de CRYPT_E_REVOCATION_OFFLINE
    // que impedía la conexion a sitios con servidores de revocacion offline.
    ignoreHTTPSErrors: true,

    // Guarda la traza (paso a paso, capturas, red) solo cuando un test falla
    // en el primer intento y se va a reintentar. Permite depurar flakiness
    // sin generar trazas en cada test (que ralentizarian la ejecucion).
    trace: 'on-first-retry',

    // ------------------------------------------------------------
    // CAMARA LENTA (slowMo)
    // ------------------------------------------------------------
    // Si la variable de entorno PLAYWRIGHT_SLOW_MO esta definida, se usa su
    // valor como pausa (en milisegundos) entre cada accion del navegador.
    // Si no esta definida, slowMo=0 y la ejecucion va a velocidad normal.
    //
    // Ejemplo de uso en PowerShell:
    //   $env:PLAYWRIGHT_SLOW_MO=800; npx playwright test --headed --workers=1
    launchOptions: {
      slowMo: process.env.PLAYWRIGHT_SLOW_MO
        ? Number(process.env.PLAYWRIGHT_SLOW_MO)
        : 0,
    },
  },

  // ------------------------------------------------------------
  // PROYECTOS (navegadores)
  // ------------------------------------------------------------
  // Por defecto Playwright define 3: Chromium, Firefox y WebKit (Safari).
  // Puedes dejar solo el que uses, o los tres para cubrir mas.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
/*    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },*/
  ],
});