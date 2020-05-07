import rx from "@rflect/rx";
import { useEffect, useState } from "react";
import { useInstance } from "./hooks";

class ObserverRef {
    observer: rx.Observer;

    constructor(observer: rx.Observer) {
        this.forwarder = this.forwarder.bind(this);
        this.effect = this.effect.bind(this);
        this.observer = observer;
    }

    forwarder(event: rx.ReflectionEvent) {
        this.observer(event);
    }

    effect() {
        return () => void rx.focus(this.observer);
    }
}

export function useObserver(observer: rx.Observer) {
    const current = useInstance(ObserverRef, observer);
    current.observer = observer;

    const { forwarder, effect } = current;
    useEffect(effect, [effect]);
    
    return forwarder;
}

export function useTopics(...topics: unknown[]) {
    const [gen, set] = useState(Symbol());    
    const observer = useObserver(function (event) {
        if (event.isNotify()) {
            set(event.gen);
        }
    });

    rx.focus(observer, ...topics);
    return gen;
}

export function useTrap<T, K extends rx.Func<T>>(topic: T, key: K, f: (event: rx.TrapEvent<T, K, T[K]>, ...args: Parameters<T[K]>) => any) {
    const observer = useObserver(function (event) {
        if (event.isTrap(topic, key)) {
            f(event, ...event.args);
        }
    });

    rx.focus(observer, topic);
    rx.notify(topic, key);
}

export default undefined;
