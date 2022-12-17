#!/usr/bin/env node

const os = require('node:os');
const crypto = require('node:crypto');
const fetch = require('node-fetch');
const {Worker} = require('node:worker_threads');
const renderP = require('../bin/render.js');
const readline = require('node:readline');
const {ArgumentParser} = require('argparse');

const rl = readline.createInterface({input: process.stdin, output: process.stdout});
const prompt = query => new Promise(resolve => rl.question(query, resolve));

const officialSamples = 200;

const parser = new ArgumentParser({
    description: 'WASM based CPU benchmark',
});
parser.add_argument('-t', '--threads', {default: os.cpus().length});
parser.add_argument('-s', '--samples', {default: officialSamples});
parser.add_argument('-n', '--notes');


function humanNumber(n, precision) {
    return n.toLocaleString(undefined, {minimumFractionDigits: precision, maximumFractionDigits: precision});
}


function systemId() {
    const sha = crypto.createHash('sha1');
    sha.update(os.userInfo().username + os.userInfo().uid + os.hostname() + os.platform() + os.cpus()[0].model);
    return sha.digest('hex');
}


async function main(args) {
    const width = 1024;
    const height = 768;
    const bWidth = 32;
    const bHeight = 24;
    const work = [];
    const workers = [];
    let comps = 0;
    let compTime = 0;
    let start;
    let pending = 0;
    let threads = Number(args.threads);
    let samples = Number(args.samples);
    const official = samples === officialSamples;
    function onWorkerBlock(worker, {x, y, width, height, block, count}) {
        if (work.length) {
            worker.postMessage(work.shift());
        }
        comps += count;
        compTime = performance.now() - start;
        pending--;
    }

    function statusUpdate() {
        const elapsed = pending ? (performance.now() - start) / 1000 : compTime / 1000;
        const mradps = (comps / 1000000 / (compTime / 1000)) || 0;
        const mradsStr = `Megarads: ${humanNumber(mradps, 2)}/s`;
        if (pending) {
            console.info(`Elapsed: ${humanNumber(elapsed, 1)}s, ${mradsStr}`);
            setTimeout(() => statusUpdate(), 1 / 4 * 1000);
        } else {
            console.info(`Completed in: ${humanNumber(elapsed, 1)}s, ${mradsStr}`);
            finish(elapsed, mradps, mradsStr).finally(() => process.exit(0));
        }
    }

    async function finish() {
        if (!official || await prompt('Post this result [yes/no]: ') !== 'yes') {
            return;
        }
        const cpu = os.cpus()[0].model;
        const cores = os.cpus().length;
        await fetch('https://23t1sp28xe.execute-api.us-east-1.amazonaws.com/Release', {
            method: 'POST',
            body: JSON.stringify({
                systemId: systemId(),
                cpu,
                notes: args.notes || '',
                cores,
                threads,
                score: comps / 1000000 / (compTime / 1000),
                time: compTime,
                samples,
                ...getAgentInfo(),
            })
        });
    }

    comps = 0;
    pending = 0;
    while (workers.length < threads) {
        const w = new Worker('./js/node_worker.js');
        await new Promise((resolve, reject) => {
            w.on('message', data => {
                if (data !== 'ready') {
                    reject(new Error('worker statemachine error'));
                } else {
                    resolve();
                }
            }, {once: true});
        });
        w.on('message', data => onWorkerBlock(w, data));
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
    start = performance.now();
    statusUpdate();
    for (const w of workers) {
        const ws = work.shift();
        if (!ws) {
            break;
        }
        w.postMessage(ws);
    }
}


function getAgentInfo() {
    const platform = {
        linux: 'Linux',
        win32: 'Windows',
        darwin: 'macOS',
    }[os.platform()] || 'unknown';
    return {
        browser: `node ${process.version}`,
        platform,
    };
}

main(parser.parse_args());
