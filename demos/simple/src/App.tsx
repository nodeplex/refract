import React from 'react';
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

interface ButtonProps {
    command: ix.Command<() => void>;
}

function Button(props: ButtonProps) {
    const [jsx] = ix.useVisuals(props, {
        Stem() {
            ix.useJournal();
            console.log("render Button");
        
            const { command } = props;
            const disabled = !command.query();
            return <button disabled={disabled} children="add" onClick={x => command.execute()} />;                
        }
    });

    return jsx;
}

function App() {
    const model = ix.useModel(class {
        name = "";
        items = new rx.Array<Person>();
    });

    const [jsx, vis] = ix.useVisuals({}, {
        Add() {
            ix.useJournal();
            console.log("render Add");

            const { name } = model;
            ix.useTrap(add, "query", function (event) {
                event.result = name.length > 0;
            });
    
            ix.useTrap(add, "execute", function (event) {
                model.items.push(new Person(name));
                model.name = "";
            });

            const NameInput = ix.useComponent("input", {
                onChange(event) {
                    model.name = event.target.value;
                }
            });

            const jsx =
            <React.Fragment>
                <NameInput type="text" value={name} />
                <hr />
                <Button command={add} />
            </React.Fragment>;

            return jsx;
        },

        Person(props: ix.BindingProps<Person[]>) {
            ix.useJournal();

            const [model] = props.binding;
            return <React.Fragment children={model.name} />;    
        },

        Stem() {
            const jsx =
            <div>
                <vis.Add />
                <hr />
                <ix.Presenter type={vis.Person} items={model.items}>
                    <div>
                        <ix.PresenterContent />
                    </div>
                </ix.Presenter>
            </div>;

            return jsx;
        }
    });

    return jsx;
}

export default App;
