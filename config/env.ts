import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `❌ Falta la variable de entorno "${name}". ` +
      `Cópiala desde .env.example a .env`
    );
  }
  return value;
}

export const env = {
  baseUrl: required('BASE_URL'),
  user: {
    email: required('TEST_USER_EMAIL'),
    password: required('TEST_USER_PASSWORD'),
  },
} as const;