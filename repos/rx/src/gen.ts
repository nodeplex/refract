
let current = Symbol("gen.0");
let genId = 0;
let keyId = 0;

const gen0 = current;

const gen = {
    gen0,

    get current() {
        return current;
    },

    next() {
        keyId = 0;
        return current = Symbol(`gen.${++genId}`);
    },
    
    nextKey() {
        return Symbol(`gen.${genId}.${keyId++}`);
    }
}

export default gen;
