import rx from "@rflect/rx";
import React, { useRef, useEffect, useState } from "react";

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

export function journal<T extends React.FC<any>>(fc: T) {
    function render(...args: any) {
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

    return memo(render as any as T);
}

export class MemoRef {
    props: any;
    jsx?: React.ReactElement | null;

    atoms = {} as {
        [name: string]: undefined | {
            atom: rx.AnyFunction;
            func: rx.AnyFunction;
        };
    };

    atom(key: string, func: rx.AnyFunction) {
        let thunk = this.atoms[key];
        if (thunk === undefined) {
            thunk = this.atoms[key] = {
                atom(...args: any) {
                    const { func } = thunk!;
                    return func.apply(this, args);
                },
                func
            };
        } else {
            thunk.func = func;
        }

        return thunk.atom;
    }

    compare(props: any) {
        function check(x: any, y: any) {
            if (typeof x !== typeof y) {
                return true;
            }

            if (typeof x === "function") {
                return false;
            }

            if (Object.is(x, y)) {
                return false;
            }

            return true;
        }

        for (const key in props) {
            if (check(props[key], this.props[key])) {
                return true;
            }
        }

        for (const key in this.props) {
            if (check(props[key], this.props[key])) {
                return true;
            }
        }

        return false;
    }

    atomify(props: any) {
        const result = {} as any;
        for (const key in props) {
            const value = props[key];
            if (typeof value === "function") {
                result[key] = this.atom(key, value);
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    render(Visual: React.FC<any>, props: any) {
        if (this.jsx === undefined || this.compare(props)) {
            this.props = props = this.atomify(props);
            return this.jsx = <Visual {...props} />;
        }

        return this.jsx;
    }
}

export function memo<T extends React.FC<any>>(fc: T) {
    return function (props: any) {
        const mr = useInstance(MemoRef);
        return mr.render(fc, props);
    } as any as T;
}

class AtomRef<T, R> {
    current: T;
    result: R;

    constructor(current: T, atomizer: Atomizer<T, R>) {
        this.current = current;
        this.result = atomizer(this);
    }
}

export interface Atomizer<T, R> {
    (ref: { current: T }): R;
}

export function useAtom<T, R>(value: T, atomizer: Atomizer<T, R>): R {
    const atom = useConstant(() => new AtomRef(value, atomizer));
    atom.current = value;
    return atom.result;
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
    const current = useInstance(ObserverRef, observer);
    current.observer = observer;

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
    const observer = useObserver(function (event) {
        if (event.isTrap(topic, key)) {
            f(event, ...event.args);
        }
    });

    rx.focus(observer, topic);
    rx.notify(topic, key);
}

export function useJournal<T extends React.FC<any>>(fc: T) {
    return useAtom(fc, function (ref) {
        return journal(function (...args: any) {
            const { current } = ref;
            return current.apply(this, args);
        }) as any as T;
    });
}

export function useMemo<T extends React.FC<any>>(fc: T) {
    return useAtom(fc, function (ref) {
        return memo(function (...args: any) {
            const { current } = ref;
            return current.apply(this, args);
        }) as any as T;
    });
}
