import gen from "./gen";
import pulse from "./pulse";
import play, { canPlay } from "./play";

import { AnyFunction, Mutable } from "./defs";
import { TrapEvent } from "./ReflectionEvent";
import { TopicState, sym } from "./Topic";

import { isTopicActive, observers, has } from "./Observer";
import * as dispatch from "./dispatch";

import journal = dispatch.journal;
import keys = dispatch.keys;
import markers = dispatch.markers;
import topics = dispatch.topics;

const methods = new WeakMap<object, AnyFunction>();
const protos = new WeakSet<object>();

function wrapMethod(f: AnyFunction, key: PropertyKey) {
    if (key === "constructor") {
        methods.set(f, f);
        return;
    }

    function execute(this: object, ...args: any) {
        const receiver = this[sym]?.receiver ?? this;
        let result: unknown = f.apply(receiver, args);
        if (isTopicActive(this)) {
            const event = Object.create(TrapEvent.prototype) as Mutable<TrapEvent>;
            event.topic = this;
            event.method = execute;
            event.key = key;
            event.args = args;
            event.result = result;

            for (const observer of observers(event.topic)) {
                if (Object.isFrozen(event)) {
                    break;
                }
        
                if (has(event.topic, observer)) {
                    observer(event);
                }
            }

            result = event.result;
        }

        if (markers.size > 0) {
            if (canPlay(result)) {
                const replay = result[play].bind(result);
                journal.push([this, replay, replay(), []]);
            } else {
                journal.push([this, execute, result, args]);
            }
        }

        return result;
    }

    Object.defineProperty(execute, "name", {
        configurable: false,
        enumerable: true,
        writable: false,
        value: `trap ${key.toString()}`
    });

    Object.defineProperty(execute, "toString", {
        configurable: false,
        enumerable: false,
        writable: false,
        value() {
            return `[${this.name}]`;
        }
    });

    methods.set(f, execute);
    methods.set(execute, execute);
}

class ObservableHandler implements ProxyHandler<object>, TopicState {
    id = gen.nextKey();
    gen = gen.current;
    target: object;
    proxy: object;
    receiver: object;

    private constructor(target: object) {
        this.target = target;
        this.proxy = new Proxy(target, this);
        this.receiver = this.proxy;

        let proto = Object.getPrototypeOf(target);
        while (!protos.has(proto) && proto !== Object.prototype) {
            protos.add(proto);

            const descriptors = Object.getOwnPropertyDescriptors(proto);
            for (const key of Reflect.ownKeys(descriptors)) {
                const { value } = descriptors[key as any];
                if (typeof value === "function") {
                    wrapMethod(value, key);
                }
            }

            proto = Object.getPrototypeOf(proto);
        }        
    }

    static createProxy<T extends object>(target: T) {
        const handler = new this(target);
        return handler.proxy as T;
    }

    static createTracer<T extends object>(target: T) {
        const handler = new this(target);
        handler.receiver = target;
        return handler.proxy as T;
    }

    setPrototypeOf() {
        return false;
    }

    defineProperty(target: object, key: PropertyKey, descriptor:  PropertyDescriptor) {
        if (key === sym) {
            return false;
        }

        if (Reflect.defineProperty(target, key, descriptor)) {
            keys.push(key);
            topics.push(this.proxy);
            pulse();

            return true;
        }

        return false;
    }

    has(target: object, key: PropertyKey) {
        if (key === sym) {
            return false;
        }

        return Reflect.has(target, key);
    }

    get(target: object, key: PropertyKey) {
        if (key === sym) {
            return this;
        }

        let result = Reflect.get(target, key, this.receiver);
        if (typeof result === "function") {
            result = methods.get(result) ?? result;
        }

        if (markers.size > 0) {
            journal.push([this.proxy, key, result]);
        }

        return result;
    }

    set(target: object, key: PropertyKey, value: any) {
        if (key === sym) {
            return false;
        }

        if (Reflect.set(target, key, value, this.receiver)) {
            keys.push(key);
            topics.push(this.proxy);
            pulse();

            return true;
        }

        return false;
    }

    deleteProperty(target: object, key: PropertyKey) {
        if (key === sym) {
            return false;
        }

        if (Reflect.deleteProperty(target, key)) {
            keys.push(key);
            topics.push(this.proxy);
            pulse();

            return true;
        }

        return false;
    }
}

export default ObservableHandler;
