import React from 'react';
import './App.css';

import ix from "@oasix/ix";
import rx from '@oasix/rx';

class Model extends rx.Observable {
    name = "";
}

const next = new rx.Command<() => void>();

function Button(props: { command: typeof next }) {
    const { command } = props;

    function Visual() {
        ix.useJournal();
        console.log("render Button");

        const disabled = !command.query();
        return <button disabled={disabled} children="test" />;        
    }

    return ix.useMemoVisual(Visual, props);
}

function App(props: any) {
    if (ix.useStaticVisual()) {
        return null;
    }

    const model = new Model();
    function Visual() {
        ix.useJournal();
        console.log("render App");    

        const name = model.name;
        ix.useTrap(next, "query", function (event) {
            event.result = name.length > 0;
        });
    
        return (
            <div>
                <input type="text" value={name} onChange={e => (model.name = e.target.value)} />
                <hr />
                <Button command={next} />
            </div>
        );
    }

    return <Visual />;
}

export default App;
