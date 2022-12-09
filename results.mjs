async function main() {
    const r = await fetch('https://23t1sp28xe.execute-api.us-east-1.amazonaws.com/Release');
    const results = await r.json();
    const systemId = localStorage.getItem('system-id');
    results.sort((a, b) => b.score - a.score);
    const maxScore = results[0].score;
    const minScore = results.at(-1).score;
    document.querySelector('.results tbody').innerHTML = results.map((x, i) => {
        const pct = (x.score - minScore) / (maxScore - minScore);
        const score = Number(x.score.toFixed(1));
        return `
            <tr class="${x.systemId === systemId ? 'ours' : ''}">
                <td class="">${(i + 1).toLocaleString()}</td>
                <td class="cpu">${x.cpu}</td>
                <td class="cores">${x.cores}</td>
                <td class="browser">${x.browser || ''}</td>
                <td class="platform">${x.platform || ''}</td>
                <td class="notes">${x.notes || ''}</td>
                <td class="score"><progress max="1" value="${pct}"></progress> ${score.toLocaleString()}</td>
            </tr>
        `;
    }).join('\n');
}

main();
