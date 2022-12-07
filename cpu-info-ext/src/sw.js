const ext = self.browser || self.chrome;

ext.runtime.onMessage.addListener(async (msg, sender) => {
    if (msg === 'getInfo') {
        const cpu = await ext.system.cpu.getInfo();
        const mem = await ext.system.memory.getInfo();
        ext.tabs.sendMessage(sender.tab.id, {cpu, mem});
    }
});
