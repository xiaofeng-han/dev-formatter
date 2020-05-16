// Add bubble to the top of the page.
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.ping) {
    sendResponse({ pong: true });
    return;
  }

  var selection = window.getSelection().toString();
  console.log("Current selected", selection);
  var dialog = $("#__dev_formatter_bubble__");
  dialog.text("Selected: " + selection);
  dialog.dialog({
    autoOpen: false,
    closeText: "close",
  });
  dialog.dialog("open");
  dialog.dialog("moveToTop");
  sendResponse("Detected selection " + selection);
  /* Content script action */
});
var bubbleDOM = document.createElement("div");
bubbleDOM.setAttribute("title", "Formatted String");
bubbleDOM.id = "__dev_formatter_bubble__";
document.body.appendChild(bubbleDOM);


// Move that bubble to the appropriate location.
function renderBubble(mouseX, mouseY, selection) {
  bubbleDOM.innerHTML = selection;
  bubbleDOM.style.top = mouseY + "px";
  bubbleDOM.style.left = mouseX + "px";
  bubbleDOM.style.visibility = "visible";
}
