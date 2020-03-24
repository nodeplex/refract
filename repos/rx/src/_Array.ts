import { converters } from "./convert";
import ObservableHandler from "./ObservableHandler";

converters.set(Array.prototype, function <T>(topic: Array<T>) {
    return new _Array<T>(...topic);
});

class _Array<T> extends Array<T> {
    constructor(...args: any) {
        super(...args);
        return ObservableHandler.createProxy(this);
    }
}

export default _Array as typeof Array;
