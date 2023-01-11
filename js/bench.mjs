const officialSamples = 200;
const officialDrawStyle = 'circleout';


function humanNumber(n, precision) {
    return n.toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
    });
}


async function main() {
    const width = 1024;
    const height = 768;
    const bWidth = 32;
    const bHeight = 24;
    const statusEl = document.querySelector('.status');
    const canvas = document.querySelector('canvas');
    const cCtx = canvas.getContext('2d');
    const work = [];
    const workers = [];
    let comps = 0;
    let compTime = 0;
    let start;
    let pending = 0;
    let threads = navigator.hardwareConcurrency || 2;
    let samples = officialSamples;
    let official = true;
    let systemId = localStorage.getItem("system-id");
    if (!systemId) {
        if (self.crypto && self.crypto.randomUUID) {
            systemId = crypto.randomUUID();
        } else {
            systemId = (Math.random() * (1<<30) | 0).toString(16) +
                (Math.random() * (1<<30) | 0).toString(16);
        }
        localStorage.setItem('system-id', systemId);
    }
    const threadsEl = document.querySelector('input[name="threads"]');
    threadsEl.value = threads;
    const samplesEl = document.querySelector('input[name="samples"]');
    samplesEl.value = samples;
    const startEl = document.querySelector('input[name="start"]');
    const drawStyleEl = document.querySelector('select[name="drawstyle"]');
    startEl.addEventListener('click', ev => {
        startEl.disabled = true;
        startBench();
    });
    const officialEl = document.querySelector('input[name="official"]');
    officialEl.addEventListener('input', ev => {
        official = ev.currentTarget.checked;
        if (official) {
            samplesEl.value = officialSamples;
            drawStyleEl.value = officialDrawStyle;
        }
        document.querySelector('.playground').classList.toggle('disabled', official);
    });
    const dialog = document.querySelector('dialog');
    dialog.addEventListener('close', async ev => {
        if (dialog.returnValue === 'cancel') {
            return;
        }
        const cpu = dialog.querySelector('[name="cpu"]').value;
        const notes = dialog.querySelector('[name="notes"]').value;
        const cores = dialog.querySelector('[name="cores"]').value;
        localStorage.setItem("last-cpu", cpu);
        localStorage.setItem("last-notes", notes);
        localStorage.setItem("last-cores", cores);
        let userAgent = {platform: '', browser: ''};
        try {
            userAgent = getAgentInfo();
        } catch(e) {
            console.error("Failed to get user agent info:", e);
        }
        await fetch('https://23t1sp28xe.execute-api.us-east-1.amazonaws.com/Release', {
            method: 'POST',
            body: JSON.stringify({
                systemId,
                cpu,
                notes,
                cores,
                threads,
                score: comps / 1000000 / (compTime / 1000),
                time: compTime,
                samples,
                ...userAgent,
            })
        });
    });

    function onWorkerBlock(worker, {x, y, width, height, block, count}) {
        if (work.length) {
            worker.postMessage(work.shift());
        }
        comps += count;
        compTime = performance.now() - start;
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
        const elapsed = pending ? (performance.now() - start) / 1000 : compTime / 1000;
        const mradps = (comps / 1000000 / (compTime / 1000)) || 0;
        const mradsStr = `Megarads: ${humanNumber(mradps, 2)}/s`;
        if (pending) {
            statusEl.textContent = `Elapsed: ${humanNumber(elapsed, 1)}s, ${mradsStr}`;
            setTimeout(() => requestAnimationFrame(statusUpdate), 1 / 10 * 1000);
        } else {
            statusEl.textContent = `Completed in: ${humanNumber(elapsed, 1)}s, ${mradsStr}`;
            startEl.disabled = false;
            if (official) {
                const dialog = document.querySelector('dialog');
                dialog.querySelector('.score').textContent = humanNumber(comps / 1000000 / elapsed, 2);
                dialog.querySelector('[name="cpu"]').value = localStorage.getItem("last-cpu");
                dialog.querySelector('[name="notes"]').value = localStorage.getItem("last-notes");
                dialog.querySelector('[name="cores"]').value = localStorage.getItem("last-cores") ||
                    navigator.hardwareConcurrency || 1;
                dialog.showModal();
            }
        }
    }

    async function startBench() {
        comps = 0;
        pending = 0;
        threads = Number(threadsEl.value);
        samples = Number(samplesEl.value);
        while (workers.length < threads) {
            const w = new Worker('../js/worker.js?v=3');
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
        const drawStyle = drawStyleEl.value;
        if (drawStyle === 'circleout' || drawStyle === 'circlein') {
            work.sort((a, b) => {
                const aDist = (a.x - (width / 2)) ** 2 + (a.y - (height / 2)) ** 2;
                const bDist = (b.x - (width / 2)) ** 2 + (b.y - (height / 2)) ** 2;
                return drawStyle === 'circleout' ? aDist - bDist : bDist - aDist;
            });
        } else if (drawStyle === 'random') {
            for (let i = 0; i < work.length; i++) {
                const idx = Math.random() * work.length | 0;
                [work[idx], work[i]] = [work[i], work[idx]];
            }
        } else if (drawStyle === 'bottomup') {
            work.reverse();
        } else if (drawStyle === 'ltr' || drawStyle === 'rtl') {
            work.sort((a, b) => drawStyle === 'ltr' ? a.x - b.x : b.x - a.x);
        }
        cCtx.clearRect(0, 0, canvas.width, canvas.height);
        start = performance.now();
        statusUpdate();
        for (let i = 0; i < 2; i++) {
            for (const w of workers) {
                const ws = work.shift();
                if (!ws) {
                    break;
                }
                w.postMessage(ws);
            }
        }
    }
}


function getAgentInfo() {
    if (navigator.userAgentData) {
        const b = navigator.userAgentData.brands.at(-1);
        const browser = `${b.brand} ${b.version}`;
        return {browser, platform: navigator.userAgentData.platform};
    } else {
        !!navigator.userAgent.match(/ Mobile[/ ]/);
        const ua = navigator.userAgent;
        const platform = ua.match(/Windows NT/) ? 'Windows' :
            ua.match(/Android/) ? 'Android' :
            ua.match(/Linux/) ? 'Linux' :
            ua.match(/Macintosh/) ? 'macOS' :
            ua.match(/iPad|iPhone/) ? 'iOS' : 'unknown';
        const b = (/^((?!chrome|android).)*safari/i).test(ua) ? 'Safari' :
            ua.match(/ Firefox\//) ? 'Firefox' : 
            ua.match(/ Edg\//) ? 'Microsoft Edge' :
            ua.match(/ Chrome\//) ? 'Chrome' : 'unknown';
        let version;
        if (b === 'Safari') {
            version = ua.match(/ Version\/([^ ]+)/)[1];
        } else if (b === 'Firefox') {
            version = ua.match(/ Firefox\/([^ ]+)/)[1];
        } else if (b === 'Microsoft Edge') {
            version = ua.match(/ Edg\/([0-9]+)/)[1];
        } else if (b === 'Chrome') {
            version = ua.match(/ Chrome\/([0-9]+)/)[1];
        }
        return {browser: version ? `${b} ${version}` : b, platform};
    }
}


document.documentElement.style.setProperty('--device-pixel-ratio', devicePixelRatio);
main();
