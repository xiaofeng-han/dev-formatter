const SPACE_CHARS = [" ", "\t"];
const KEY_VALUE_DELIMITER = ["=", ":"];
const LEVEL_CHANGING_SYMBOLS = [..."{}[]"];
const COMMA = ",";
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.ping) {
    sendResponse({ pong: true });
    return;
  }

  var selection = window.getSelection().toString();
  var dialog = $(bubbleDOM);
  var formatted = format(selection);
  dialog.html(formatted);
  dialog.dialog({
    autoOpen: false,
    closeText: "close",
    width: "80%",
    maxWidth: $(window).width() * 0.8,
    maxHeight: $(window).height() * 0.8,
    modal: true,
    buttons: [
      {
        text: "Copy & Close",
        click: () => {
          navigator.clipboard.writeText(formatForClipboard(formatted));
          dialog.dialog("close");
        }
      }
    ]
  });
  dialog.dialog("open");
  dialog.dialog("moveToTop");
  sendResponse("Detected selection " + selection);
  /* Content script action */
});

var bubbleDOM = document.createElement("div");
bubbleDOM.setAttribute("title", "Formatted");
document.body.appendChild(bubbleDOM);

const isOpening = (ch) => {
  var index = LEVEL_CHANGING_SYMBOLS.indexOf(ch);
  if (index < 0) {
    return false;
  }

  return index % 2 == 0;
};

const isClosing = (ch) => {
  var index = LEVEL_CHANGING_SYMBOLS.indexOf(ch);
  if (index < 0) {
    return false;
  }

  return index % 2 != 0;
};

const changeLine = (arr, level) => {
  arr.push("<br/>");
  for (var i = 0; i < level; i++) {
    arr.push("&nbsp;&nbsp;&nbsp;&nbsp;");
  }
};

const format = (selection) => {
  const arr = [...selection];
  var level = 0;

  var result = [];
  arr.forEach((current, index, array) => {
    result.push(current);
    if (isOpening(current)) {
      changeLine(result, ++level);
    }
    if (isClosing(current)) {
      result.pop();
      changeLine(result, --level);
      result.push(current);
    }

    if (current == ",") {
      changeLine(result, level);
    }
  });
  return result.join("");
};

const formatForClipboard = (formatted) => {
  var forClipboard = formatted.replace(/\&nbsp;/g, " ");
  forClipboard = forClipboard.replace(/<br\/>/g, "\n");
  return forClipboard;
}
