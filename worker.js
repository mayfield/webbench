importScripts('render.js?_dc=' + Math.random());


let working;
const workQueue = [];
let mod;

renderWASM().then(m => {
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
        const size = width * height * 3;
        const block = offt ? mod.HEAPU8.slice(offt, offt + size) :
            new Uint8Array(size).map(() => Math.random() * 256);
        postMessage({x, y, width, height, block});
    }
}
