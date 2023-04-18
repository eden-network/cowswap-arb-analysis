import { Engine } from './engine';
import { RunDelayMs } from './config';


async function run() {

    const engine = new Engine();

    while (true) {
        await engine.cycle();
        await new Promise(resolve => setTimeout(resolve, RunDelayMs));
    }


}

run();