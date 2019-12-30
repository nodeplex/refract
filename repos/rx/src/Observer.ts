import ReflectionEvent from "./ReflectionEvent";

function* empty() {}

class WeakTable<K, V> extends WeakMap<any, Set<V> | null> {
    add(key: K, value: V) {
        const set = this.all(key);
        if (set === null || set.has(value)) {
            return false;
        }

        set.add(value);
        return true;
    }

    remove(key: K, value: V) {
        const set = this.get(key);
        if (set === null) {
            return false;
        }

        if (set === undefined) {
            return false;
        }

        return set.delete(value);
    }

    values(key: K) {
        const set = this.get(key);
        if (set === null) {
            return empty();
        }

        if (set === undefined) {
            return empty();
        }

        return set.values();
    }

    any(key: K) {
        const set = this.get(key);
        if (set === null) {
            return false;
        }

        if (set === undefined) {
            return false;
        }

        if (set.size < 1) {
            return false;
        }

        return true;
    }

    all(key: K) {
        let set = this.get(key);
        if (set === undefined) {
            this.set(key, set = new Set<V>());
        }

        return set;
    }

    test(key: K, value: V) {
        const set = this.get(key);
        if (set === null) {
            return false;
        }

        if (set === undefined) {
            return false;
        }

        return set.has(value);
    }
}

const observerTable = new WeakTable<unknown, Observer>();
const topicTable = new WeakTable<Observer, unknown>();

function isBadObserver(observer: Observer) {
    return typeof observer !== "function";
}

function isBadTopic(topic: unknown) {
    return typeof topic !== "object" || topic === null;
}

function isBadCombo(topic: unknown, observer: Observer) {
    return isBadObserver(observer) || isBadTopic(topic);
}

export interface Observer {
    (event: ReflectionEvent): any;
}

export function on(topic: unknown, observer: Observer) {
    if (isBadCombo(topic, observer)) {
        return false;
    }

    const observers = observerTable.all(topic);
    if (observers === null) {
        return false;
    }

    if (observers.has(observer)) {
        return false;
    }

    const topics = topicTable.all(observer);
    if (topics === null) {
        return false;
    }

    observers.add(observer);
    topics.add(topic);

    return true;
}

export function off(topic: unknown, observer: Observer) {
    if (isBadCombo(topic, observer)) {
        return false;
    }

    if (observerTable.remove(topic, observer)) {
        return topicTable.remove(observer, topic);
    }

    return false;
}

export function has(topic: unknown, observer: Observer) {
    if (isBadCombo(topic, observer)) {
        return false;
    }

    return observerTable.test(topic, observer);
}

export function clear(topic: unknown) {
    if (isBadTopic(topic)) {
        return false;
    }

    const set = observerTable.get(topic);
    if (set === null) {
        return false;
    }

    if (set === undefined) {
        return false;
    }

    if (set.size < 1) {
        return false;
    }

    for (const observer of set) {
        topicTable.remove(observer, topic);
    }

    return true;
}

export function freeze(topic: unknown) {
    if (isBadTopic(topic)) {
        return false;
    }

    const set = observerTable.get(topic);
    if (set === null) {
        return false;
    }

    observerTable.set(topic, null);

    if (set === undefined) {
        return false;
    }

    if (set.size < 1) {
        return false;
    }

    for (const observer of set) {
        topicTable.remove(observer, topic);
    }

    return true;
}

export function revoke(observer: Observer) {
    if (isBadObserver(observer)) {
        return false;
    }

    const set = topicTable.get(observer);
    if (set === null) {
        return false;
    }

    topicTable.set(observer, null);

    if (set === undefined) {
        return false;
    }

    if (set.size < 1) {
        return false;
    }

    for (const topic of set) {
        observerTable.remove(topic, observer);
    }

    return true;
}

export function isObserverActive(observer: Observer) {
    if (isBadObserver(observer)) {
        return false;
    }

    return topicTable.any(observer);
}

export function isTopicActive(topic: unknown) {
    if (isBadTopic(topic)) {
        return false;
    }

    return observerTable.any(topic);
}

export function focus(observer: Observer, ...topicList: unknown[]) {
    if (isBadObserver(observer)) {
        return false;
    }

    const topics = topicTable.all(observer);
    if (topics === null) {
        return false;
    }

    let result = false;
    let orphans = new Set(topicTable.values(observer));
    for (const topic of topicList) {
        if (!isBadTopic(topic)) {
            if (observerTable.add(topic, observer)) {
                topics.add(topic);
                result = true;
            }

            orphans.delete(topic);
        }
    }

    for (const topic of orphans) {
        if (observerTable.remove(topic, observer)) {
            result = true;
        }
    }

    return result;
}

export function observe(observer: Observer, ...topicList: unknown[]) {
    if (isBadObserver(observer)) {
        return false;
    }

    const topics = topicTable.all(observer);
    if (topics === null) {
        return false;
    }

    let result = false;
    for (const topic of topicList) {
        if (!isBadTopic(topic) && observerTable.add(topic, observer)) {
            topics.add(topic);
            result = true;
        }
    }

    return result;
}

export function observers(topic: unknown) {
    if (isBadTopic(topic)) {
        return empty();
    }

    return observerTable.values(topic);
}

export function topics(observer: Observer) {
    if (isBadObserver(observer)) {
        return empty();
    }

    return topicTable.values(observer);
}

export default Observer;
