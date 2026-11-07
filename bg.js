// Abre (ou traz para frente) o painel numa janela própria.
// Janela separada = o Web App continua visível na outra janela e o Chrome não desacelera o bot.
const CONTROL = chrome.runtime.getURL('control.html');

async function openControl() {
  const tabs = (await chrome.tabs.query({})).filter(t => (t.url || '').startsWith(CONTROL));
  if (tabs[0]) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
    return;
  }
  await chrome.windows.create({ url: CONTROL, type: 'popup', width: 1360, height: 900 });
}

chrome.action.onClicked.addListener(openControl);
chrome.runtime.onMessage.addListener(m => {
  if (m && m.type === 'openControl') openControl();
  if (m && m.type === 'notify') chrome.notifications.create({ type: 'basic', iconUrl: 'icons/icon128.png', title: m.title, message: m.body });
});
chrome.notifications.onClicked.addListener(id => { openControl(); chrome.notifications.clear(id); });
