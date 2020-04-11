import rx from "@rflect/rx";

export class Command<T extends rx.AnyFunction> extends rx.Observable {
    mock = false;

    execute(...args: Parameters<T>) {
        return [] as ReturnType<T>[];
    }

    query(...args: Parameters<T>) {
        return false;
    }
}

export default Command;