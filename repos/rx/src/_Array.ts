import { converters } from "./convert";
import ObservableHandler from "./ObservableHandler";
import { applyReplayIterables } from "./play";

converters.set(Array.prototype, function <T>(topic: Array<T>) {
    return new _Array<T>(...topic);
});

class _Array<T> extends Array<T> {
    constructor(...args: any) {
        super(...args);
        return ObservableHandler.createProxy(this);
    }
}

applyReplayIterables(_Array);

export default _Array as typeof Array;
