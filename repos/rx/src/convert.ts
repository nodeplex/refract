export const converters = new WeakMap<object, (value: any) => any>();

export interface Convert {
    <T>(topic: T): T;
}

function convert(topic: any): any {
    switch (typeof topic) {
        case "object":
        case "function":
            break;

        default:
            return topic;
    }

    if (topic === null) {
        return topic;
    }

    const proto = Object.getPrototypeOf(topic);
    if (proto === null) {
        return topic;
    }

    const converter = converters.get(proto);
    if (converter === undefined) {
        return topic;
    }

    return converter(topic);
}

export default convert as Convert;
