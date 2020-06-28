import ObservableHandler from "./ObservableHandler";
import { converters } from "./convert";

converters.set(Promise.prototype, function <T>(topic: Promise<T>) {
    const result = new _Promise<T>();
    result.resolve(topic);
    return result;
});

export type PromiseState = "unknown" | "pending" | "success" | "failure";

export class _Promise<T> extends Promise<T> {
    hasError(): this is { error: unknown } {
        return this.state === "failure";
    }

    hasResult(): this is { result: T } {
        return this.state === "success";
    }

    error?: unknown;
    result?: T;

    resolve!: (result: T | PromiseLike<T>) => void;
    state: PromiseState = "unknown";

    constructor() {
        super(x => this.resolve = x);

        const resolve = this.resolve;
        this.resolve = x => {
            if (this.state === "unknown") {
                this.state = "pending";
                resolve(x);
            }
        };

        this.then(
            x => {
                this.result = x;
                this.state = "success";
            },
            x => {
                this.error = x;
                this.state = "failure";    
            }
        );

        return ObservableHandler.createProxy(this);
    }
}

export default _Promise;
