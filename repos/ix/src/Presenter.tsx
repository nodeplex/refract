import React, { useRef, useContext } from "react";
import rx from "@rflect/rx";

import { Collection, Visual, VisualProps } from "./defs";
import { useJournal, useTopics } from "./Hooks";

function marshal<T>(items: Collection<T>) {
    const map = new Map<string, T>();
    if (items === undefined) {
        return map;
    }

    let seq = 0;
    function add(key: any, value: T) {
        const id = rx.id(value);
        const str = id?.toString() ?? ("key." + String(key));
        if (map.has(str)) {
            map.set("seq." + this.seq++, value);
        } else {
            map.set(str, value);
        }
    }

    for (const [key, item] of items.entries()) {
        add(key, item);
    }

    return map;
}

function derive(node: React.ReactNode): React.ReactNode {
    if (typeof node !== "object") {
        return node;
    }

    if (Array.isArray(node)) {
        return node.map(x => derive(x));
    }

    if (React.isValidElement(node)) {
        const { type, key, props } = node;
        const { children, ...rest } = props;
        if (key !== null) {
            rest[key] = key;
        }

        return React.createElement(type, rest, derive(children));
    }

    return node;
}

export interface PresenterProps<T> {
    context: React.Context<[T, Collection<T>]>;
    items: Collection<T>;
    children?: React.ReactNode;
}

export function Text(props: { value: unknown }) {
    const { value } = props;
    return <React.Fragment children={String(value)} />;
}

export function Presenter<T>(props: PresenterProps<T>) {
    const { context, items, children } = props;
    useTopics(items);

    const results = [] as React.ReactNode[];
    for (const [key, item] of marshal(items)) {
        const jsx =
        <context.Provider key={key} value={[item, items]}>
            {derive(children)}
        </context.Provider>

        results.push(jsx);
    }
    
    return <React.Fragment children={results} />;
}

export type Merge<T, S, R extends keyof T | keyof S = keyof T | keyof S> = {
    [K in R]: K extends keyof T ? T[K] : K extends keyof S ? S[K] : never;
};

export interface BinderProps<F extends any[] = any, T extends Visual = any> {
    context: React.Context<F>;
    visual: T;
}

export type IntrinsicKeys = "context" | "visual" | "key" | "ref" | "children";

export type Extension<F extends any[], R> = ((...args: F) => R) | (R extends rx.AnyFunction ? never : R);
export type ExtensionProps<F extends any[], T extends Visual, P extends VisualProps<T> = VisualProps<T>, R extends keyof P = keyof P> = {
    [K in R]: K extends IntrinsicKeys ? P[K] : Extension<F, P[K]>;
};

export function Binder<F extends any[], T extends Visual>(props: BinderProps<F, T> & ExtensionProps<F, T>) {
    useJournal();

    const { key, ref, context, visual, children, ...rest } = props;
    const next = { ref, children } as VisualProps<T>;
    if (key !== null) {
        next.key = key;
    }

    const args = useContext(context);
    for (const [key, value] of Object.entries(rest)) {
        if (typeof value === "function") {
            next[key] = value.apply(undefined, args);
        } else if (value !== undefined) {
            next[key] = value;
        }
    }

    return React.createElement(visual, next);
}

const dummy = Object.freeze({});
const empty = Object.freeze([]);
const placeholder = Object.freeze([dummy, empty]);

export function bindItem<T>() {
    return React.createContext(placeholder as [T, Collection<T>]);
}

export function bindVisual<F extends any[], T extends Visual>(context: React.Context<F>, visual: T, props: ExtensionProps<F, T>): BinderProps<F, T> & ExtensionProps<F, T> {
    return {
        ...props,
        context,
        visual,
    };
}
