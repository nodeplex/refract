import rx from "@rflect/rx";
import { createElement, ElementType, FC, ComponentProps, useMemo, useRef } from "react";

import { useAtom, useAtoms } from "./atom";

export function useConstant<T>(f: () => T) {
    return useMemo(f, []);
}

export function useInstance<T extends rx.AnyClass>(cls: T, ...args: ConstructorParameters<T>) {
    return useConstant(() => new cls(...args)) as InstanceType<T>;
}

export function useModel<T extends rx.AnyClass>(cls: T, ...args: ConstructorParameters<T>) {
    return useInstance(rx.extend(cls), ...args);
}

export function useDiff<T>(state: T) {
    const ref = useRef<Partial<T>>({});
    const { current } = ref;
    const result: Partial<T> = Object.create(null);
    for (const key in state) {
        const value = current[key];
        if (!Object.is(value, state[key])) {
            result[key] = value;
        }
    }

    for (const key in current) {
        const value = current[key];
        if (!Object.is(value, state[key])) {
            result[key] = value;
        }
    }
    
    ref.current = state;
    return result;
}

function flushAfter(f: Function) {
    return function (...args: any) {
        try {
            return f.apply(undefined, args);
        } finally {
            rx.flush();
        }
    };
}

export function useComponent<T extends ElementType<{}>>(type: T, partial: Partial<ComponentProps<T>> = {}): FC<ComponentProps<T>> {
    function render(props: ComponentProps<T>) {
        const state = useAtoms<any>({
            ...partial,
            ...props
        }, flushAfter);

        const deps = [type, ...Object.keys(state), ...Object.values(state)];
        return useMemo(() => createElement(type, state), deps);
    }   

    return useAtom(render);
}

export default undefined;
