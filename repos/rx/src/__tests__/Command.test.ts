import rx from "../index";

describe("Command", function () {
    test("execute()", function () {
        const x = new rx.Command<() => string>();
        x.execute();
    });
});
