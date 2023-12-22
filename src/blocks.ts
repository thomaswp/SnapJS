import { Blocks } from "sef";
import { JSThread } from "./Interpreter";
import { Process } from "sef/src/snap/Snap";

export function createBlocks(blockFactory: Blocks.BlockFactory) {

    const runFunc = function(this: Process, code) {
        if (!this.context.jsThread) {
            this.context.jsThread = new JSThread(code, this.receiver);
        }
        const jsThread = this.context.jsThread as JSThread;
        console.log('stepping');
        // TODO: Wait based on the flashTime
        jsThread.stepUntilYield();
        if (jsThread.stopped) {
            this.context.jsThread = null;
            console.log(jsThread.result);
            return jsThread.result;
        }
        this.pushContext('doYield');
        this.pushContext();
    }

    const runJS = blockFactory.registerBlock(new Blocks.Block(
        "runJS",
        "run javascript %code",
        [],
        Blocks.BlockType.Command,
        "operators",
    ));
    runJS.addProcessAction(runFunc);

    const runJSReporter = blockFactory.registerBlock(new Blocks.Block(
        "reportJS",
        "report javascript %code",
        [],
        Blocks.BlockType.Reporter,
        "operators",
    ));
    runJSReporter.addProcessAction(runFunc);

}