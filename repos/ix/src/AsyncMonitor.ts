import rx from "@rflect/rx";

function observe<T>(promise: Promise<T>) {
    const result = {
        finished: false,
        rejected: false,
        error: undefined as any,
        value: undefined as any as T
    };

    function finish(value: T) {
        result.finished = true;
        result.value = value;
    }

    function reject(error: any) {
        result.rejected = true;
        result.error = error;
    }

    type Pending = {
        finished: false;
        rejected: false;
    };

    type Success = {
        finished: true;
        rejected: false;
        value: T;
    };

    type Failure = {
        finished: false;
        rejected: true;
        error: any;
    };

    type Result = [Pending | Success | Failure, Promise<void>];

    return [result, promise.then(finish, reject)] as Result;
}

export class AsyncMonitor<T> extends rx.Observable {
    #actors = new Set<symbol>();
    #controller!: AbortController;
    #ticket!: Promise<void>;
    #waiter!: Promise<void>;

    failure!: boolean;
    pending!: boolean;
    success!: boolean;

    readonly errors = new rx.Array<any>();
    readonly results = new rx.Array<T>();

    private init() {
        const { signal } = this.#controller = new AbortController();
        this.#ticket = new Promise<void>(function (resolve) {
            signal.addEventListener("abort", () => resolve());
        });

        this.#actors.clear();
        this.errors.length = 0;
        this.results.length = 0;
        this.#waiter = Promise.resolve();

        this.failure = false;
        this.pending = false;
        this.success = false;
    }

    private async observe(id: symbol, actor: Promise<T>, ticket: Promise<void>, waiter: Promise<void>) {
        const [result, promise] = observe(actor);
        await Promise.race([promise, ticket, waiter]);

        if (this.#actors.delete(id)) {
            if (result.finished) {
                this.results.push(result.value);
            }

            if (result.rejected) {
                this.errors.push(result.error);
                this.failure = true;
            }

            if (this.#actors.size < 1) {
                this.pending = false;
                this.success = this.errors.length > 0;
            }
        }
    }

    constructor() {
        super();

        this.init();
        this.freeze = this.freeze.bind(this);
    }

    get signal() {
        return this.#controller.signal;
    }

    get ticket() {
        return this.#ticket;
    }

    get waiter() {
        return this.#waiter;
    }

    add(op: T | Promise<T>) {
        const id = Symbol();
        if (Object.isFrozen(this)) {
            return id;
        }

        const actor = Promise.resolve(op);
        const { ticket, waiter } = this;
        this.#actors.add(id);
        this.failure = false;
        this.pending = true;
        this.success = false;
        this.#waiter = this.observe(id, actor, ticket, waiter);

        return id;
    }

    reset() {
        this.#controller.abort();
        this.init();
    }

    freeze() {
        if (!Object.isFrozen(this)) {
            this.#controller.abort();
            this.init();

            this.#controller.abort();

            Object.freeze(this);
            Object.freeze(this.errors);
            Object.freeze(this.results);
        }
    }

    isCancelled(id: symbol) {
        return !this.#actors.has(id);
    }

    isPending(id: symbol) {
        return this.#actors.has(id);
    }
}

export default AsyncMonitor;
