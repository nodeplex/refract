import React, { useRef, useContext } from "react";
import rx from "@oasix/rx";

import { Collection, Visual, VisualProps } from "./defs";
import { useJournal } from "./Hooks";

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
        const { children } = node.props as React.PropsWithChildren<{}>;
        return React.cloneElement(node, undefined, derive(children));
    }

    return node;
}

export interface PresenterProps<T> {
    context: React.Context<[T, Collection<T>]>;
    items: Collection<T>;
    children?: React.ReactNode;
}

export function Presenter<T>(props: PresenterProps<T>) {
    useJournal();

    const { context, items, children } = props;
    const results = [] as React.ReactNode[];
    for (const [key, item] of marshal(items)) {
        const visual = derive(children);
        results.push(<context.Provider value={[item, items]} children={visual} />);
    }
    
    return <React.Fragment children={results} />
}

export interface VisualRef<F extends any[] = any, T extends Visual = any> {
    context: React.Context<F>;
    visual: T;

    ref?: Pick<VisualProps<T>, "ref">;
    key?: number | string;
    children?: React.ReactNode;
}

export type Extension<F extends any[], R> = ((...args: F) => R) | (R extends rx.AnyFunction ? never : R);

export type ExtensionProps<F extends any[], P> = {
    [K in keyof P]: Extension<F, P[K]>;
};

export type VisualRefProps<F extends any[], T extends Visual> = ExtensionProps<F, Omit<VisualProps<T>, keyof VisualRef>>;

export type BinderProps<F extends any[], T extends Visual> = VisualRef<F, T> & VisualRefProps<F, T>;

export function Binder<F extends any[], T extends Visual>(props: BinderProps<F, T>) {
    const { key, context, visual, children, ...rest } = props;
    const next = { children } as VisualProps<T>;
    const args = useContext(context);
    for (const [key, value] of Object.entries(rest)) {
        if (typeof value === "function") {
            next[key] = value.bind(undefined, args);
        } else {
            next[key] = value;
        }
    }

    return React.createElement(visual, next);
}

export function bindItem<T>(defaultValue: T) {
    const ref = useRef<React.Context<[T, Collection<T>]>>();
    const { current } = ref;
    if (current === undefined) {
        const empty = [] as Collection<T>;
        return ref.current = React.createContext([defaultValue, empty]);
    }

    return current;
}

export function bindVisual<F extends any[], T extends Visual>(context: React.Context<F>, visual: T, props: VisualRefProps<F, T>): BinderProps<F, T> {
    return {
        ...props,
        context,
        visual,
    };
}
