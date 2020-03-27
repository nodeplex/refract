import React from "react";

export type Visual = keyof React.ReactDOM | React.JSXElementConstructor<any>;
export type ComponentProps<T extends Visual> = T extends React.JSXElementConstructor<infer P> ? Extract<P, object> : never;
export type VisualProps<T extends Visual> = ComponentProps<T extends keyof React.ReactDOM ? React.ReactDOM[T] : T>;

export interface Collection<P extends [any, any] = [any, any]> {
    entries(): IterableIterator<P>;
}

export type Item<T> = Pair<T> extends [any, infer R] ? R : never;
export type Key<T> = Pair<T> extends [infer R, any] ? R : never;
export type Pair<T> = T extends Collection<infer R> ? R : never;

export type Items<T> = Collection<[Key<T>, Item<T>]>;

export default undefined;
