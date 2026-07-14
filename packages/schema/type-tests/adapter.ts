import type { ExtractComponentProps, ExtractWidgetProps } from '../schema';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

type Props = { count?: number };

type FunctionComponent = (props: Props) => unknown;
type PreactComponent = (props: Props, context?: any) => unknown;
type SvelteComponent = (
  internals: { readonly __svelte: unique symbol },
  props: Props
) => unknown;
type VueComponent = new () => { $props: Props };

export type FunctionComponentTest = Expect<
  Equal<ExtractComponentProps<FunctionComponent>, Props>
>;
export type PreactComponentTest = Expect<
  Equal<ExtractComponentProps<PreactComponent>, Props>
>;
export type SvelteComponentTest = Expect<
  Equal<ExtractComponentProps<SvelteComponent>, Props>
>;
export type VueComponentTest = Expect<
  Equal<ExtractComponentProps<VueComponent>, Props>
>;
export type WidgetModuleTest = Expect<
  Equal<ExtractWidgetProps<{ default: FunctionComponent }>, Props>
>;

// Classes without a public props contract must use container<Props>().
export type CustomElementTest = Expect<
  Equal<ExtractComponentProps<typeof HTMLElement>, unknown>
>;
