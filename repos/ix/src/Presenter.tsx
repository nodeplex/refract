import React, { createContext } from "react";
import rx from "@rflect/rx";

import { Collection, Visual, VisualProps } from "./defs";
import { useTopics, memo } from "./Hooks";

function marshal<T, K>(items: Collection<T, K>) {
    const map = new Map<string, [T, K]>();
    if (items === undefined) {
        return map;
    }

    let seq = 0;
    function add(key: K, value: T) {
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

export interface PresenterProps<T, K> {
    context: React.Context<[T, Collection<T, K>, K]>;
    items: Collection<T, K>;
    children?: React.ReactNode;
}

export const Presenter = memo(function <T, K>(props: PresenterProps<T, K>) {
    const { context, items, children } = props;
    useTopics(items);

    if (typeof items !== "object" || items === null) {
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
});

const dummy = Object.freeze([
    Object.freeze({}),
    Object.freeze([]),
    undefined
]) as [any, Collection<any>, any];

export function createItemContext<T, K = any>() {
    return React.createContext<[T, Collection<T, K>, K]>(dummy);
}
