export interface AnyClass {
    new (...args: any[]): any;
}

export interface AnyFunction {
    (...args: any[]): any;
}

export type Mutable<T> = {
    -readonly [K in keyof T]: T[K];
};

export type Member<T> = (keyof T) | (T extends {
    delete(key: infer K): boolean;
} ? K : never);

export default undefined;
