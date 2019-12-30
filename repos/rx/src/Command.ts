import Observable from "./Observable";
import { AnyFunction } from "./defs";

export class Command<T extends AnyFunction> extends Observable {
    mock = false;

    execute(...args: Parameters<T>) {
        return [] as ReturnType<T>[];
    }

    query(...args: Parameters<T>) {
        return false;
    }
}

export default Command;