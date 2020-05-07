import React, { useContext } from 'react';
import './App.css';

import ix from "@rflect/ix";
import rx from '@rflect/rx';

@rx.extend
class Person {
    name: string;

    constructor(name: string) {
        this.name = name;
    }
}

const add = new ix.Command<() => void>();
const persons = ix.createItemsContext<Person[]>();

interface ButtonProps {
    command: ix.Command<() => void>;
}

function Button(props: ButtonProps) {
    props = ix.useAtoms(props);

    const vis = ix.useVisuals({
        Visual() {
            ix.useJournal();
            console.log("render Button");
        
            const { command } = props;
            const disabled = !command.query();
            return <button disabled={disabled} children="add" onClick={x => command.execute()} />;                
        }
    });

    return ix.useMemoVisual(vis, props);
}

function App(props: any) {
    props = ix.useAtoms(props);

    const model = ix.useModel(class {
        name = "";
        items = new rx.Array<Person>();
    });

    const vis = ix.useVisuals({
        Add() {
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
        },

        Person() {
            ix.useJournal();

            const [model] = useContext(persons);
            return <React.Fragment children={model.name} />;    
        },

        Visual() {
            const jsx =
            <div>
                <vis.Add />
                <hr />
                <ix.Presenter context={persons} items={model.items}>
                    <div>
                        <vis.Person />
                    </div>
                </ix.Presenter>
            </div>;

            return jsx;
        }
    });

    return ix.useMemoVisual(vis, props);
}

export default App;
