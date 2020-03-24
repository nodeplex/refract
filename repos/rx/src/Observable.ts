import { JournalEntry } from "./ReflectionEvent";

import * as dispatch from "./dispatch";
import pulse from "./pulse";

import ObservableHandler from "./ObservableHandler";
import { assert, stateOf } from "./Topic";

import { converters } from "./convert";

import markers = dispatch.markers;
import journal = dispatch.journal;
import keys = dispatch.keys;
import topics = dispatch.topics;

converters.set(Object.prototype, function (topic) {
    const result = new Observable();
    reset(result, this);
    return result;
});

export function id(topic: unknown) {
    return stateOf(topic)?.id;
}

export function gen(topic: unknown) {
    return stateOf(topic)?.gen;
}

export class Observable {
    constructor() {
        return ObservableHandler.createProxy(this);
    }
}

function intrinsicThrow() {
    throw new SyntaxError("The given object is not intrinsic observable. ");
}

export function mixin<T>(topic: T, state: Partial<T>): void;
export function mixin(topic: any, state: any): void {
    if (topic.constructor !== Observable) {
        intrinsicThrow();        
    }

    const handler = assert(topic);
    keys.push(...Reflect.ownKeys(state));
    topics.push(topic);
    pulse();

    Object.assign(handler.target, state);
}

export function reset<T>(topic: T, state: Partial<T>): void;
export function reset(topic: any, state: any): void {
    if (topic.constructor !== Observable) {
        intrinsicThrow();        
    }

    const handler = assert(topic);
    const { target } = handler;
    keys.push(...Reflect.ownKeys(state));
    keys.push(...Reflect.ownKeys(target));
    topics.push(topic);
    pulse();

    for (const key of Reflect.ownKeys(handler.target)) {
        (target as any)[key] = undefined;
    }
    
    Object.assign(target, state);
}

export function notify<T>(topic: T, ...members: (keyof T)[]) {
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

export default Observable;
