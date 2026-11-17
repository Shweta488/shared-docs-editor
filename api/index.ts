import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/src/app.js';
import { createDb } from '../server/src/db/client.js';
import { loadEnv } from '../server/src/env.js';

// Vercel function entry. vercel.json rewrites every /api/* path here.
// The app is built once per cold start and reused across requests.
const env = loadEnv();
const appPromise = createDb(env.databaseUrl, env.databaseAuthToken).then((db) => createApp({ db }));

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await appPromise;
  app(req, res);
}
