# 🏦 Banca — QA Automation con Playwright + TypeScript

Framework de pruebas automatizadas end-to-end sobre el demo bancario **Guru99 Bank (V4)**, construido con Playwright, TypeScript y Page Object Model.

---

## 🚀 Stack

| Herramienta | Versión | Uso |
| :--- | :--- | :--- |
| [Playwright](https://playwright.dev/) | ^1.63 | Motor de automatización |
| TypeScript | ^7.0 | Tipado estricto |
| Node.js | ≥18 | Runtime |
| dotenv | ^18.0 | Gestión de variables de entorno |

---

## 📁 Estructura del proyecto

```
Banca/
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
├── tests/                      # Specs por módulo funcional
│   ├── login.spec.ts
│   ├── create-customer.spec.ts
│   ├── customer-validation.spec.ts
│   ├── new-account.spec.ts
│   ├── fund-transfer.spec.ts
│   └── balance-enquiry.spec.ts
├── .env.example                # Plantilla de variables (sin valores reales)
├── playwright.config.ts
└── tsconfig.json
```

---

## ⚙️ Instalación

```bash
# 1. Clonar
git clone <https://github.com/noykita86/banca-playwright>
cd Banca

# 2. Instalar dependencias
npm install

# 3. Instalar navegadores de Playwright
npx playwright install

# 4. Copiar plantilla de entorno y rellenar valores
cp .env.example .env
```

### Variables requeridas en `.env`

```
BASE_URL=https://demo.guru99.com
TEST_USER_EMAIL=tu_correo
TEST_USER_PASSWORD=tu_password
TEST_PAYER_ACCOUNT=185638
TEST_PAYEE_ACCOUNT=185637
TEST_EXISTING_ACCOUNT=185637
TEST_CUSTOMER_ID=97904
```

---

## ▶️ Ejecución

```bash
npm test              # Todos los tests en headless
npm run test:headed   # Con navegador visible
npm run test:ui       # Modo interactivo UI
npm run test:debug    # Inspector paso a paso
npm run report        # Abrir reporte HTML del último run
```

---

## 🏛️ Arquitectura

### 1. Page Object Model (POM)
Cada página del banco tiene su clase en `pages/` que encapsula:
- Locators (`getByRole`, `getByLabel`, CSS).
- Acciones (`fillForm`, `submit`).
- Aserciones (`expectSuccess`, `expectNotSuccess`).

Los tests **no tocan selectores directamente**; siempre pasan por el Page Object.

### 2. Fixtures en capas

| Fixture | Scope | Qué hace |
| :--- | :--- | :--- |
| `base.fixture.ts` | automático | Bloquea terceros (analytics/ads) y acepta `dialog`s nativos |
| `auth.fixture.ts` | por test | Reutiliza sesión autenticada vía `storageState` |

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

| Estrategia | Implementación |
| :--- | :--- |
| Timeouts centralizados | `playwright.config.ts` (`actionTimeout`, `navigationTimeout`) |
| Retries diferenciados | 1 en local, 2 en CI |
| Trace solo en fallo | `trace: 'on-first-retry'` |
| Esperas semánticas | `expect(...).toBeVisible()` con auto-retry |
| Sin `waitForTimeout` | Todas las esperas son por condición, no por tiempo |
| Bloqueo de terceros | Dominios de analytics/ads bloqueados en `base.fixture` |

---

## ⚠️ Limitaciones del demo Guru99

Guru99 es un demo **incompleto a propósito**, y algunas funcionalidades fallan por bugs del propio sitio:

| Módulo | Estado | Motivo |
| :--- | :--- | :--- |
| Login | ✅ OK | Funciona correctamente |
| New Customer | ✅ OK | Validaciones y creación funcionan |
| New Account | ⚠️ Parcial | Algunos flujos dependen de cuentas inexistentes |
| Fund Transfer | ⚠️ Parcial | Depende del estado del backend |
| Balance Enquiry | ❌ Roto | El sitio devuelve **error 500** al consultar cuentas reales |

Los tests afectados están marcados con `test.fixme` y documentados con un `// TODO` explicando la causa.

> 📌 **Buena práctica aplicada:** documentar el bug con `test.fixme` en lugar de borrar el test o dejarlo fallando, preservando así la trazabilidad cuando el sitio se arregle.

---

## 🗺️ Roadmap

## 🔐 Flujos avanzados (entorno bancario)

### Mocking de MFA/OTP

El spec `tests/mfa-mock.spec.ts` demuestra **cómo se prueba un flujo de MFA/OTP sin depender del backend real**, usando `page.route()` para interceptar y simular las respuestas de la API.

**Patrón aplicado:**

1. El navegador abre la página de login.
2. `page.route('**/api/login')` intercepta la petición y devuelve `MFA_REQUIRED`.
3. El navegador abre el formulario de OTP.
4. `page.route('**/api/otp/verify')` intercepta la verificación y devuelve `OK` + token.
5. El navegador navega al dashboard.

**Casos cubiertos:**

| Caso | Resultado esperado |
| :--- | :--- |
| OTP correcto (`123456`) | Sesión establecida (200 + token) |
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

| Escenario | Cómo se probaría |
| :--- | :--- |
| Login con MFA/OTP | Mocking con `page.route` + TOTP real en CI |
| Transferencia entre cuentas | Setup vía API, UI para la acción, API para validar saldo |
| Consulta de saldo | API para verificar + UI para validar renderizado |
| Alta de cliente | API para crear, UI para validar el formulario, API para cleanup |
| Cierre de sesión por inactividad | `storageState` con timeout simulado |

---

## 🔐 Flujos avanzados (entorno bancario)

### Mocking de MFA/OTP

El spec `tests/mfa-mock.spec.ts` demuestra **cómo se prueba un flujo de MFA/OTP sin depender del backend real**, usando `page.route()` para interceptar y simular las respuestas de la API.

**Patrón aplicado:**

1. El navegador abre la página de login.
2. `page.route('**/api/login')` intercepta la petición y devuelve `MFA_REQUIRED`.
3. El navegador abre el formulario de OTP.
4. `page.route('**/api/otp/verify')` intercepta la verificación y devuelve `OK` + token.
5. El navegador navega al dashboard.

**Casos cubiertos:**

| Caso | Resultado esperado |
| :--- | :--- |
| OTP correcto (`123456`) | Sesión establecida (200 + token) |
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

| Escenario | Cómo se probaría |
| :--- | :--- |
| Login con MFA/OTP | Mocking con `page.route` + TOTP real en CI |
| Transferencia entre cuentas | Setup vía API, UI para la acción, API para validar saldo |
| Consulta de saldo | API para verificar + UI para validar renderizado |
| Alta de cliente | API para crear, UI para validar el formulario, API para cleanup |
| Cierre de sesión por inactividad | `storageState` con timeout simulado |

---

## 🗺️ Roadmap

- [x] Mocking de backend con `page.route()` para simular MFA/OTP.
- [x] API testing con `APIRequestContext` de Playwright.
- [ ] Migrar a un demo más completo (**ParaBank**) para cubrir flujos reales completos.
- [ ] Integración CI/CD (GitHub Actions) con publicación de reportes.
- [ ] Visual regression testing con snapshots.
- [ ] Pruebas de rendimiento básicas con `k6` o `Artillery`.

---

## 🧠 Decisiones técnicas destacadas

| Decisión | Motivo |
| :--- | :--- |
| `Locator` en vez de `ElementHandle` | Auto-waiting, retries y API moderna |
| Fixtures en lugar de `beforeEach` | Composición, reuso y aislamiento |
| `storageState` en vez de login por test | Velocidad + patrón real bancario |
| Factory con overrides | Tests legibles y mantenibles |
| Variables en `.env` | Seguridad + portabilidad entre entornos |
| `test.fixme` para bugs externos | No ensucia la suite y documenta |

---

## 👤 Autor

**[Noyka Sierra]**
QA Automation Engineer
https://github.com/noykita86