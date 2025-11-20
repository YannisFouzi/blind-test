import type * as React from "react";

declare global {
  namespace JSX {
    type Element = React.ReactElement<unknown, string | React.JSXElementConstructor<unknown>>;
    interface ElementClass extends React.Component<any, any> {
      render(): React.ReactNode;
    }
    interface ElementAttributesProperty {
      props: Record<string, unknown>;
    }
    interface ElementChildrenAttribute {
      children?: React.ReactNode;
    }
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
    interface IntrinsicClassAttributes<T> extends React.JSX.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}

export {};
