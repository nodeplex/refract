import { AnyFunction, AnyClass } from "./defs";
import { assert } from "./Topic";

export function hoistMethod(f: AnyFunction) {
    function method(...args: any) {
        const target = assert(this).target;
        return f.apply(target, args);
    }

    Object.defineProperty(method, "name", {
        configurable: false,
        enumerable: true,
        writable: false,
        value: `hoist ${f.name}`
    });

    Object.defineProperty(method, "toString", {
        configurable: false,
        enumerable: false,
        writable: false,
        value() {
            return `[${this.name}]`;
        }
    });

    return method;
}

export function hoist<T extends AnyClass>(cls: T) {
    class Hoister extends cls {}

    const descriptors = Object.getOwnPropertyDescriptors(cls.prototype);
    for (const key of Reflect.ownKeys(descriptors)) {
        const descriptor = descriptors[key as any];
        const { value, get, set } = descriptor;
        if (typeof value === "function") {
            descriptor.value = hoistMethod(value);
        }

        if (get !== undefined) {
            descriptor.get = hoistMethod(get);
        }

        if (set !== undefined) {
            descriptor.set = hoistMethod(set);
        }
    }

    delete descriptors.constructor;
    Object.defineProperties(Hoister.prototype, descriptors);

    return Hoister as typeof cls;
}

export default hoist;
