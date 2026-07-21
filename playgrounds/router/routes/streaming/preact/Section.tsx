/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';

export default function Section(props: {
  title: string;
  description?: string;
  children: ComponentChildren;
}) {
  return (
    <section class="ds-section">
      <h2>{props.title}</h2>
      {props.description && <p class="ds-description">{props.description}</p>}
      {props.children}
    </section>
  );
}
