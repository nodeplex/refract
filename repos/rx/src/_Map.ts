import { converters } from "./convert";
import { notify } from "./Observable";

import ObservableHandler from "./ObservableHandler";
import { applyReplayIterables, comparePair } from "./play";

converters.set(Map.prototype, function <K, V>(topic: Map<K, V>) {
    return new _Map<K, V>(topic);
});

class _Map<K, V> extends Map<K, V> {
    protected proxy: this;

    constructor(...args: any) {
        super(...args);
        return this.proxy = ObservableHandler.createTracer(this);
    }

    clear() {
        if (this.size > 0) {
            super.clear();
            notify(this.proxy as Map<K, V>, "size");
        }
    }

    set(key: K, value: V) {
        const size = this.size;
        super.set(key, value);

        if (this.size > size) {
            notify(this.proxy as Map<K, V>, "size", key);
        }

        return this.proxy;
    }

    delete(key: K) {
        if (super.delete(key)) {
            notify(this.proxy as Map<K, V>, "size", key);
            return true;
        }

        return false;
    }
}

applyReplayIterables(_Map, comparePair);

export default _Map as typeof Map;
