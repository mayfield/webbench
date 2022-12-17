/* global importScripts, renderWASM */

importScripts('../bin/render.js?v=3');


let working;
const workQueue = [];
let mod;

renderWASM({locateFile: url => '../bin/' + url}).then(m => {
    mod = m;
    postMessage('ready');
});

addEventListener('message', ev => {
    workQueue.push(ev.data);
    if (!working) {
        worker();
    }
});


function worker() {
    working = true;
    _worker().finally(() => working = false);
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function _worker() {
    while (workQueue.length) {
        const {samples, x, y, width, height} = workQueue.shift();
        let retries = 0;
        let offt;
        // Chrome and Safari have extremely shallow recursion limits so we need this. :(
        while (retries++ < 5) {
            let s = retries > 1 ? samples * (0.80 + (Math.random() * 0.40)) | 0 : samples;
            try {
                offt = mod._renderBlock(s, x, y, width, height);
                if (!offt) {
                    throw new Error("WASM renderBlock error (likely malloc)");
                }
                break;
            } catch(e) {
                console.warn(retries, x, y, e);
                await sleep(1);
            }
        }
        const dv = new DataView(mod.HEAPU8.buffer, offt, 4);
        const count = dv.getUint32(0, /*le*/ true); // WASM is always LE
        const size = width * height * 3;
        const block = offt ? mod.HEAPU8.slice(offt + 4, offt + 4 + size) :
            new Uint8Array(size).map(() => Math.random() * 256);
        postMessage({x, y, width, height, block, count});
    }
}
