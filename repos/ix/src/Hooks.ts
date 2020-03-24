import rx from "@rflect/rx";
import React, { useRef, useEffect, useState } from "react";

let context: RenderContext | undefined;

export interface RenderEffect {
    (visual: React.ReactElement | null): React.ReactElement | null | undefined | void;
}

interface RenderContext {
    effects?: RenderEffect[];
}

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

export function useJournal() {
    const [gen, set] = useState(Symbol());
    const journaler = useModel(() => new JournalerRef(set));
    const { effect } = journaler;
    useEffect(effect, [effect]);

    rx.focus(journaler.observe, journaler);
    rx.notify(journaler);

    const marker = journaler.marker = rx.mark();
    useRenderEffect(function () {
        rx.unmark(marker);
    });
}

export function useRenderEffect(effect: RenderEffect) {
    if (context === undefined) {
        throw new SyntaxError("Called useJournal() outside of a render context.");
    }

    const { effects } = context;
    if (effects !== undefined) {
        effects.push(effect);
    } else {
        context.effects = [effect];
    }
}

export function useModel<T>(f: () => T) {
    const ref = useRef<T>();
    const { current } = ref;
    if (current === undefined) {
        return ref.current = f();
    }
    
    return current;
}

export function useProps<T>(f: () => T) {
    const model = useModel(() => new rx.Observable() as T);
    rx.reset(model, f());

    return model;
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

export function useMemoVisual<P>(fc: React.FC<P>, props: P) {
    const render = useRef(fc);
    render.current = fc;

    const memo = useRef<typeof fc>();
    if (memo.current === undefined) {
        const invoker = function (...args: any) {
            return render.current.apply(this, args);
        };

        const current = memo.current = React.memo(adorn(invoker));
        wrappers.set(current, current);
    }

    return React.createElement(memo.current, props);
}

export function useStaticVisual() {
    const ref = useRef<React.ReactElement | null>();
    useRenderEffect(function (visual) {
        if (ref.current === undefined) {
            ref.current = visual;
        }
        
        return ref.current;
    });

    return ref.current !== undefined;
}

const wrappers = new WeakMap<object, rx.AnyFunction>();

function wrap(backend: rx.AnyFunction) {
    return function (...args: any) {
        const previous = context;
        try {
            const current = context = {} as RenderContext;
            const visual = backend.apply(this, args) as React.ReactElement | null;
            const { effects } = current;
            if (effects !== undefined) {
                let result = visual;
                for (const effect of effects) {
                    const next = effect(result);
                    if (next !== undefined) {
                        result = next;
                    }
                }

                return result;
            }

            return visual;
        } finally {
            context = previous;
        }
    }
}

function isSFC(type: unknown): type is Function {
    if (typeof type !== "function") {
        return false;
    }

    const proto = type.prototype as unknown;
    if (typeof proto !== "object") {
        return false;
    }

    if (proto === null) {
        return true;
    }

    if (Object.getPrototypeOf(proto) !== Object.prototype) {
        return false;
    }

    if ((proto as any).isReactComponent) {
        return false;
    }

    return true;
}

function adorn(type: any) {
    if (typeof type === "function") {
        let wrapper = wrappers.get(type);
        if (wrapper === undefined) {
            if (isSFC(type)) {
                wrappers.set(type, type = wrap(type));
            }

            wrappers.set(type, type);
        } else {
            type = wrapper;
        }
    }

    return type;
}

const { createElement } = React;
React.createElement = function (type: any, ...args: any) {
    type = adorn(type);
    return createElement.call(this, type, ...args);
};

export default undefined;
