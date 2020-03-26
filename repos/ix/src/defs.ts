import React from "react";

export type Visual = keyof React.ReactDOM | React.JSXElementConstructor<any>;
export type ComponentProps<T extends Visual> = T extends React.JSXElementConstructor<infer P> ? Extract<P, object> : never;
export type VisualProps<T extends Visual> = ComponentProps<T extends keyof React.ReactDOM ? React.ReactDOM[T] : T>;

export interface Collection<T, K = any> {
    entries(): IterableIterator<[K, T]>;
}

export default undefined;
