[![Playwright Tests](https://github.com/noykita86/banca-playwright/actions/workflows/playwright.yml/badge.svg)](https://github.com/noykita86/banca-playwright/actions/workflows/playwright.yml)
[![Playwright](https://img.shields.io/badge/Playwright-v1.63-blue?logo=playwright)](https://playwright.dev/)
[![Xray](https://img.shields.io/badge/Test_Management-Xray_Cloud-0052CC?logo=jira)](https://www.getxray.app/)

# 🏦 Banca — QA Automation con Playwright + TypeScript + Xray

Framework de pruebas automatizadas end-to-end sobre el demo bancario **Guru99 Bank (V4)**, construido con Playwright, TypeScript y Page Object Model. Incluye integración completa con **Jira/Xray** y pipeline de **CI/CD con GitHub Actions**.

---

## 🚀 Stack
 
| Herramienta                            | Versión | Uso |
| :--- | :--- | :--- |
| [Playwright](https://playwright.dev/)  | ^1.63   | Motor de automatización |
| TypeScript                             | ^7.0    | Tipado estricto |
| Node.js                                | ≥18     | Runtime |
| dotenv                                 | ^18.0   | Gestión de variables de entorno |
| [Xray Cloud](https://www.getxray.app/) | API v2  | Gestión de pruebas y trazabilidad |
| GitHub Actions                         | N/A     | CI/CD (Ejecución automática y reporte) |

---

## 📁 Estructura del proyecto

```text
Banca/
├── .github/
│   └── workflows/
│       └── playwright.yml      # Pipeline CI/CD (Smoke + Suite completa)
├── config/
│   └── env.ts                  # Lectura y validación de variables de entorno
├── fixtures/
│   ├── base.fixture.ts         # Fixtures automáticos (blocking + dialogs)
│   ├── auth.fixture.ts         # Fixture de autenticación con storageState
│   └── customer.ts             # Factory de datos de prueba
├── pages/                      # Page Objects (uno por página)
│   ├── LoginPage.ts
│   ├── NewCustomerPage.ts
│   ├── NewAccountPage.ts
│   ├── FundTransferPage.ts
│   └── BalanceEnquiryPage.ts
├── tests/                      # Specs originales (sin IDs de Jira)
├── tests-xray/                 # Specs vinculados a Xray (con formato QT-XX)
├── .env.example                # Plantilla de variables (sin valores reales)
├── playwright.config.ts
└── tsconfig.json
```

---

## ⚙️ Instalación

```bash
# 1. Clonar
git clone https://github.com/noykita86/banca-playwright
cd Banca

# 2. Instalar dependencias
npm install

# 3. Instalar navegadores de Playwright
npx playwright install

# 4. Copiar plantilla de entorno y rellenar valores
cp .env.example .env
```

### Variables requeridas en `.env`
```env
BASE_URL=https://demo.guru99.com
TEST_USER_EMAIL=tu_correo
TEST_USER_PASSWORD=tu_password

# Credenciales para Xray (solo necesarias si reportas localmente)
XRAY_CLIENT_ID=tu_client_id
XRAY_CLIENT_SECRET=tu_client_secret
XRAY_PROJECT_KEY=tu_proyect_id
```

---

## ▶️ Ejecución Local

```bash
npm test              # Todos los tests en headless
npm run test:smoke    # Solo tests críticos (@smoke)
npm run test:headed   # Con navegador visible
npm run test:ui       # Modo interactivo UI
npm run test:debug    # Inspector paso a paso
npm run report        # Abrir reporte HTML del último run
```

---

## 🔗 Integración Continua (CI/CD) y Xray

Este proyecto implementa un flujo profesional de **Shift-Left Testing** y trazabilidad total.

### 1. Estrategia de Pipeline (Fail-Fast)
El archivo `.github/workflows/playwright.yml` se dispara en cada `push` o `pull_request`. Sigue una estrategia de dos pasos:
1. **Smoke Tests (`@smoke`)**: Se ejecutan primero. Si fallan, el pipeline se detiene (Fail-Fast) para no hacer esperar al equipo.
2. **Suite Completa**: Si los smoke pasan, se ejecutan los 42 tests restantes.

### 2. Integración con Jira/Xray (`playwright-xray`)
Utilizamos el reportero `playwright-xray` para enviar los resultados (PASS/FAIL) directamente a Jira mediante la API de Xray Cloud.
* Los tests en `tests-xray/` tienen el prefijo `QT-XX | ` (Ej: `QT-14 | registra un nuevo cliente`). Este prefijo vincula el código con el ticket de Jira.
* Cada ejecución de GitHub Actions crea un ticket de **Test Execution** automáticamente en Jira, actualizando el estado del **Test Plan** maestro.
* **Seguridad**: Las credenciales de Xray se inyectan de forma segura en el pipeline usando **GitHub Secrets** (`XRAY_CLIENT_ID`, `XRAY_CLIENT_SECRET`).

---

## 🏛️ Arquitectura

### 1. Page Object Model (POM)
Cada página del banco tiene su clase en `pages/` que encapsula:
- Locators (`getByRole`, `getByLabel`, CSS).
- Acciones (`fillForm`, `submit`).
- Aserciones (`expectSuccess`, `expectNotSuccess`).

Los tests **no tocan selectores directamente**; siempre pasan por el Page Object.

### 2. Fixtures en capas
| Fixture             | Scope      | Qué hace |
| :--- | :--- | :--- | 
| `base.fixture.ts`   | automático | Bloquea terceros (analytics/ads) y acepta `dialog`s nativos |
| `auth.fixture.ts`   | por test   | Reutiliza sesión autenticada vía `storageState` |

Cualquier test que necesite `page` (sin login) importa de `base.fixture`. Los que requieren sesión, de `auth.fixture`.

### 3. Gestión de sesión con `storageState`
El fixture `auth.fixture` **hace login una sola vez** y guarda el estado en `.auth/manager.json`. Los tests reutilizan esa sesión, evitando repetir el login en cada caso.

**Patrón aplicable a entornos con MFA/OTP:** el bloque de login del fixture es el punto donde se insertaría la obtención dinámica del OTP (vía API, TOTP o servicio de test), tal como se hace en aplicaciones bancarias reales.

> ℹ️ **Nota:** el archivo `.auth/` está en `.gitignore` porque contiene cookies y tokens de sesión. Nunca debe subirse al repositorio.

### 4. Datos de prueba
- **Factory con overrides:** `buildValidCustomer()` genera datos válidos por defecto; cada test sobreescribe **solo el campo que está probando**.
- **Email único por corrida:** evita colisiones con registros previos del demo.
- **Variables de entorno:** cuentas y credenciales fuera del código.

---

## 🛡️ Estrategias anti-flakiness

| Estrategia              | Implementación |
| :--- | :--- |
| Timeouts centralizados  | `playwright.config.ts` (`actionTimeout`, `navigationTimeout`) |
| Retries diferenciados   | 1 en local, 2 en CI |
| Trace solo en fallo     | `trace: 'on-first-retry'` |
| Esperas semánticas      | `expect(...).toBeVisible()` con auto-retry |
| Sin `waitForTimeout`    | Todas las esperas son por condición, no por tiempo |
| Bloqueo de terceros     | Dominios de analytics/ads bloqueados en `base.fixture` |

---

## ⚠️ Limitaciones del demo Guru99

Guru99 es un demo **incompleto a propósito**, y algunas funcionalidades fallan por bugs del propio sitio:

| Módulo          | Estado      | Motivo |
| :--- | :--- | :--- |
| Login           | ✅ OK       | Funciona correctamente |
| New Customer    | ✅ OK       | Validaciones y creación funcionan |
| New Account     | ⚠️ Parcial  | Algunos flujos dependen de cuentas inexistentes |
| Fund Transfer   | ⚠️ Parcial  | Depende del estado del backend |
| Balance Enquiry | ❌ Roto     | El sitio devuelve **error 500** al consultar cuentas reales |

Los tests afectados están marcados con `test.fixme` y documentados con un `// TODO` explicando la causa.

> 📌 **Buena práctica aplicada:** documentar el bug con `test.fixme` en lugar de borrar el test o dejarlo fallando, preservando así la trazabilidad cuando el sitio se arregle.

---

## 🔐 Flujos avanzados (entorno bancario)

### Mocking de MFA/OTP
El spec `tests/mfa-mock.spec.ts` demuestra **cómo se prueba un flujo de MFA/OTP sin depender del backend real**, usando `page.route()` para interceptar y simular las respuestas de la API.

**Casos cubiertos:**
| Caso                      | Resultado esperado |
| :--- | :--- |
| OTP correcto (`123456`)   | Sesión establecida (200 + token) |
| OTP incorrecto (`000000`) | Rechazo (401 + `INVALID_OTP`) |

> 📌 En un banco real, el OTP se obtendría dinámicamente desde una API de test, un servicio TOTP o un mock del proveedor MFA. El fixture `auth.fixture.ts` es el punto exacto donde se insertaría esa lógica.

### API Testing con `APIRequestContext`
El spec `tests/api-demo.spec.ts` demuestra el uso del fixture `request` de Playwright para **validar contratos de API sin abrir navegador**.

**Cubre:**
- `GET` con validación de status + contrato del body (`toMatchObject`).
- `POST` con verificación de creación (`201` + recurso con id).
- Manejo de errores (`404`).
- **Patrón híbrido:** crear recurso vía API → validar en UI → borrar vía API (teardown).

> 📌 Este patrón es el estándar en empresas con QA maduro: *"arrange via API, act via UI, assert via UI/API"*. Reduce el tiempo de setup y evita dependencias entre tests de UI.

### Aplicación en banca real

| Escenario                       | Cómo se probaría |
| :--- | :--- |
| Login con MFA/OTP               | Mocking con `page.route` + TOTP real en CI |
| Transferencia entre cuentas     | Setup vía API, UI para la acción, API para validar saldo |
| Consulta de saldo               | API para verificar + UI para validar renderizado |
| Alta de cliente                 | API para crear, UI para validar el formulario, API para cleanup |

---

## 🗺️ Roadmap

- [x] Mocking de backend con `page.route()` para simular MFA/OTP.
- [x] API testing con `APIRequestContext` de Playwright.
- [x] Integración CI/CD (GitHub Actions) con ejecución de Smoke Tests.
- [x] Integración con Jira/Xray para reporte automático de resultados.
- [ ] Migrar a un demo más completo (**ParaBank**) para cubrir flujos reales completos.
- [ ] Visual regression testing con snapshots.
- [ ] Pruebas de rendimiento básicas con `k6` o `Artillery`.

---

## 🧠 Decisiones técnicas destacadas

| Decisión                                             | Motivo |
| :--- | :--- |
| `Locator` en vez de `ElementHandle`                  | Auto-waiting, retries y API moderna |
| Fixtures en lugar de `beforeEach`                    | Composición, reuso y aislamiento |
| `storageState` en vez de login por test              | Velocidad + patrón real bancario |
| Factory con overrides | Tests legibles y mantenibles |
| Variables en `.env` y GitHub Secrets                 | Seguridad + portabilidad entre entornos |
| `test.fixme` para bugs externos                      | No ensucia la suite y documenta |
| Reportero `playwright-xray`                          | Trazabilidad directa sin scripts manuales |

---

## 👤 Autor

**Noyka Sierra**  
QA Automation Engineer

*   **Repositorio del Proyecto:** [github.com/noykita86/banca-playwright](https://github.com/noykita86/banca-playwright)
*   **Gestión de Pruebas (Jira/Xray):** [qa-noyka.atlassian.net](https://qa-noyka.atlassian.net)