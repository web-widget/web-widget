import { ReactNode, createContext, useContext } from "react";

export interface HeadProps {
  children: ReactNode;
}

export const HEAD_CONTEXT = createContext<ReactNode[]>([]);

export function Head(props: HeadProps) {
  let context: ReactNode[];
  try {
    context = useContext(HEAD_CONTEXT);
  } catch (err) {
    throw new Error(
      "<Head> component is not supported in the browser, or during suspense renders.",
      // @ts-ignore
      { cause: err }
    );
  }
  context.push(props.children);
  return null;
}
