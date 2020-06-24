import rx from "@rflect/rx";
import React, { useEffect, useState, useMemo } from "react";

import { AnyFC, Visuals } from "./defs";
import { useInstance } from "./hooks";
import { useAtoms } from "./atom";

class JournalerRef {
    journal?: rx.JournalEntry[];
    marker?: number[];
    set?: (gen: symbol) => void;

    constructor(set: (gen: symbol) => void) {
        this.observe = this.observe.bind(this);
        this.effect = this.effect.bind(this);
        this.set = set;
    }

    replay(gen: symbol) {
        if (this.journal === undefined) {
            return false;
        }

        if (rx.replay(this.journal)) {
            rx.focus(this.observe);
            this.journal = undefined;

            if (this.set !== undefined) {
                this.set(gen);
            }

            return false;
        }

        return true;
    }

    observe(event: rx.ReflectionEvent) {
        if (event.isNotify()) {
            if (this.marker !== undefined) {
                const [journal, topics] = event.record(this.marker);
                this.journal = journal;
                this.marker = undefined;    

                if (this.replay(event.gen)) {
                    rx.focus(this.observe, ...topics);
                }
            } else {
                this.replay(event.gen);
            }
        }
    }

    clear() {
        this.set = undefined;
        rx.revoke(this.observe);
    }

    effect() {
        return () => this.clear();
    }
}

export function journal<T extends AnyFC<[number[], symbol, ...any[]]>>(fc: T) {
    function render(...args: any) {
        const marker = rx.mark();
        const [gen, set] = useState(rx.gen(0));
        try {
            const [props, ...rest] = args;
            return fc.call(this, props, marker, gen, ...rest);
        } finally {
            rx.unmark(marker);

            const journaler = useInstance(JournalerRef, set);
            useEffect(journaler.effect, []);

            if (marker.length > 0) {
                // We have reads, so react to them.
                rx.focus(journaler.observe, journaler);
                rx.notify(journaler);
                journaler.marker = marker;
            } else {
                // We don't, so don't react at all.
                // Although, maybe the props will activat eteh other branch in the future.
                rx.focus(journaler.observe);
                journaler.marker = undefined;
            }
        }
    }

    function hoist({ f }: { f: () => any }) {
        return f();
    }

    type Props = T extends (props: infer R, ...args: any) => any ? R : never;
    type Tail = T extends (props: any, gen: any, marker: any, ...args: infer R) => any ? R : never;

    const _ = Symbol();
    function memo(props: Props, ...args: Tail) {
        const f = () => render.call(this, props, ...args);
        return useMemo(() => React.createElement(hoist, { f }), [
            ...Object.keys(props), _,
            ...Object.values(props), _,
            ...args
        ]);
    }

    return memo;
}

export function useVisuals<P extends object, T extends Visuals<T>>(props: P, visuals: T)  {
    const vis = useInstance(rx.Observable) as T & Omit<P, keyof T>;
    return rx.reset(vis, {
        ...useAtoms(props),
        ...useAtoms(visuals, journal)
    });
}

export default undefined;
