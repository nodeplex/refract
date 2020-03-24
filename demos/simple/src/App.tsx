import React from 'react';
import './App.css';

import ix from "@rflect/ix";
import rx from '@rflect/rx';

class Person extends rx.Observable {
    name: string;

    constructor(name: string) {
        super();
        this.name = name;
    }
}

class PersonList extends rx.Observable {
    name = "";
    items = new rx.Array<Person>();
}

const add = new rx.Command<() => void>();

function Button(props: { command: typeof add }) {
    const { command } = props;
    function Visual() {
        ix.useJournal();
        console.log("render Button");

        const disabled = !command.query();
        return <button disabled={disabled} children="add" onClick={x => command.execute()} />;        
    }

    return ix.useMemoVisual(Visual, props);
}

function App(props: any) {
    if (ix.useStaticVisual()) {
        return null;
    }

    const model = new PersonList();
    function Add() {
        ix.useJournal();
        console.log("render Add");    

        const name = model.name;
        ix.useTrap(add, "query", function (event) {
            event.result = name.length > 0;
        });

        ix.useTrap(add, "execute", function (event) {
            model.items.push(new Person(name));
            model.name = "";
        });

        const jsx =
        <React.Fragment>
            <input type="text" value={name} onChange={e => (model.name = e.target.value)} />
            <hr />
            <Button command={add} />
        </React.Fragment>;

        return jsx;
    }

    const context = ix.bindItem<Person>();
    const jsx =
    <div>
        <Add />
        <hr />
        <ix.Presenter context={context} items={model.items}>
            <div>
                <ix.Binder context={context} visual={ix.Text} value={x => x.name} />
            </div>
        </ix.Presenter>
    </div>;

    return jsx;
}

export default App;
