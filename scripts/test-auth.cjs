const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const auth = require('../src/lib/auth.ts');
const { SignJWT } = require('jose');
process.env.AUTH_SECRET = 'test-secret-only-32-characters-minimum';
const key = new TextEncoder().encode(process.env.AUTH_SECRET);
const sign = (claims, expiry = '1h') => new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setSubject('google-user')
  .setIssuer('parami').setAudience('parami-admin').setIssuedAt().setExpirationTime(expiry).sign(key);

test('signed admin session works; modified, expired, and legacy sessions fail', async () => {
  const token = await auth.createAdminSessionToken('VIB', 'google-user');
  assert.equal(await auth.verifyAdminSessionToken(token), 'VIB');
  assert.equal(await auth.verifyAdminSessionToken('x' + token), null);
  assert.equal(await auth.verifyAdminSessionToken('VIB.legacy-signature'), null);
  assert.equal(await auth.verifyAdminSessionToken(await sign({ workspace: 'VIB', email: 'fchienvuhoang@gmail.com' }, '-1s')), null);
  assert.equal(await auth.verifyAdminSessionToken(await sign({ workspace: 'VIB', email: 'other@gmail.com' })), null);
  assert.equal(await auth.verifyAdminSessionToken(await sign({ workspace: 'OTHER', email: 'fchienvuhoang@gmail.com' })), null);
});
test('redirects stay on this site and avoid authentication loops', () => {
  for (const path of ['//evil.test', '/\\evil.test', 'https://evil.test', '/\nevil.test', '/dang-nhap', '/api/auth/google']) {
    assert.equal(auth.safeRedirectPath(path), '/');
  }
  assert.equal(auth.safeRedirectPath('/?tab=transactions'), '/?tab=transactions');
});
test('API requests require a valid cookie and reject malformed encoding', async () => {
  await assert.rejects(auth.getWorkspaceFromRequest(new Request('https://example.test')));
  await assert.rejects(auth.getWorkspaceFromRequest(new Request('https://example.test', { headers: { cookie: `${auth.ADMIN_SESSION_COOKIE}=%ZZ` } })));
  const token = await auth.createAdminSessionToken('VIB', 'google-user');
  assert.equal(await auth.getWorkspaceFromRequest(new Request('https://example.test', { headers: { cookie: `${auth.ADMIN_SESSION_COOKIE}=${token}` } })), 'VIB');
});
