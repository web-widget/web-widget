import '../(css)/ui.css';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Page header with title and optional description.
 * Every page should start with this for a consistent header structure.
 */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="ds-page-header">
      <h1>{title}</h1>
      {description && <p className="ds-description">{description}</p>}
      {children}
    </header>
  );
}

/**
 * Content section with optional title and description.
 */
export function Section({
  title,
  description,
  children,
  ...props
}: {
  title?: ReactNode;
  description?: ReactNode;
} & ComponentProps<'section'>) {
  return (
    <section className="ds-section" {...props}>
      {title && <h2>{title}</h2>}
      {description && <p className="ds-description">{description}</p>}
      {children}
    </section>
  );
}

/**
 * Card container with optional title.
 */
export function Card({
  title,
  children,
  ...props
}: { title?: ReactNode } & ComponentProps<'div'>) {
  return (
    <div className="ds-card" {...props}>
      {title && <h3 className="ds-card-title">{title}</h3>}
      <div className="ds-card-body">{children}</div>
    </div>
  );
}

/**
 * Responsive grid for laying out cards.
 */
export function CardGrid({ children, ...props }: ComponentProps<'div'>) {
  return (
    <div className="ds-card-grid" {...props}>
      {children}
    </div>
  );
}

/**
 * Styled code block wrapper.
 */
export function CodeBlock({ children, ...props }: ComponentProps<'pre'>) {
  return (
    <pre className="ds-code-block" {...props}>
      {children}
    </pre>
  );
}
