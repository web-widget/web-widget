/** @jsxImportSource solid-js */
import type { JSX } from 'solid-js';

export default function Section(props: {
  title: string;
  description?: string;
  children: JSX.Element;
}) {
  return (
    <section class="ds-section">
      <h2>{props.title}</h2>
      {props.description && <p class="ds-description">{props.description}</p>}
      {props.children}
    </section>
  );
}
