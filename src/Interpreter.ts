import * as Interpreter from 'js-interpreter';
import { OverrideRegistry, Snap } from 'sef';
import { extend } from 'sef/src/extend/OverrideRegistry';
import { SpriteMorph, StageMorph, ThreadManager } from 'sef/src/snap/Snap';


export class JSThread { 
    
    originalCode: string;
    interpreter: Interpreter;
    receiver: SpriteMorph | StageMorph;
    get stopped() { return this.interpreter.getStatus() == Interpreter.Status.DONE; }
    lastRunNode;

    constructor(code: string, receiver: SpriteMorph | StageMorph) {
        this.originalCode = code;
        this.receiver = receiver;
        this.interpreter = new Interpreter(code, this.createAPI());
    }

    run() {
        return this.interpreter.run();
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
                if (block.type === 'hat') return; // TODO: handle
                if (block.type === 'reporter') return; // TODO: handle

                const fKey = key;
                const wrapper = function() {
                    const args = Array.prototype.slice.call(arguments);
                    if (threads[fKey]) {
                        // console.log('calling threads', fKey, args);
                        threads[fKey].apply(threads, args);
                    } else if (receiver[fKey]) {
                        // console.log('calling sprite', fKey, args);
                        receiver[fKey].apply(receiver, args);
                    }
                };

                interpreter.setProperty(scope, key, interpreter.createNativeFunction(wrapper));

            }
        };
    }

}

export class JSThreadManager {

    threads: JSThread[] = [];

    init() {
        const threadManager = extend(ThreadManager.prototype);
        threadManager.step.after(() => {
            for (let j = 0; j < 2; j++) {
                // Run everything twice because of the way the interpreter hits
                // all yield nodes twice
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
