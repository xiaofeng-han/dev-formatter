var previous_formatted;
function onClickHandler(info, tab) {
  console.log("item " + info.menuItemId + " was clicked");
  console.log("info: " + JSON.stringify(info));
  console.log("tab: " + JSON.stringify(tab));
  ensureSendMessage(tab.id, {
    "previous_formatted": previous_formatted
  }, (response) => {
    previous_formatted = response;
    console.log("previous formatted", response);
  });
}

chrome.contextMenus.onClicked.addListener(onClickHandler);

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: "FormatSelected",
    title: "Format Selected",
    contexts: ["selection"],
  });
});

function ensureSendMessage(tabId, message, callback) {
  chrome.tabs.sendMessage(tabId, { ping: true }, function (response) {
    if (response && response.pong) {
      // Content script ready
      chrome.tabs.sendMessage(tabId, message, callback);
    } else {
      // No listener on the other end
      chrome.tabs.executeScript(
        tabId,
        { file: "foreground/formatter.js" },
        function () {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            throw Error("Unable to inject script into tab " + tabId);
          }
          // OK, now it's injected and ready
          chrome.tabs.sendMessage(tabId, message, callback);
        }
      );
    }
  });
}
