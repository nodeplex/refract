import rx from "@rflect/rx";
import React, { useEffect, useState, useRef, useMemo } from "react";

import { AnyFC } from "./defs";
import { useInstance } from "./hooks";
import { createAtom } from "./atom";

const empty = Object.freeze(Object.create(null));

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

let _useJournal = function (_: boolean): symbol | undefined {
    throw new SyntaxError("useJournal() used incorrectly.");
};

export function useJournal(capture = true): symbol | undefined {
    return _useJournal(capture);
}

export function journal<T extends AnyFC>(fc: T) {
    function render(...args: any) {
        let result: symbol | undefined;
        let marker: number[] | undefined
        function useJournal(capture: boolean) {
            if (capture === false) {
                if (marker !== undefined) {
                    rx.unmark(marker);
                }

                return result;
            }

            if (marker !== undefined) {
                rx.mark(marker);
                return result;
            }

            const [gen, set] = useState(Symbol());
            const journaler = useInstance(JournalerRef, set);
            const { effect } = journaler;
            useEffect(effect, [effect]);
    
            rx.focus(journaler.observe, journaler);
            rx.notify(journaler);

            marker = journaler.marker = rx.mark();
            return result = gen;
        }

        const current = _useJournal;
        try {
            _useJournal = useJournal;
            return fc.apply(this, args);
        } finally {
            _useJournal = current;

            if (marker !== undefined) {
                rx.unmark(marker);
            }
        }
    }

    return render as any as T;
}

export function useVisuals<T extends { [key: string]: AnyFC }>(visuals: T): T {
    const ref = useRef<any>(empty);
    let { current } = ref;
    const atoms = Object.create(null);
    const result = Object.create(visuals as any);
    for (const key in visuals) {
        let value = visuals[key];
        if (typeof value === "function") {
            value = createAtom(journal(value), current[key]) as any;
            atoms[key] = value;
        }

        result[key] = value;
    }
    
    ref.current = atoms;
    return result;
}

export function useMemoVisual<P>(vis: { Visual: React.FC<P> }, props: P) {
    const deps = [...Object.keys(props), ...Object.values(props)];
    return useMemo(() => <vis.Visual {...props} />, deps);
}

export default undefined;
