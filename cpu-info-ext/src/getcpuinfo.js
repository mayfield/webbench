const ext = self.browser || self.chrome;
ext.runtime.onMessage.addListener(msg => {
    const el = document.createElement('template');
    el.innerHTML = JSON.stringify(msg);
    el.id = 'sys-info-json';
    document.documentElement.append(el);
});
ext.runtime.sendMessage('getInfo');
