import * as Interpreter from 'js-interpreter';
import { OverrideRegistry, Snap } from 'sef';
import { extend } from 'sef/src/extend/OverrideRegistry';
import { List, SpriteMorph, StageMorph, ThreadManager } from 'sef/src/snap/Snap';

function convertSnapObject(obj, interpreter: Interpreter) {
    if (obj instanceof List) {
        console.log('converting list', obj);
        return interpreter.nativeToPseudo(obj.contents.map(convertSnapObject));
    }
    return obj;
}

function convertInterpreterObject(obj, interpreter: Interpreter) {
    if (obj instanceof Interpreter.Object) {
        console.log('converting object', obj);
        obj = interpreter.pseudoToNative(obj);
    }
    return convertObjectToSnap(obj);
}

function convertObjectToSnap(obj) {
    if (obj instanceof Array) {
        return new List(obj.map(convertObjectToSnap));
    }
    return obj;
}

export class JSThread { 
    
    originalCode: string;
    interpreter: Interpreter;
    receiver: SpriteMorph | StageMorph;
    get stopped() { return this.interpreter.getStatus() == Interpreter.Status.DONE; }
    lastRunNode;
    get result() { return convertInterpreterObject(this.interpreter.value, this.interpreter); }

    constructor(code: string, receiver: SpriteMorph | StageMorph) {
        this.originalCode = code;
        this.receiver = receiver;
        this.interpreter = new Interpreter(code, this.createAPI());
    }

    run() {
        this.interpreter.run();
        return this.result;
    }

    shouldYield() {
        if (this.stopped) return true;
        return [
            "WhileStatement",
            "ForStatement",
            "ReturnStatement",
        ].includes(this.lastRunNode.type);
    }

    stepUntilYield() {
        // Do this twice because loops show up in the context on the
        // way in and the way out.
        this.stepUntilYieldOnce();
        this.stepUntilYieldOnce();
    }

    private stepUntilYieldOnce() {
        do {
            this.step();
        } while (!this.shouldYield());
    }

    step() {
        this.interpreter.step();
        let stack = this.interpreter.stateStack;
        let topState = stack[stack.length - 1];
        this.lastRunNode = topState.node;
    }

    createAPI() {
        const receiver = this.receiver;
        return function(interpreter, scope) {
            // const spriteObject = interpreter.nativeToPseudo({});
            // interpreter.setProperty(scope, 'Sprite', spriteObject);

            const threads = Snap.stage.threads;
            for (let key of Object.keys(SpriteMorph.prototype.blocks)) {
                let block = SpriteMorph.prototype.blocks[key];
                if (block.type === 'hat') continue; // TODO: handle
                // if (block.type === 'reporter') return; // TODO: handle

                const fKey = key;
                const wrapper = function() {
                    const args = Array.prototype.slice.call(arguments);
                    if (threads[fKey]) {
                        // console.log('calling threads', fKey, args);
                        return convertSnapObject(threads[fKey].apply(threads, args), interpreter);
                    } else if (receiver[fKey]) {
                        // console.log('calling sprite', fKey, args);
                        return convertSnapObject(receiver[fKey].apply(receiver, args), interpreter);
                    }
                };

                interpreter.setProperty(scope, key, interpreter.createNativeFunction(wrapper));
            }

            const globals = Snap.globalVariables;
            console.log("!", Object.keys(globals.vars));
            for (let key of Object.keys(globals.vars)) {
                console.log('setting global', key);
                interpreter.setProperty(scope, key, Interpreter.VALUE_IN_DESCRIPTOR, {
                    get: interpreter.createNativeFunction(() => convertSnapObject(Snap.IDE.getVar(key), interpreter)),
                    set: interpreter.createNativeFunction(function(value) { 
                        Snap.IDE.setVar(key, convertInterpreterObject(value, interpreter));
                    }),
                });
                console.log('setting global', key);
            }
        };
    }

}

export class JSThreadManager {

    threads: JSThread[] = [];

    init() {
        const threadManager = extend(ThreadManager.prototype);
        threadManager.step.after(() => {
            for (let i = 0; i < this.threads.length; i++) {
                const thread = this.threads[i];
                thread.stepUntilYield();
                // console.log("One loop");
                if (thread.stopped) {
                    console.log('removing thread', thread.originalCode);
                    this.threads.splice(i, 1);
                    i--;
                }
            }
        });
    }

    start(code: string) {
        const thread = new JSThread(code, Snap.currentSprite);
        this.threads.push(thread);
        return thread;
    }

    run(code: string) {
        return new JSThread(code, Snap.currentSprite).run();
    }

    test() {
        const code = `
            this.forward(50);
            this.turn(90);
        `;
        console.log(this.run(code));        
    }
}
