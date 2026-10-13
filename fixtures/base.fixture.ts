import { test as base } from '@playwright/test';

const BLOCKED_DOMAINS = [
  'googletagmanager.com',
  'google-analytics.com',
  'clarity.ms',
  'convertbox.com',
  'guru99.live',
  'facebook.net',
  'doubleclick.net',
];

type BaseFixtures = {
  blockThirdParties: void;
};

/**
 * Fixture base: bloquea recursos de terceros (analytics, ads) en
 * todos los tests para acelerar la carga y evitar timeouts externos.
 *
 * NOTA: no incluimos auto-accept de dialogs porque los tests que
 * necesitan validar mensajes de alert() los capturan explicitamente
 * (ver LoginPage.loginExpectingError). Un auto-accept global rompe
 * esa captura (race condition).
 */
export const test = base.extend<BaseFixtures>({
  blockThirdParties: [async ({ page }, use) => {
    await page.route('**/*', route => {
      const url = route.request().url();
      if (BLOCKED_DOMAINS.some(d => url.includes(d))) return route.abort();
      return route.continue();
    });
    await use();
  }, { auto: true }],
});

export { expect } from '@playwright/test';