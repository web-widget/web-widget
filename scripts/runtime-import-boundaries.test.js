import assert from 'node:assert/strict';
import test from 'node:test';
import { ESLint } from 'eslint';

const eslint = new ESLint();
const clientFilePath = 'packages/example/src/adapter.client.ts';

async function lintClient(code) {
  const [result] = await eslint.lintText(code, { filePath: clientFilePath });
  return result.messages.filter(
    ({ ruleId }) => ruleId === 'no-restricted-imports'
  );
}

test('client runtime files reject Node.js built-ins', async () => {
  const messages = await lintClient("import fs from 'node:fs';\nvoid fs;");
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /must use Web APIs/);
});

test('client runtime files reject the Node.js adapter', async () => {
  const messages = await lintClient(
    "import adapter from '@web-widget/node';\nvoid adapter;"
  );
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /must not depend on the Node\.js adapter/);
});

test('client runtime files allow Web APIs', async () => {
  const messages = await lintClient(
    "const request = new Request('https://example.com');\nvoid request;"
  );
  assert.deepEqual(messages, []);
});
