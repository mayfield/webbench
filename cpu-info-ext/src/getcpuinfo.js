const ext = self.browser || self.chrome;
ext.runtime.onMessage.addListener(msg => window.postMessage(msg));
ext.runtime.sendMessage('getInfo');
