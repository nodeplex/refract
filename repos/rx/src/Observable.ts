import { AnyClass, Member } from "./defs";
import { JournalEntry } from "./ReflectionEvent";
import { gen0 } from "./gen";

import * as dispatch from "./dispatch";
import pulse from "./pulse";

import ObservableHandler from "./ObservableHandler";
import { assert, stateOf } from "./Topic";

import { converters } from "./convert";

import markers = dispatch.markers;
import journal = dispatch.journal;
import keys = dispatch.keys;
import topics = dispatch.topics;

converters.set(Object.prototype, function (value) {
    const result = new Observable();
    reset(result, value);
    return result;
});

export function id(topic: unknown) {
    return stateOf(topic)?.id;
}

export function gen(topic: unknown) {
    if (topic === 0) {
        return gen0;
    }

    return stateOf(topic)?.gen;
}

export class Observable {
    constructor() {
        return ObservableHandler.createProxy(this);
    }
}

export function extend<T extends AnyClass>(cls: T) {
    class Extension extends cls {
        constructor(...args: any[]) {
            super(...args);
            return ObservableHandler.createProxy(this);
        }
    }

    return Extension as any as T;
}

export function mixin<T>(topic: T, state: Partial<T>): T;
export function mixin(topic: any, state: any): any {
    return reset(topic, {
        ...topic,
        ...state
    });
}

export function reset<T>(topic: T, state: T): T;
export function reset(topic: any, state: any): any {
    const handler = assert(topic);
    const { target } = handler;

    let pokes: typeof props | undefined;
    const props = Object.getOwnPropertyDescriptors(target);
    for (const key in props) {
        const prop = props[key];
        if (prop.enumerable && prop.writable) {
            const next = state[key];
            if (!Object.is(prop.value, next)) {
                if (pokes === undefined) {
                    pokes = {};
                }

                prop.value = next;
                pokes[key] = prop;
            }
        }
    }

    for (const key in state) {
        if (!(key in target)) {
            const value = state[key];
            if (value !== undefined) {
                if (pokes === undefined) {
                    pokes = {};
                }

                pokes[key] = {
                    configurable: true,
                    enumerable: true,
                    writable: true,
                    value
                };
            }
        }
    }

    if (pokes !== undefined) {
        Object.defineProperties(target, pokes);
        topics.push(topic);
        keys.push(...Object.keys(pokes));
        pulse();    
    }

    return topic;
}

export function notify<T>(topic: T, ...members: Member<T>[]) {
    for (const key of members) {
        keys.push(key);
    }

    topics.push(topic);
    pulse();
}

export function assertMutationLock() {
    if (markers.size > 0) {
        throw new SyntaxError("Actions are not safe here.");
    }
}

export function mark(marker?: number[])  {
    if (marker === undefined) {
        marker = [];
    }

    if (!markers.has(marker)) {
        markers.add(marker);
        marker.push(journal.length);
    }

    return marker;
}

export function unmark(marker: number[]) {
    if (markers.delete(marker)) {
        const start = marker.pop()!;
        if (start < journal.length) {
            marker.push(start);
            marker.push(journal.length);    
        }
    }
}

export function replay(list: JournalEntry[]) {
    for (const [topic, f, result, args] of list) {
        if (typeof f === "function") {
            if (!Object.is(f.apply(topic, args), result)) {
                return true;
            }
        } else {
            if (!Object.is((topic as any)[f], result)) {
                return true;
            }
        }
    }

    return false;
}

export function capture<T, P extends any[]>(topic: T, f: (this: T, ...args: P) => any, ...args: P) {
    journal.push([topic, f, f.apply(topic, args), args]);
}

const tracers = new WeakMap<object, object>();

/**
 * This wraps the object in a proxy which can be used to mimic an observable, the
 * draw back the target's own methods will not trigger changes. Some external
 * additional wiring would be needed to do this. So, this method should be further
 * wrapped in a purposed API for dealing with another observable subsystem.
 * @param target 
 */
export function trace<T extends object>(target: T) {
    const result = ObservableHandler.createTracer(target);
    tracers.set(target, result);

    return result;
}

export default Observable;
