const ext = browser || chrome;

let info;

(browser || chrome).system.cpu.getInfo().then(x => {
    const script = document.createElement('script');
    script.innerHTML = `
        window.webBenchCpuInfo = ${JSON.stringify(info)};
    `;
    document.documentElement.append(script);
});
