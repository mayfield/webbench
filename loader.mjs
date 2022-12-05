
async function main() {
    const width = 1024;
    const height = 768;
    const bWidth = 64;
    const bHeight = 48;
    const statusEl = document.querySelector('.status');
    const canvas = document.querySelector('canvas');
    const cCtx = canvas.getContext('2d');
    const frame = cCtx.createImageData(width, height);
    let start;
    let finish;
    const work = [];
    let pending = 0;
    const workers = [];
    let threads = 2;
    let samples = 10;

    document.querySelector('input[name="start"]').addEventListener('click', ev => startBench());

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
        if (pending) {
            statusEl.textContent = `Pending: ${pending}, Elapsed: ${((performance.now() - start) / 1000).toFixed(3)}`;
        } else {
            finish = performance.now();
            statusEl.textContent = `Completed in: ${((finish - start) / 1000).toFixed(3)}`;
        }
    }

    async function startBench() {
        threads = Number(document.querySelector('input[name="threads"]').value);
        samples = Number(document.querySelector('input[name="samples"]').value);

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
            w.postMessage(work.shift());
        }
        start = performance.now();
    }
}

addEventListener('DOMContentLoaded', main);
