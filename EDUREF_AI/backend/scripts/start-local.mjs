import 'dotenv/config';
import crypto from 'node:crypto';
import { isInsecureJwtSecret } from '../config/jwtSecret.js';

process.env.NODE_ENV = 'production';
process.env.PORT ||= '5000';
process.env.FRONTEND_URL = [process.env.FRONTEND_URL, 'http://localhost:8080', 'http://127.0.0.1:8080'].filter(Boolean).join(',');
if (isInsecureJwtSecret(process.env.JWT_SECRET)) {
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.log('Using a generated signing key for this local session. The .env file is unchanged.');
}
await import('../server.js');
