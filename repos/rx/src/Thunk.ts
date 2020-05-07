import gen from "./gen";

import { AnyFunction, Mutable } from "./defs";
import { TrapEvent } from "./ReflectionEvent";
import { TopicState, sym, isTopic } from "./Topic";

import { isTopicActive, observers, has } from "./Observer";
import { converters } from "./convert";

import * as dispatch from "./dispatch";

import markers = dispatch.markers;
import journal = dispatch.journal;

declare module "./convert" {
    interface Convert {
        <T extends Thunk<any>>(f: T): T;
        <T extends AnyFunction>(f: T): Thunk<T>;
    }
}

converters.set(Function.prototype, function (f: AnyFunction) {
    if (isTopic(f)) {
        return f;
    }

    return wrapMethod(f);
});
    
function wrapMethod(f: AnyFunction) {
    function forward(...args: any) {
        let result = f.apply(forward, args);
        if (isTopicActive(forward)) {
            const event = Object.create(TrapEvent.prototype) as Mutable<TrapEvent>;
            event.topic = forward;
            event.method = forward;
            event.key = "forward";
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
            journal.push([forward, forward, result, args]);
        }

        return result;
    }

    Object.defineProperty(Function.prototype, "forward", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: forward
    });

    Object.defineProperty(Function.prototype, sym, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: <TopicState>{
            id: gen.nextKey(),
            gen: gen.current,
            target: forward
        }
    });

    return forward;
}

export type Thunk<F extends AnyFunction> = F & {
    forward: Thunk<F>;
};
