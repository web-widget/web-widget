import './widget-inner-lazy.css';

export default function WidgetInnerLazyChunk() {
  return (
    <div className="css-lazy-widget-inner" data-testid="widget-inner-lazy">
      Loaded inside the Widget after click — CSS comes only from this dynamic
      chunk.
    </div>
  );
}
