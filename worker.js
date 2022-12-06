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
        while (retries++ < 8) {
            let s = retries > 1 ? samples * (0.80 + (Math.random() * 0.40)) | 0 : samples;
            try {
                offt = mod._renderBlock(s, x, y, width, height);
                break;
            } catch(e) {
                console.warn(retries, x, y, e);
                await sleep(1);
            }
        }
        if (retries > 1) {
            console.error(retries, x, y);
        }
        const size = width * height * 3;
        const block = offt !== undefined ? mod.HEAPU8.slice(offt, offt + size) : new Uint8array(size);
        postMessage({x, y, width, height, block});
        await sleep(0);
    }
}
