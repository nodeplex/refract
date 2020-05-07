import rx from "@rflect/rx";
import { useMemo } from "react";

export function useConstant<T>(f: () => T) {
    return useMemo(f, []);
}

export function useInstance<T extends rx.AnyClass>(cls: T, ...args: ConstructorParameters<T>) {
    return useConstant(() => new cls(...args)) as InstanceType<T>;
}

export function useModel<T extends rx.AnyClass>(cls: T, ...args: ConstructorParameters<T>) {
    return useInstance(rx.extend(cls), ...args);
}

export default undefined;
