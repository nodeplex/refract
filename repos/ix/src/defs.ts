import React from "react";
import rx from "@rflect/rx";

export interface AnyFC {
    (props?: any, ...args: any): React.ReactElement | null;
}

export interface VisualRoot {
    Stem(): React.ReactElement | null;
}

export type Visuals<T> = VisualRoot & {
    [K in keyof T]: T[K] extends rx.AnyFunction ? AnyFC : any;
};

export interface Collection<P extends [any, any]> {
    entries(): IterableIterator<P>;
}

export type Key<T extends Collection<any>> = T extends Collection<[infer R, any]> ? R : never;
export type Item<T extends Collection<any>> = T extends Collection<[any, infer R]> ? R : never;
export type Items<T extends Collection<any>> = Collection<[Key<T>, Item<T>]>;

export type Binding<T extends Collection<any>> = [Item<T>, T, Key<T>];

export default undefined;
