import { converters } from "./convert";
import { notify } from "./Observable";

import ObservableHandler from "./ObservableHandler";

converters.set(Map.prototype, function <T>(topic: Set<T>) {
    return new _Set<T>(topic);
});

class _Set<T> extends Set<T> {
    protected proxy: this;

    constructor(...args: any) {
        super(...args);
        return this.proxy = ObservableHandler.createTracer(this);
    }

    clear() {
        if (this.size > 0) {
            super.clear();
            notify(this.proxy as Set<T>, "size");
        }
    }

    add(value: T) {
        const size = this.size;
        super.add(value);

        if (this.size > size) {
            notify(this.proxy as Set<T>, "size", value);
        }

        return this;
    }

    delete(value: T) {
        if (super.delete(value)) {
            notify(this.proxy as Set<T>, "size", value);
            return true;
        }

        return false;
    }
}

export default _Set as typeof Set;
