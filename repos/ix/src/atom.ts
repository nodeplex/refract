import { useRef } from "react";

const empty = Object.freeze(Object.create(null));
const target = Symbol();

export interface Atom extends Function {
    [target]: Function;
}

export function createAtom(f: Function, atom?: Atom): Atom {
    if (typeof atom === "function" && atom[target] !== undefined) {
        atom[target] = f;
        return atom;    
    }

    const result: Atom = Object.assign(function (...args: any) {
        return result[target].apply(this, args);
    }, { [target]: f });

    return result;
}

export function useAtoms<T>(state: T): T {
    const ref = useRef<any>();
    let { current } = ref;
    if (typeof state === "function") {
        if (typeof current !== "function") {
            current = undefined;
        }

        const result = ref.current = createAtom(state, current);
        return result as any as T;
    }

    if (typeof state === "object" && state !== null) {
        if (typeof current !== "function") {
            current = empty;
        }

        const atoms = Object.create(null);
        const result = Object.create(state as any);
        for (const key in state) {
            let value = state[key];
            if (typeof value === "function") {
                value = createAtom(value, current[key]) as any;
                atoms[key] = value;
            }

            Object.defineProperty(result, key, {
                configurable: false,
                enumerable: true,
                writable: false,
                value
            });
        }
        
        ref.current = atoms;
        return result;
    }

    ref.current = undefined;
    return state;
}

export default undefined;
