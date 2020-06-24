import React, { Context, ElementType, useContext } from "react";
import rx from "@rflect/rx";

import { Items, Item, Key, Binding } from "./defs";
import { useVisuals } from "./JournalerRef";

export interface BindingProps<T extends Items<T>> {
    binding: Binding<T>;
}

export interface PresenterProps<T extends Items<T>, P> {
    binding?: never;
    type: ElementType<P> | Context<Binding<T>>;
    items: T;
    children?: React.ReactNode;
}

export type Predicate<T extends Items<T>, F> = ((...binding: Binding<T>) => F) | (F extends Function ? never : F);

export type PredicateProps<T extends Items<T>, P> = {
    [K in Exclude<keyof P, keyof PresenterProps<T, P>>]: Predicate<T, P[K]>;
};

function marshal<T extends Items<T>>(items: T) {
    let seq = 0;
    const map = new Map<string, [Item<T>, Key<T>]>();
    function add(key: Key<T>, value: Item<T>) {
        const id = rx.id(value) as any;
        const str = id?.description ?? ("key." + String(key));
        if (map.has(str)) {
            map.set("seq." + seq++, [value, key]);
        } else {
            map.set(str, [value, key]);
        }
    }

    for (const [key, item] of items.entries()) {
        add(key, item);
    }

    return map;
}

const context = React.createContext([] as any[]);

export function PresenterContent(props: { children?: React.ReactNode }) {
    const [type, rest, binding] = useContext(context);
    if (type === undefined) {
        return null;
    }

    const { children } = props;
    const next: any = { binding, children };
    for (const key in rest) {
        let value = rest[key];
        if (typeof value === "function") {
            value = value.apply(undefined, binding);
        }

        next[key] = value;
    }
    
    return React.createElement(type, next);
}

export function Presenter<T extends Items<T>, P extends Partial<BindingProps<T>>>(props: PresenterProps<T, P> & PredicateProps<T, P>) {
    const vis = useVisuals(props, {
        Stem() {
            const { type, items, children, ...rest } = props;
            const frag = <React.Fragment children={children} />;
            if (typeof type === "string" || typeof type === "function") {
                const visuals = [] as React.ReactNode[];
                for (const [key, [item, k]] of marshal(items)) {
                    const jsx =
                    <context.Provider key={key} value={[type, rest, [item, items, k]]}>
                        {React.cloneElement(frag)}
                    </context.Provider>;
            
                    visuals.push(jsx);
                }
                
                return <React.Fragment children={visuals} />;
            }
       
            const visuals = [] as React.ReactNode[];
            for (const [key, [item, k]] of marshal(items)) {
                const jsx =
                <type.Provider key={key} value={[item, items, k]}>
                    {React.cloneElement(frag)}
                </type.Provider>;
        
                visuals.push(jsx);
            }

            return <React.Fragment children={visuals} />;
        }
    });
    
    return <vis.Stem />;
}

function never() {
    throw new SyntaxError("The binding was not specified through a meantingful context.")
}

const dummy = [0, 0, 0] as [any, any, any];
Object.defineProperties(dummy, {
    0: { get: never },
    1: { get: never },
    2: { get: never },
});

Object.freeze(dummy);

export function createItemsContext<T extends Items<T>>(binding: Binding<T> = dummy) {
    return React.createContext<Binding<T>>(binding);
}

export default undefined;
