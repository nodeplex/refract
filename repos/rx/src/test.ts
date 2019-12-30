import rx from "./index";
//import "../ix";

//const cmd = new rx.Command<() => string>();

class TestObject extends rx.Observable {

    name: string | undefined;

    test(name: string) {
        return name + " dad";
    }
}

const x = new TestObject();
function listener(event: rx.ReflectionEvent) {
    console.log(event);
}

rx.on(x, listener);

async function test() {
    rx.mark();
    x.name = "garth";
    x.name;

    await rx.pulse();

    x.test("mark");

    await rx.pulse();

    console.log("-- done");
}

test();
