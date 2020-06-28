const empty = Object.freeze(Object.create(null));

interface Atom<F> {
    (f: F): F;
}

type AtomMap<T> = {
    [K in keyof T]: T[K] extends Function ? Atom<T[K]> : never;
};

function _throw() {
    throw new SyntaxError("Atom not uzed correctly.");
}

export function atomizer<T>(apply?: (f: Function) => Function) {
    function wrap(key: string) {
        let f: Function = _throw;
        function forward(...args: any) {
            return f.apply(this, args);
        }
    
        const wrapper = apply?.(forward) ?? forward;
        function update<F extends Function>(x: F): F {
            f = x;
            return wrapper as any as F;
        }

        Object.defineProperty(wrapper, "name", {
            configurable: false,
            enumerable: true,
            get() {
                return `atom:${key} ${f.name}`;
            }
        });

        Object.defineProperty(wrapper, "toString", {
            configurable: false,
            enumerable: true,
            writable : false,
            value() {
                return this.name;
            }
        });
    
        return update;
    }

    let atoms = empty as AtomMap<T>;
    function update(props: T): T {
        const state = Object.create(null) as AtomMap<T>;
        const result = Object.create(null) as T;
        for (const key in props) {
            let value = props[key];
            if (typeof value === "function") {
                const atom = atoms[key] || wrap(key);
                state[key] = atom;
                value = atom(value);
            }

            result[key] = value;
        }

        atoms = state;
        return result;
    }

    return update;
}

export default atomizer;
