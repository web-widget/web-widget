/**
 * Metadata type definitions.
 *
 * This module defines the types for HTML document metadata, including
 * title, description, links, scripts, styles, and other head elements.
 * These types are used to manage the HTML head content dynamically
 * based on the current route or component context.
 *
 * @module Metadata Types
 */

/**
 * Represents metadata for an HTML document.
 * This interface defines all the metadata that can be set for a page,
 * including title, description, links, scripts, styles, and other HTML head elements.
 */
export interface Meta {
  /**
   * The base URL of the document.
   * [MDN Reference](https://developer.mozilla.org/docs/Web/HTML/Element/base)
   */
  base?: BaseDescriptor;

  /** Description of the document. */
  description?: string;

  /** Document Keywords. */
  keywords?: string;

  /** Document language. */
  lang?: string;

  /**
   * Document links.
   * [MDN Reference](https://developer.mozilla.org/docs/Web/HTML/Element/link)
   */
  link?: LinkDescriptor[];

  /**
   * Document metadata.
   * [MDN Reference](https://developer.mozilla.org/docs/Web/HTML/Element/meta)
   */
  meta?: MetaDescriptor[];

  /**
   * Document scripts.
   * [MDN Reference](https://developer.mozilla.org/docs/Web/HTML/Element/script)
   */
  script?: ScriptDescriptor[];

  /**
   * Document styles.
   * [MDN Reference](https://developer.mozilla.org/docs/Web/HTML/Element/style)
   */
  style?: StyleDescriptor[];

  /** Document title. */
  title?: string;
}

/**
 * Base interface for HTML element descriptors.
 * Provides common properties that can be applied to any HTML element.
 */
export interface ElementDescriptor {
  /** The ID of the element. */
  id?: string;

  /** The cryptographic nonce used for inline scripts. */
  nonce?: string;

  /** The title of the element. */
  title?: string;

  /** Custom data attributes. */
  [key: `data-${string}`]: string | undefined;
}

/**
 * Descriptor for HTML base elements.
 * Used to set the base URL for relative links in the document.
 */
export interface BaseDescriptor extends ElementDescriptor {
  /** The URL of the linked resource. */
  href?: string;

  /** The browsing context for the hyperlink. */
  target?: string;
}

/**
 * Descriptor for HTML link elements.
 * Used to define relationships with external resources like stylesheets, icons, etc.
 */
export interface LinkDescriptor extends ElementDescriptor {
  /** The destination for the link. */
  as?: string;

  /** The CORS setting for the link. */
  crossorigin?: string;

  /** Whether the link is disabled. */
  disabled?: string;

  /** The fetch priority for the link. */
  fetchpriority?: 'high' | 'low' | 'auto';

  /** The URL of the linked resource. */
  href?: string;

  /** The language of the linked resource. */
  hreflang?: string;

  /** The sizes of the images for different viewport sizes. */
  imagesizes?: string;

  /** The source set for responsive images. */
  imagesrcset?: string;

  /** The integrity metadata for the link. */
  integrity?: string;

  /** The media attribute for the link. */
  media?: string;

  /** The referrer policy for the link. */
  referrerpolicy?: string;

  /** The relationship between the current document and the linked resource. */
  rel?: string;

  /** The MIME type of the linked resource. */
  type?: string;
}

/**
 * Descriptor for HTML meta elements.
 * Used to provide metadata about the HTML document.
 */
export interface MetaDescriptor extends ElementDescriptor {
  /** The character encoding for the HTML document. */
  charset?: string;

  /** The value of the meta element. */
  content?: string;

  /** The pragma directive for the meta element. */
  'http-equiv'?: string;

  /** The media attribute for the meta element. */
  media?: string;

  /** The name of the meta element. */
  name?: string;

  /** The property attribute for the meta element. */
  property?: string;
}

/**
 * Descriptor for HTML script elements.
 * Used to include JavaScript code in the document.
 */
export interface ScriptDescriptor extends ElementDescriptor {
  /** Whether the script should be executed asynchronously. */
  async?: string;

  /** The value of the script element. */
  content?: string;

  /** The CORS setting for the script. */
  crossorigin?: string;

  /** Whether the script should be executed after the document has been parsed. */
  defer?: string;

  /** The fetch priority for the script. */
  fetchpriority?: 'high' | 'low' | 'auto';

  /** The integrity metadata for the script. */
  integrity?: string;

  /** Whether the script should not be executed in modules. */
  nomodule?: string;

  /** The referrer policy for the script. */
  referrerpolicy?: string;

  /** The URL of the external script. */
  src?: string;

  //  text: string;

  /** The MIME type of the script. */
  type?: string;
}

/**
 * Descriptor for HTML style elements.
 * Used to include CSS styles in the document.
 */
export interface StyleDescriptor extends ElementDescriptor {
  /** The value of the style element. */
  content?: string;

  /** Whether the style is disabled. */
  disabled?: string;

  /** The media attribute for the style element. */
  media?: string;
}

// export interface TitleDescriptor {
//   content?: string;
// }
