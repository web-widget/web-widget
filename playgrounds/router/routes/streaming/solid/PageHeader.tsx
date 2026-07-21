/** @jsxImportSource solid-js */
import type { JSX } from 'solid-js';

export default function PageHeader(props: {
  title: string;
  description?: string;
  children?: JSX.Element;
}) {
  return (
    <header class="ds-page-header">
      <h1>{props.title}</h1>
      {props.description && <p class="ds-description">{props.description}</p>}
      {props.children}
    </header>
  );
}
