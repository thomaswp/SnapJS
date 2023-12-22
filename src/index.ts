import { Extension } from "sef";
import { JSThreadManager } from "./Interpreter";
import { createBlocks } from "./blocks";

export class SnapJSExtension extends Extension {

    init() {
        console.log('SnapJSExtension init');
        let interpreter = new JSThreadManager();
        window["interp"] = interpreter;
        interpreter.init();
        interpreter.test();

        createBlocks(this.blocks);
        this.blocks.refresh();
    }
}

const extension = new SnapJSExtension();
extension.register();