import { AnyFunction } from "./defs";

export type Func<T> = {
    [K in keyof T]-?: T[K] extends AnyFunction ? K : never;
}[keyof T];

export abstract class ReflectionEvent {
    isNotify(): this is NotifyEvent;
    isNotify(topic: unknown): this is NotifyEvent;
    isNotify<T>(topic: T, key?: keyof T): this is NotifyEvent;

    isNotify(topic?: any, key?: PropertyKey) {
        if (this instanceof NotifyEvent) {
            if (topic !== undefined) {
                return this.has(topic, key);
            }

            return true;
        }

        return false;
    }

    isTrap(): this is TrapEvent;
    isTrap<T>(topic: T): this is TrapEvent<T>;
    isTrap<T, K extends Func<T>>(topic: T, key?: K): this is TrapEvent<T, K, T[K]>;

    isTrap(topic?: any, key?: PropertyKey) {
        if (this instanceof TrapEvent) {
            if (topic !== undefined) {
                if (topic === this.topic) {
                    if (key !== undefined) {
                        return key === this.key;
                    }

                    return true;
                }

                return false;
            }

            return true;
        }

        return false;
    }
}

export type JournalEntry = [unknown, AnyFunction | PropertyKey, unknown, unknown[]?];

export abstract class NotifyEvent extends ReflectionEvent {
    readonly gen!: symbol;

    /** The items that was recorded. */
    readonly journal!: JournalEntry[];

    /** The keys that were changed. */
    readonly keys!: Set<PropertyKey>;

    /** The topics that were changed. */
    readonly topics!: Set<unknown>;

    has(topic: unknown): boolean;
    has<T>(topic: T, key?: keyof T): boolean;

    has<T>(topic: unknown, key?: PropertyKey) {
        if (this.topics.has(topic)) {
            if (key !== undefined) {
                return this.keys.has(key);
            }

            return true;
        }

        return false;
    }

    record(marker: number[]): [JournalEntry[], unknown[]] {
        let start: number | undefined;
        const result = [] as JournalEntry[];
        const length = this.journal.length;
        for (const end of marker) {
            if (start !== undefined) {
                result.push(...this.journal.slice(start, end));
                start = undefined;
            } else {
                start = end;
            }
        }

        const topics = new Set(result.map(x => x[0]));
        return [result, [...topics]];
    }
}

export abstract class TrapEvent<T = unknown, K = PropertyKey, F extends AnyFunction = AnyFunction> extends ReflectionEvent {
    readonly topic!: T;
    readonly method!: F;
    readonly key!: K;
    readonly args!: Parameters<F>;
    result!: ReturnType<F>;

    freeze() {
        Object.freeze(this);
    }
}

export default ReflectionEvent;
