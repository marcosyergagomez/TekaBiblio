import { readFileSync } from 'node:fs';

const filePath = new URL('../../apps/web/nginx.conf', import.meta.url);
const nginxConf = readFileSync(filePath, 'utf8');

const requiredHeaders = [
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Content-Security-Policy',
];

for (const header of requiredHeaders) {
  if (!nginxConf.includes(header)) {
    throw new Error(`Missing required security header: ${header}`);
  }
}

const requiredCspDirectives = [
  "default-src 'self'",
  "script-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

for (const directive of requiredCspDirectives) {
  if (!nginxConf.includes(directive)) {
    throw new Error(`Missing required CSP directive: ${directive}`);
  }
}

console.log('CSP and security headers check passed.');
