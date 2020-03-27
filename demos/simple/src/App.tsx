import React, { useContext } from 'react';
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
const persons = ix.createItemsContext<Person[]>();

interface ButtonProps {
    command: rx.Command<() => void>;
}

const Button = ix.journal(function (props: ButtonProps) {
    console.log("render Button");

    const { command } = props;
    const disabled = !command.query();
    return <button disabled={disabled} children="add" onClick={x => command.execute()} />;        
});

const App = ix.memo(function (props: any) {
    const model = ix.useInstance(PersonList);
    const AddVisual = ix.useJournal(function () {
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
    });

    const PersonVisual = ix.useJournal(function () {
        const [model] = useContext(persons);
        return <React.Fragment children={model.name} />;
    });

    const jsx =
    <div>
        <AddVisual />
        <hr />
        <ix.Presenter context={persons} items={model.items}>
            <div>
                <PersonVisual />
            </div>
        </ix.Presenter>
    </div>;

    return jsx;
});

export default App;
