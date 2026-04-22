import './lazy-chunk.css';

export default function LazyCssChunk() {
  return (
    <div className="css-lazy-dynamic-box" data-testid="lazy-css-chunk">
      This box is styled by CSS that lives in the dynamic import chunk only.
    </div>
  );
}
