import slotPanelStyle from './slot-panel.css?inline';

export const meta = { style: [{ content: slotPanelStyle }] };

export default function SlotPanel() {
  return (
    <article className="slot-panel" part="panel">
      <header className="slot-panel__header">
        <slot name="title">
          <strong className="slot-panel__fallback">Fallback title</strong>
        </slot>
      </header>
      <div className="slot-panel__body">
        <slot>
          <span className="slot-panel__fallback">Fallback content</span>
        </slot>
      </div>
      <footer className="slot-panel__footer">
        <slot name="actions">
          <span className="slot-panel__fallback">Fallback action</span>
        </slot>
      </footer>
    </article>
  );
}
