import type { CustomerData } from '../pages/NewCustomerPage';

/**
 * Genera un email unico y corto.
 * Guru99 limita el campo E-mail a 30 caracteres (maxlength oculto),
 * por eso usamos base36 del timestamp en lugar de milisegundos directos.
 */
export function uniqueEmail(): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  return `qa${ts}${rnd}@example.com`;
}

/**
 * Devuelve datos validos frescos del cliente.
 * Llamar una vez por test. Acepta overrides para invalidar campos puntuales.
 */
export function buildValidCustomer(
  overrides: Partial<CustomerData> = {}
): CustomerData {
  return {
    name: 'Test User',
    dateOfBirth: '1990-01-01',
    address: 'Calle Falsa 123',
    city: 'Madrid',
    state: 'Madrid',
    pin: '280001',
    mobile: '6001234567',
    email: uniqueEmail(),
    password: 'TestPass123',
    ...overrides,
  };
}