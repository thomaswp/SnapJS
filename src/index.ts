import { Extension } from "sef";
import { JSThreadManager } from "./Interpreter";

export class SnapJSExtension extends Extension {

    init() {
        console.log('SnapJSExtension init');
        let interpreter = new JSThreadManager();
        window["interp"] = interpreter;
        interpreter.init();
        interpreter.test();
    }
}

const extension = new SnapJSExtension();
extension.register();