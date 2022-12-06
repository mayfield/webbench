
async function main() {
    const width = 1024;
    const height = 768;
    const bWidth = 32;
    const bHeight = 24;
    const statusEl = document.querySelector('.status');
    const canvas = document.querySelector('canvas');
    const cCtx = canvas.getContext('2d');
    const frame = cCtx.createImageData(width, height);
    const work = [];
    const workers = [];
    let start;
    let finish;
    let pending = 0;
    let threads = navigator.hardwareConcurrency || 2;
    let samples = 100;

    const threadsEl = document.querySelector('input[name="threads"]');
    threadsEl.value = threads;
    const samplesEl = document.querySelector('input[name="samples"]');
    samplesEl.value = samples;
    const startEl = document.querySelector('input[name="start"]');
    startEl.addEventListener('click', ev => {
        startEl.disabled = true;
        startBench()
    });

    function onWorkerBlock(worker, {x, y, width, height, block}) {
        if (work.length) {
            worker.postMessage(work.shift());
        }
        const frame = cCtx.createImageData(width, height);
        let c = 0;
        for (let i = 0; i < block.length; i += 3) {
            frame.data[c++] = block[i];
            frame.data[c++] = block[i+1];
            frame.data[c++] = block[i+2];
            frame.data[c++] = 255;
        }
        cCtx.putImageData(frame, x, y);
        pending--;
    }

    function statusUpdate() {
        if (pending) {
            statusEl.textContent = `Pending: ${pending}, Elapsed: ${((performance.now() - start) / 1000).toFixed(3)}s`;
        } else {
            finish = performance.now();
            statusEl.textContent = `Completed in: ${((finish - start) / 1000).toFixed(3)}s`;
            startEl.disabled = false;
        }
        if (!finish) {
            setTimeout(() => requestAnimationFrame(statusUpdate), 1 / 15 * 1000);
        }
    }

    async function startBench() {
        finish = null;
        threads = Number(threadsEl.value);
        samples = Number(samplesEl.value);

        while (workers.length < threads) {
            const w = new Worker('worker.js');
            await new Promise((resolve, reject) => {
                w.addEventListener('message', ev => {
                    if (ev.data !== 'ready') {
                        reject(new Error('worker statemachine error'));
                    } else {
                        resolve();
                    }
                }, {once: true});
            });
            w.addEventListener('message', ev => onWorkerBlock(w, ev.data));
            workers.push(w);
        }
        while (workers.length > threads) {
            const w = workers.shift();
            w.terminate();
        }


        work.length = 0;
        for (let y = 0; y < height; y += bHeight) {
            for (let x = 0; x < width; x += bWidth) {
                work.push({samples, x, y, width: bWidth, height: bHeight});
                pending++;
            }
        }

        cCtx.clearRect(0, 0, canvas.width, canvas.height);
        for (const w of workers) {
            const ws = work.shift();
            if (!ws) {
                break;
            }
            w.postMessage(ws);
        }
        statusUpdate();
        start = performance.now();
    }
}

addEventListener('DOMContentLoaded', main);
document.documentElement.style.setProperty('--device-pixel-ratio', devicePixelRatio);


