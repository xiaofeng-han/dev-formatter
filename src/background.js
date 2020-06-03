const MENU_IDS = {
  FORMAT: "Format",
  DIFF: "Diff",
  SELECT: "Select",
  CLEAR: "Clear",
};
const onClickHandler = (info, tab) => {
  // console.log("item " + info.menuItemId + " was clicked");
  // console.log("info: " + JSON.stringify(info));
  // console.log("tab: " + JSON.stringify(tab));
  if (info.menuItemId == MENU_IDS.FORMAT) {
    ensureSendMessage(tab.id, {
      command: COMMANDS.FORMAT,
    });
  } else if (info.menuItemId == MENU_IDS.DIFF) {
    ensureSendMessage(tab.id, {
      command: COMMANDS.DIFF,
    });
  } else if (info.menuItemId == MENU_IDS.SELECT) {
    ensureSendMessage(tab.id, {
      command: COMMANDS.SELECT,
    });
  } else if (info.menuItemId == MENU_IDS.CLEAR) {
    chrome.storage.local.remove(STORAGE_KEY, () => {
      updateMenuBySelection();
    });
  }
};

chrome.contextMenus.onClicked.addListener(onClickHandler);

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_IDS.FORMAT,
    title: "Format Selected",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: MENU_IDS.SELECT,
    title: "Select for Diff",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: MENU_IDS.DIFF,
    visible: false,
    title: "Diff with selected",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: MENU_IDS.CLEAR,
    visible: false,
    title: "Clear selection",
    contexts: ["selection"],
  });

  updateMenuBySelection();
});

const updateMenuBySelection = () => {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    var visible = false;
    if (result[STORAGE_KEY]) {
      visible = true;
    }

    chrome.contextMenus.update(MENU_IDS.DIFF, {
      visible,
    });

    chrome.contextMenus.update(MENU_IDS.CLEAR, {
      visible,
    });
  });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { command } = request;
  if (command == COMMANDS.SELECT) {
    onSelect();
  }
});

const onSelect = () => {
  updateMenuBySelection();
};

const onClear = () => {
  updateMenuBySelection();
};

const ensureSendMessage = (tabId, message, callback) => {
  chrome.tabs.sendMessage(tabId, { ping: true }, (response) => {
    if (response && response.pong) {
      // Content script ready
      chrome.tabs.sendMessage(tabId, message, callback);
    } else {
      // No listener on the other end
      chrome.tabs.executeScript(tabId, { file: "foreground.js" }, function () {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          throw Error("Unable to inject script into tab " + tabId);
        }
        // OK, now it's injected and ready
        chrome.tabs.sendMessage(tabId, message, callback);
      });
    }
  });
};
