export const sym = Symbol();

declare global {
    interface Object {
        [sym]?: TopicState;
    }
}

export interface Topic {
    [sym]: TopicState;
}

export interface TopicState {
    id: symbol;
    gen: symbol;
    target: object;
    receiver: object;
}

function throwInvalidTopic(): never {
    throw new SyntaxError("The given value is not a topic.");
}

export function assert(topic: unknown) {
    if (typeof topic !== "object") {
        throwInvalidTopic();
    }

    if (topic === null) {
        throwInvalidTopic();
    }

    const state = topic[sym];
    if (state === undefined) {
        throw new SyntaxError("The given object is not a valid topic.");
    }

    return state;
}

export function isTopic(topic: unknown): topic is Topic {
    if (typeof topic !== "object") {
        return false;
    }

    if (topic === null) {
        return false;
    }

    return topic[sym] !== undefined;
}

export function stateOf(topic: unknown) {
    if (typeof topic !== "object") {
        return undefined;
    }

    if (topic === null) {
        return undefined;
    }

    return topic[sym];
}

export default Topic;
