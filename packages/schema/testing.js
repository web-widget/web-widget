function readStream(stream) {
  return (async () => {
    let text = '';
    const decoder = new TextDecoder();
    for await (const chunk of stream) {
      text +=
        typeof chunk === 'string'
          ? chunk
          : decoder.decode(chunk, { stream: true });
    }
    text += decoder.decode();
    return text;
  })();
}

function assertModule(expect, adapterModule) {
  expect(typeof adapterModule.render).toBe('function');
  expect(typeof adapterModule.widget).toBe('function');
}

/** Register the framework-independent adapter conformance suite. */
export function testAdapterConformance({ runner, adapter }) {
  const { describe, test, expect } = runner;

  describe(`${adapter.name} adapter conformance`, () => {
    if (adapter.server) {
      const server = adapter.server;
      describe('server', () => {
        test('exports the adapter module contract', () => {
          assertModule(expect, server.module);
        });
        test('rejects a missing component', async () => {
          await expect(
            Promise.resolve().then(() =>
              server.module.render(undefined, server.data, {
                progressive: false,
              })
            )
          ).rejects.toThrow(TypeError);
        });
        test('renders data in buffered mode', async () => {
          const result = await server.module.render(
            server.component,
            server.data,
            { progressive: false }
          );
          expect(typeof result).toBe('string');
          await server.assertRendered(result, {
            progressive: false,
            text: result,
          });
        });
        test('accepts null data', async () => {
          await server.module.render(server.component, null, {
            progressive: false,
          });
        });
        test('honors its progressive rendering capability', async () => {
          const result = await server.module.render(
            server.component,
            server.data,
            { progressive: true }
          );
          if (server.progressive === 'stream') {
            expect(result).toBeInstanceOf(ReadableStream);
          } else {
            expect(typeof result).toBe('string');
          }
          const text =
            typeof result === 'string' ? result : await readStream(result);
          if (server.progressive === 'none') expect(text).toBe('');
          await server.assertRendered(result, { progressive: true, text });
        });
        if (server.slots) {
          test('preserves native slot children in Shadow DOM', async () => {
            const text = await server.slots.render();
            const templateStart = text.indexOf(
              '<template shadowrootmode="open">'
            );
            const templateEnd = text.indexOf('</template>', templateStart);
            const shadowMarker = text.indexOf(server.slots.shadowMarker);
            const lightMarker = text.indexOf(server.slots.lightMarker);
            const hostStart = text.indexOf('<web-widget');
            const hostEnd = text.indexOf('>', hostStart);
            const hostTag = text.slice(hostStart, hostEnd + 1);

            expect(hostTag).toContain(`slot="${server.slots.hostSlot}"`);
            expect(templateStart).toBeGreaterThanOrEqual(0);
            expect(templateEnd).toBeGreaterThan(templateStart);
            expect(shadowMarker).toBeGreaterThan(templateStart);
            expect(shadowMarker).toBeLessThan(templateEnd);
            expect(lightMarker).toBeGreaterThan(templateEnd);
            expect(text).not.toContain(
              `contextdata="${server.slots.lightMarker}`
            );
            expect(hostTag).not.toContain(
              `&quot;slot&quot;:&quot;${server.slots.hostSlot}&quot;`
            );
          });
        }
        if (server.pendingBoundary) {
          test('renders the pending boundary protocol', async () => {
            const text = await server.pendingBoundary.render();
            const slotIndex = text.indexOf('slot="web-widget-pending"');
            const start = text.lastIndexOf('<', slotIndex);
            const end = text.indexOf('>', slotIndex);
            const tag = text.slice(start, end + 1);
            const compactTag = tag.replace(/\s/g, '');

            expect(tag.slice(0, 4)).toBe('<div');
            expect(start).toBeGreaterThanOrEqual(0);
            expect(tag).toContain('aria-busy="true"');
            expect(compactTag).toContain('style="display:contents');
            expect(text).toContain(server.pendingBoundary.marker);
            expect(tag).toContain('slot="web-widget-pending"');
          });
        }
      });
    }

    if (adapter.client) {
      const client = adapter.client;
      describe('client', () => {
        test('exports the adapter module contract', () => {
          assertModule(expect, client.module);
        });
        test('rejects a missing component', async () => {
          await expect(
            Promise.resolve().then(() =>
              client.module.render(undefined, client.data, {
                container: client.createContainer(),
              })
            )
          ).rejects.toThrow(TypeError);
        });
        test('rejects a missing container', async () => {
          await expect(
            Promise.resolve().then(() =>
              client.module.render(client.component, client.data, {
                container: undefined,
              })
            )
          ).rejects.toThrow();
        });
        test('mounts and unmounts', async () => {
          const container = client.createContainer();
          const lifecycle = await client.module.render(
            client.component,
            client.data,
            { container, recovering: false }
          );
          expect(typeof lifecycle?.mount).toBe('function');
          expect(typeof lifecycle?.unmount).toBe('function');
          await lifecycle.mount();
          await client.assertMounted(container);
          await lifecycle.unmount();
          await client.assertUnmounted(container);
        });
        test('accepts null data', async () => {
          const container = client.createContainer();
          const lifecycle = await client.module.render(client.component, null, {
            container,
            recovering: false,
          });
          await lifecycle.mount?.();
          await lifecycle.unmount?.();
        });
        if (client.hydration) {
          test('recovers server-rendered content', async () => {
            const container = client.createContainer();
            await client.hydration.prepare(container);
            const lifecycle = await client.module.render(
              client.component,
              client.data,
              { container, recovering: true }
            );
            await lifecycle.mount();
            await client.hydration.assertRecovered(container);
            await lifecycle.unmount?.();
          });
        }
      });
    }
  });
}
