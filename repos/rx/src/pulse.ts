import { observers, isObserverActive } from "./Observer";
import { marshal } from "./dispatch";
import { NotifyEvent } from "./ReflectionEvent";

import Observer from "./Observer";
import { stateOf } from "./Topic";
import { AnyFunction } from "./defs";

let pending = false;
const tasks = [] as [Function, any[]][];
function enqueue<T extends AnyFunction>(f: T, ...args: Parameters<T>) {
    if (!pending) {
        pending = true;
        setImmediate(function () {
            pending = false;
            flush();
        });
    }

    tasks.push([f, args]);
}

let flushing = false;
export function flush() {
    if (flushing) {
        return false;
    }

    flushing = true;
    for (const [f, args] of tasks) {
        try {
            f.apply(undefined, args);
        } catch (ex) {
            console.log(ex);
        }
    }

    flushing = false;
    tasks.length = 0;

    return true;
}

function invoke(observer: Observer, event: NotifyEvent) {
    if (isObserverActive(observer)) {
        observer(event);
    }
}

function broadcast(resolve: () => void) {
    const event = marshal();
    const graph = new Set<unknown>();
    function add(observer: Observer) {
        if (graph.has(observer)) {
            return false;
        }

        graph.add(observer);
        return true;
    }

    const genX = event.gen;
    for (const topic of event.topics) {
        const state = stateOf(topic);
        if (state !== undefined) {
            state.gen = genX;
        }

        for (const observer of observers(topic)) {
            if (add(observer)) {
                enqueue(invoke, observer, event);
            }
        }
    }

    promise = undefined;
    enqueue(resolve);
}

let promise: Promise<void> | undefined;
function defer(resolve: () => void) {
    enqueue(broadcast, resolve);
}

export function pulse() {
    if (promise === undefined) {
        promise = new Promise<void>(defer);
    }

    return promise;
}

export default pulse;
