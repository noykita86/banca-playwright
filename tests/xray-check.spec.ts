import { test, expect } from '@playwright/test';

// IMPORTANTE: Reemplaza "QA" por la clave real de tu proyecto en Jira.
// Si no sabes la clave, mira la URL de tu Jira cuando estés dentro del proyecto:
// https://qa-noyka.atlassian.net/jira/software/projects/XXX/boards/...
test('QT-4 | Verificacion de integracion con Xray', async ({ page }) => {
  // Este test es muy simple: navega a la URL base y verifica el título
  await page.goto('/');
  await expect(page).toHaveTitle(/.*/);
});