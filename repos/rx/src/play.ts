
export const play = Symbol();

declare global {
    interface Object {
        [play]?: () => any;
    }
}

export interface Play {
    [play]: () => any;
}

export interface Comparer<T> {
    (x: T, y: T): boolean;
}

export function comparePair<T extends [any, any]>(x: T, y: T) {
    if (!Object.is(x[0], y[0])) {
        return false;
    }

    if (!Object.is(x[1], y[1])) {
        return false;
    }

    return true;
}

export type Yield<T> = T extends Iterator<infer R> ? R : never;

export function reiterate<T extends Iterator<any>>(reset: () => T, compare: Comparer<Yield<T>> | undefined = Object.is ) {
    let journal = false;
    const history = [] as [any, boolean, any][];
    function freeze() {
        journal = false;
        history.length = 0;
        Object.freeze(history);

        return false;
    }

    function go() {
        journal = true;
        return true;
    }

    const iterator = reset();
    const next = iterator.next;
    iterator.next = function (...args: any) {
        const result = next.apply(this, args);
        if (journal) {
            const { done, value } = result;
            history.push([args, done === true, value]);
        } else {
            freeze();
        }

        return result;
    };

    function replay() {
        if (Object.isFrozen(history)) {
            return false;
        }

        if (history.length < 1) {
            return go();
        }

        const iterator = reset();
        for (const [args, done, value] of history) {
            const result = iterator.next(args);
            if (done) {
                if (!result.done) {
                    return freeze();
                }

                if (!Object.is(value, result.value)) {
                    return freeze();
                }

                return go();
            }

            if (result.done) {
                return freeze();
            }

            if (!compare(value, result.value)) {
                return freeze();
            }
        }

        return go();
    }

    iterator[play] = replay;
    return iterator;
}

export interface Collection<T> {
    entries(): IterableIterator<[any, any]>;
    keys(): IterableIterator<any>;
    values(): IterableIterator<any>;
    [Symbol.iterator](): IterableIterator<T>;
}

export function applyReplayIterables<T>(cls: { prototype: Collection<T> }, compare: Comparer<T> = Object.is) {
    const proto = Object.getPrototypeOf(cls.prototype) as Collection<T>;
    Object.assign(cls.prototype, {
        entries() {
            return reiterate(() => proto.entries.apply(this), comparePair);
        },

        keys() {
            return reiterate(() => proto.keys.apply(this));
        },

        values() {
            return reiterate(() => proto.values.apply(this));
        },

        [Symbol.iterator]() {
            return reiterate(() => proto[Symbol.iterator](), compare);
        }
    });
}

export function canPlay(obj: unknown): obj is Play {
    return typeof obj === "object" && obj !== null && play in obj;
}

export default play;
