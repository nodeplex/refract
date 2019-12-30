export interface AnyClass {
    new (...args: any[]): any;
}

export interface AnyFunction {
    (...args: any[]): any;
}

export type Mutable<T> = {
    -readonly [K in keyof T]: T[K];
};

export default undefined;
