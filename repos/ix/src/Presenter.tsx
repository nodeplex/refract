import React from "react";
import rx from "@rflect/rx";

import { Item, Key, Items } from "./defs";
import { useTopics } from "./ObserverRef";
import { useAtoms } from "./atom";
import { useVisuals, useMemoVisual } from "./JournalerRef";

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

export type Binding<T extends Items<T>> = [Item<T>, T, Key<T>];

export interface PresenterProps<T extends S, S extends Items<S>> {
    context?: React.Context<Binding<S>>;
    items?: T;
    children?: React.ReactNode;
}

export function Presenter<T extends S, S extends Items<S>>(props: PresenterProps<T, S>) {
    props = useAtoms(props);

    const vis = useVisuals({
        Visual() {
            const { context, items, children } = props;
            useTopics(items);
        
            if (context === undefined) {
                return null;
            }
        
            if (items === undefined) {
                return null;
            }
        
            const frag =
            <React.Fragment children={children} />;
        
            const visuals = [] as React.ReactNode[];
            for (const [key, [item, k]] of marshal(items)) {
                const jsx =
                <context.Provider key={key} value={[item, items, k]}>
                    {React.cloneElement(frag)}
                </context.Provider>;
        
                visuals.push(jsx);
            }

            return <React.Fragment children={visuals} />;
        }
    });
    
    return useMemoVisual(vis, props);
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
