import { createApp } from './app.js';
import { createDb } from './db/client.js';
import { loadEnv } from './env.js';

// Local dev entry. Loads .env if present; Vercel injects env vars itself.
try {
  process.loadEnvFile();
} catch {
  // No .env file: fall back to defaults in env.ts.
}

const env = loadEnv();
const db = await createDb(env.databaseUrl, env.databaseAuthToken);
createApp({ db, authSecret: env.authSecret }).listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
