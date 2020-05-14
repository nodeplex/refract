import { useRef } from "react";
import rx from "@rflect/rx";

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

export function useAtom<T extends rx.AnyFunction>(f: T): T {
    const ref = useRef<any>();
    return ref.current = createAtom(f, ref.current) as any;
}

export function useAtoms<T extends object>(props: T, wrap?: (f: Function) => Function): T {
    const ref = useRef<any>(empty);
    const { current } = ref;
    const atoms = Object.create(null);
    const result = Object.create(null);
    for (const key in props) {
        let value = props[key];
        if (typeof value === "function") {
            value = createAtom(wrap ? wrap(value) : value, current[key]) as any;
            atoms[key] = value;
        }

        result[key] = value;
    }

    ref.current = atoms;
    return result;
}

export default undefined;
