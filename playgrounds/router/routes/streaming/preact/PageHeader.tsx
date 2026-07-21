/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';

export default function PageHeader(props: {
  title: string;
  description?: string;
  children?: ComponentChildren;
}) {
  return (
    <header class="ds-page-header">
      <h1>{props.title}</h1>
      {props.description && <p class="ds-description">{props.description}</p>}
      {props.children}
    </header>
  );
}
