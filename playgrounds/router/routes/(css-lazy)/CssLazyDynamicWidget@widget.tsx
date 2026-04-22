import { useCallback, useState, type ComponentType } from 'react';

export default function CssLazyDynamicWidget() {
  const [Inner, setInner] = useState<ComponentType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const mod = await import('./WidgetInnerLazyChunk');
      setInner(() => mod.default);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="css-lazy-widget-root">
      <h2>Widget: click → dynamic import + CSS</h2>
      <p>
        This block is a <code>@widget</code> module (SSR/client boundary). For
        widget meta, dynamic-chunk CSS is omitted from head by default — search
        page source for <code>widget-inner-lazy</code> before clicking; after
        load, Vite injects styles.
      </p>
      {!Inner ? (
        <button type="button" onClick={handleClick} disabled={loading}>
          {loading ? 'Loading…' : 'Load styled chunk inside widget'}
        </button>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {Inner ? <Inner /> : null}
    </section>
  );
}
