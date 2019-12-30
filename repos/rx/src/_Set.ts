import { converters } from "./convert";
import { notify } from "./Observable";
import { hoist } from "./hoist";

import ObservableHandler from "./ObservableHandler";

converters.set(Map.prototype, function <T>(topic: Set<T>) {
    return new _Set<T>(topic);
});

class _Set<T> extends hoist(Set)<T> {
    constructor(entries?: readonly T[] | null)
    constructor(entries?: Iterable<T> | null)

    constructor(args: any) {
        super(...args);
        return ObservableHandler.createProxy(this);
    }

    clear() {
        if (this.size > 0) {
            super.clear();
            notify(this, "size");
        }
    }

    add(value: T) {
        const size = this.size;
        super.add(value);

        if (this.size > size) {
            notify(this, "size");
        }

        return this;
    }

    delete(value: T) {
        if (super.delete(value)) {
            notify(this, "size");
            return true;
        }

        return false;
    }
}

export default _Set as typeof Set;
