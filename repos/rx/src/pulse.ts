import { observers, isObserverActive } from "./Observer";
import { marshal } from "./dispatch";
import { NotifyEvent } from "./ReflectionEvent";

import Observer from "./Observer";
import { stateOf } from "./Topic";

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
                setImmediate(invoke, observer, event);
            }
        }
    }

    promise = undefined;
    setImmediate(resolve);
}

let promise: Promise<void> | undefined;
function defer(resolve: () => void) {
    setImmediate(broadcast, resolve);
}

export function pulse() {
    if (promise === undefined) {
        promise = new Promise<void>(defer);
    }

    return promise;
}

export default pulse;
