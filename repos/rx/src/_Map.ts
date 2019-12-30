import { converters } from "./convert";
import { notify } from "./Observable";
import { hoist } from "./hoist";

import ObservableHandler from "./ObservableHandler";

converters.set(Map.prototype, function <K, V>(topic: Map<K, V>) {
    return new _Map<K, V>(topic);
});

class _Map<K, V> extends hoist(Map)<K, V> {
    constructor(entries?: readonly (readonly [K, V])[] | null)
    constructor(entries: Iterable<readonly [K, V]>)

    constructor(...args: any) {
        super(...args);
        return ObservableHandler.createProxy(this);
    }

    clear() {
        if (this.size > 0) {
            super.clear();
            notify(this, "size");
        }
    }

    set(key: K, value: V) {
        const size = this.size;
        super.set(key, value);

        if (this.size > size) {
            notify(this, "size");
        }

        return this;
    }

    delete(key: K) {
        if (super.delete(key)) {
            notify(this, "size", "delete");
            return true;
        }

        return false;
    }
}

export default _Map as typeof Map;
