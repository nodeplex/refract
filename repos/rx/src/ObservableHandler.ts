import gen from "./gen";
import pulse from "./pulse";

import { AnyFunction, Mutable } from "./defs";
import { TrapEvent } from "./ReflectionEvent";
import { TopicState, sym } from "./Topic";

import { isTopicActive, observers, has } from "./Observer";
import * as dispatch from "./dispatch";

import markers = dispatch.markers;
import journal = dispatch.journal;
import keys = dispatch.keys;
import topics = dispatch.topics;

const meth = Symbol();
const init = Symbol();

declare global {
    export interface Object {
        [init]: boolean;
    }

    export interface Function {
        [meth]: Function;
    }
}

function wrapMethod(f: AnyFunction, key: PropertyKey) {
    if (key === "constructor") {
        Object.defineProperty(f, meth, {
            configurable: false,
            enumerable: false,
            writable: false,
            value: f
        });

        return;
    }

    function execute(...args: any) {
        let result = f.apply(this, args);
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
            journal.push([this, execute, result, args]);
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

    Object.defineProperty(execute, meth, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: execute
    });

    Object.defineProperty(f, meth, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: execute
    });
}

class ObservableHandler implements ProxyHandler<object>, TopicState {
    id = gen.nextKey();
    gen = gen.current;
    target: any;
    proxy: any;

    assert(f: (handler: ObservableHandler) => any) {
        return f(this);
    }

    private constructor(target: object) {
        this.assert = this.assert.bind(this);
        this.target = target;
        this.proxy = new Proxy({}, this);

        let proto = Object.getPrototypeOf(target);
        while (proto[init] !== false && proto !== Object.prototype) {
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

    getPrototypeOf() {
        return Object.getPrototypeOf(this.target);
    }

    setPrototypeOf() {
        return false;
    }

    isExtensible() {
        return Reflect.isExtensible(this.target);
    }

    preventExtensions() {
        return Reflect.preventExtensions(this.target);
    }

    getOwnPropertyDescriptor(__target: never, key: PropertyKey) {
        return Reflect.getOwnPropertyDescriptor(this.target, key);
    }

    defineProperty(__target: never, key: PropertyKey, descriptor:  PropertyDescriptor) {
        if (key === sym) {
            return false;
        }

        if (Reflect.defineProperty(this.target, key, descriptor)) {
            keys.push(key);
            topics.push(this.proxy);
            pulse();

            return true;
        }

        return false;
    }

    has(__target: never, key: PropertyKey) {
        return Reflect.has(this.target, key);
    }

    get(__target: never, key: PropertyKey) {
        if (key === sym) {
            return this;
        }

        let result = Reflect.get(this.target, key, this.proxy);
        if (typeof result === "function") {
            result = result[meth] ?? result;
        }

        if (markers.size > 0) {
            journal.push([this.proxy, key, result]);
        }

        return result;
    }

    set(__target: never, key: PropertyKey, value: any) {
        if (key === sym) {
            return false;
        }

        if (Reflect.set(this.target, key, value, this.proxy)) {
            keys.push(key);
            topics.push(this.proxy);
            pulse();

            return true;
        }

        return false;
    }

    deleteProperty(__target: never, key: PropertyKey) {
        if (key === sym) {
            return false;
        }

        if (Reflect.deleteProperty(this.target, key)) {
            keys.push(key);
            topics.push(this.proxy);
            pulse();

            return true;
        }

        return false;
    }
    
    ownKeys(__target: never) {
        return Reflect.ownKeys(this.target);
    }
}

export default ObservableHandler;
