import { AnyFC, Visuals } from "./defs";
import { createElement, ElementType, FC, ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";

import rx from "@rflect/rx";
import atomizer from "./atomizer";

export function useModel<T extends rx.AnyClass>(cls: T, ...args: ConstructorParameters<T>) {
    return useMemo(() => new (rx.extend(cls))(...args), []);
}

export function useComponent<T extends ElementType<{}>>(type: T, partial: Partial<ComponentProps<T>> = {}): FC<ComponentProps<T>> {
    function init() {
        function apply(f: Function) {
            return function (...args: any) {
                try {
                    return f.apply(this, args);
                } finally {
                    rx.flush();
                }    
            };
        }
        
        const _ = {};
        const atoms = atomizer<{}>(apply);
        function forward(props: ComponentProps<T>) {
            const state = atoms({
                ...partial,
                ...props    
            });

            const deps = [
                type, _,
                ...Object.keys(state), _,
                ...Object.values(state), _,
            ];

            return useMemo(() => createElement(type, state), deps);
        }

        function update(x: typeof type, y: typeof partial) {
            type = x;
            partial = y;
        }

        return { forward, update };
    }

    const { forward, update } = useMemo(init, []);
    update(type, partial);

    return forward;
}

export function useObserver(observer: rx.Observer) {
    function init() {
        function forward(event: rx.ReflectionEvent) {
            observer(event);
        }

        function update(x: typeof observer) {
            observer = x;
        }

        function effect() {
            return function () {
                rx.revoke(forward);
            };
        }

        return { effect, forward, update };
    }

    const { effect, forward, update } = useMemo(init, []);
    update(observer);
    useEffect(effect, []);
    
    return forward;
}

export function useTopics(...topics: unknown[]) {
    const [gen, set] = useState(rx.gen(0));    
    const observer = useObserver(function (event) {
        if (event.isNotify()) {
            set(event.gen);
        }
    });

    rx.focus(observer, ...topics);
    return gen;
}

export function useTrap<T, K extends rx.Func<T>>(topic: T, key: K, f: (event: rx.TrapEvent<T, K, T[K]>, ...args: Parameters<T[K]>) => any) {
    const observer = useObserver(function (event) {
        if (event.isTrap(topic, key)) {
            f(event, ...event.args);
        }
    });

    rx.focus(observer, topic);
    rx.notify(topic, key);
}

export function useJournal() {
    function init() {
        const topic = {};
        let journal: rx.JournalEntry[] | undefined;
        let marker: number[] | undefined;
        let set: ((gen: symbol) => void) | undefined;
        function observe(event: rx.ReflectionEvent) {
            if (event.isNotify()) {
                let topics: unknown[] | undefined;
                if (marker !== undefined) {
                    [journal, topics] = event.record(marker);
                    marker = undefined;    
                }

                if (journal !== undefined) {
                    if (rx.replay(journal)) {
                        rx.focus(observe);
                        clear()?.(event.gen);
                    } else if (topics !== undefined) {
                        rx.focus(observe, ...topics);
                    }
                }
            }
        }

        function effect() {
            return function () {
                rx.freeze(topic);
                rx.revoke(observe);
                clear();
            };
        }

        function clear() {
            const s = set;
            journal = undefined;
            marker = undefined;
            set = undefined;
            
            return s;
        }

        function update(x: number[], y: (gen: symbol) => void) {
            journal = undefined;
            marker = x;
            set = y;

            rx.unmark(marker);

            if (marker.length > 0) {
                // We have reads, so react to them.
                rx.focus(observe, topic);
                rx.notify(topic);
            } else {
                rx.focus(observe);
                clear();
            }
        }

        return { effect, update };
    }

    const marker = rx.mark();
    const [gen, set] = useState(rx.gen(0));
    const { effect, update } = useMemo(init, []);
    useEffect(effect, []);

    const finish = update.bind(undefined, marker, set);
    return [finish, marker, gen] as [() => void, typeof marker, typeof gen];
}

export function journal<T extends AnyFC<[number[], symbol, ...any[]]>>(fc: T) {
    function render(...args: any) {
        const [finish, marker, gen] = useJournal();
        try {
            const [props, ...rest] = args;
            return fc.call(this, props, marker, gen, ...rest);
        } finally {
            finish();
        }
    }

    function hoist({ f }: { f: () => any }) {
        return f();
    }

    type Props = T extends (props: infer R, ...args: any) => any ? R : never;
    type Tail = T extends (props: any, gen: any, marker: any, ...args: infer R) => any ? R : never;

    const _ = {};
    function memo(props: Props, ...args: Tail) {
        const atoms = useMemo(() => atomizer<Props>(), []);
        props = atoms(props);

        const deps = [
            ...Object.keys(props), _,
            ...Object.values(props), _,
            ...args, _,
        ];

        const f = () => render.call(this, props, ...args);
        return useMemo(() => createElement(hoist, { f }), deps);
    }

    return memo;
}

export function useVisuals<P extends object, T extends Visuals<T>>(props: P, visuals: T) {
    function init() {
        const _props = atomizer<P>();
        const _visuals = atomizer<T>(journal);
        const vis = new rx.Observable() as T & Omit<P, keyof T>;
        function update(props: P, visuals: T) {
            return rx.reset(vis, {
                ..._props(props),
                ..._visuals(visuals)
            });
        }

        return update;
    }

    const update = useMemo(init, []);
    return update(props, visuals);
}

export default undefined;
