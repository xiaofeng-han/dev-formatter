// Add bubble to the top of the page.
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.ping) {
    sendResponse({ pong: true });
    return;
  }

  var selection = window.getSelection().toString();
  console.log("Current selected", selection);
  sendResponse("Detected selection " + selection);
  /* Content script action */
});
var bubbleDOM = document.createElement("div");
bubbleDOM.setAttribute("class", "selection_bubble");
document.body.appendChild(bubbleDOM);

// // Lets listen to mouseup DOM events.
// document.addEventListener(
//   "mouseup",
//   function (e) {
//     var selection = window.getSelection().toString();
//     console.log("mouse up detected");
//     console.log("selection", selection);
//     if (selection.length > 0) {
//       renderBubble(e.clientX, e.clientY, selection);
//     }
//   },
//   false
// );

// // Close the bubble when we click on the screen.
// document.addEventListener(
//   "mousedown",
//   function (e) {
//     bubbleDOM.style.visibility = "hidden";
//     console.log("mouse down detected");
//   },
//   false
// );

// Move that bubble to the appropriate location.
function renderBubble(mouseX, mouseY, selection) {
  bubbleDOM.innerHTML = selection;
  bubbleDOM.style.top = mouseY + "px";
  bubbleDOM.style.left = mouseX + "px";
  bubbleDOM.style.visibility = "visible";
}
