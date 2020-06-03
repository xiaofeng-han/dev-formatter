var formatted;
const MENU_IDS = {
  FORMAT: "Format",
  DIFF: "Diff",
  SELECT: "Select",
};
const onClickHandler = (info, tab) => {
  // console.log("item " + info.menuItemId + " was clicked");
  // console.log("info: " + JSON.stringify(info));
  // console.log("tab: " + JSON.stringify(tab));
  if (info.menuItemId == MENU_IDS.FORMAT) {
    ensureSendMessage(
      tab.id,
      {
        formatted,
        command: COMMANDS.FORMAT,
      },
      (response) => {}
    );
  } else if (info.menuItemId == MENU_IDS.DIFF) {
    ensureSendMessage(
      tab.id,
      {
        formatted,
        command: COMMANDS.DIFF,
      },
      (response) => {}
    );
  } else if (info.menuItemId == MENU_IDS.SELECT) {
    ensureSendMessage(
      tab.id,
      {
        formatted,
        command: COMMANDS.SELECT,
      },
      (response) => {
        if (response) {
          onSelect(response);
        }
      }
    );
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
    id: MENU_IDS.DIFF,
    visible: false,
    title: "Diff with selected",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: MENU_IDS.SELECT,
    title: "Select for Diff",
    contexts: ["selection"],
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command == COMMANDS.SELECT) {
    onSelect(request);
    if (sendResponse) {
      sendResponse();
    }
  }
});

const onSelect = (request) => {
  chrome.storage.local.get(["formatted"], (result) => {
    console.log("Background read saved formatted", result);
    formatted = request.formatted;
    chrome.contextMenus.update(MENU_IDS.DIFF, {
      visible: true,
    });
    console.log("Selected", request);
  });
};

// this is not working, update to solution at: https://stackoverflow.com/questions/13202896/dynamic-extension-context-menu-that-depends-on-selected-text
const getDiffMenuTitle = () => {
  if (typeof formatted === undefined || formatted === undefined) {
    return "Select for diff";
  } else {
    return "Diff with selected";
  }
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
