import rx from "@rflect/rx";
import React, { useRef, useEffect, useState } from "react";
import { VisualProps } from "./defs";

class JournalerRef {
    journal?: rx.JournalEntry[];
    marker?: number[];
    set?: (gen: symbol) => void

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

export function journal<T extends React.FC<any>>(fc: T): T {
    function Render(...args: any) {
        const [gen, set] = useState(Symbol());
        const journaler = useInstance(JournalerRef, set);
        const { effect } = journaler;
        useEffect(effect, [effect]);

        rx.focus(journaler.observe, journaler);
        rx.notify(journaler);

        const marker = journaler.marker = rx.mark();

        try {
            return fc.apply(this, args) as React.ReactElement | null;
        } finally {
            rx.unmark(marker);
        }
    }

    const Memo = React.memo(Render);
    return ((props: any) => <Memo {...props} />) as any;
}

export function memo<T extends React.FC<any>>(fc: T): T {
    const Memo = React.memo(fc);
    return ((props: any) => <Memo {...props} />) as any;
}

export function useConstant<T>(f: () => T) {
    const ref = useRef<T>();
    const { current } = ref;
    if (current === undefined) {
        return ref.current = f();
    }
    
    return current;
}

export function useInstance<T extends rx.AnyClass>(cls: T, ...args: ConstructorParameters<T>) {
    const ref = useRef<InstanceType<T>>();
    const { current } = ref;
    if (current === undefined) {
        return ref.current = new cls(...args) as InstanceType<T>;
    }
    
    return current;
}

class ObserverRef {
    observer: rx.Observer;

    constructor(observer: rx.Observer) {
        this.forwarder = this.forwarder.bind(this);
        this.effect = this.effect.bind(this);
        this.observer = observer;
    }

    forwarder(event: rx.ReflectionEvent) {
        this.observer(event);
    }

    effect() {
        return () => void rx.focus(this.observer);
    }
}

export function useObserver(observer: rx.Observer) {
    const ref = useRef<ObserverRef>();
    let { current } = ref;
    if (current !== undefined) {
        current.observer = observer;
    } else {
        current = ref.current = new ObserverRef(observer);
    }

    const { forwarder, effect } = current;
    useEffect(effect, [effect]);
    
    return forwarder;
}

export function useTopics(...topics: unknown[]) {
    const [gen, set] = useState(Symbol());    
    const observer = useObserver(function (event) {
        if (event.isNotify()) {
            set(event.gen);
        }
    });

    rx.focus(observer, ...topics);
}

export function useTrap<T, K extends rx.Func<T>>(topic: T, key: K, f: (event: rx.TrapEvent<T, K, T[K]>, ...args: Parameters<T[K]>) => any) {
    rx.notify(topic, key);

    const observer = useObserver(function (event) {
        if (event.isTrap(topic, key)) {
            f(event, ...event.args);
        }
    });

    rx.focus(observer, topic);
}

export function useJournal<T extends React.FC<any>>(f: T) {
    const ref = useRef<T>(f);
    ref.current = f;

    const wrapper = useRef<T>();
    const { current } = wrapper;
    if (current === undefined) {
        const thunk = function (...args: any) {
            return ref.current.apply(this, args) as any;
        };

        return wrapper.current = journal(thunk as any as T);
    }

    return current;
}

export function useMemo<T extends React.FC<any>>(f: T) {
    const ref = useRef<T>(f);
    ref.current = f;

    const wrapper = useRef<T>();
    const { current } = wrapper;
    if (current === undefined) {
        const thunk = function (...args: any) {
            return ref.current.apply(this, args) as any;
        };

        return wrapper.current = memo(thunk as any as T);
    }

    return current;
}
