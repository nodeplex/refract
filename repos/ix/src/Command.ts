import rx from "@rflect/rx";

export class Command<T extends rx.AnyFunction> extends rx.Observable {
    mock = false;

    execute(..._: Parameters<T>) {
        return [] as ReturnType<T>[];
    }

    query(..._: Parameters<T>) {
        return false;
    }
}

export default Command;
