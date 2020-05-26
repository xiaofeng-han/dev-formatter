const SPACE_CHARS = [" ", "\t"];
const KEY_VALUE_DELIMITER = ["=", ":"];
const LEVEL_CHANGING_SYMBOLS = [..."{}[]"];
const COMMA = ",";
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.ping) {
    sendResponse({ pong: true });
    return;
  }

  if (request.command == "format") {
    doFormat(request, sendResponse);
  } else if (request.command == "diff") {
    doDiff(request, sendResponse);
  }
});
const doDiff = (request, sendResponse) => {
  var dialog = $(bubbleDOM);
  dialog.dialog({
    autoOpen: false,
    closeText: "close",
    width: "auto",
    maxWidth: $(window).width() * 0.8,
    maxHeight: $(window).height() * 0.8,
    modal: true,
  });
  if (
    typeof request.previous_formatted === undefined ||
    request.previous_formatted === undefined
  ) {
    console.log("no previous formatted content");
    showMessage("No previous selected content");
    return;
  }
  var baseText = difflib.stringAsLines(request.previous_formatted);
  var selection = window.getSelection().toString();
  console.log("selection for diff", selection);
  var newText = difflib.stringAsLines(formatForClipboard(format(selection)));
  var opCodes = new difflib.SequenceMatcher(baseText, newText).get_opcodes();
  var view = diffview.buildView({
    baseTextLines: baseText,
    newTextLines: newText,
    opcodes: opCodes,
    // set the display titles for each resource
    baseTextName: "Previous selected",
    newTextName: "New selection",
    contextSize: null,
    viewType: 0,
  });

  showDialog(view, "Diff");
  sendResponse("done");
};

const doFormat = (request, sendResponse) => {
  if (
    typeof request.previous_formatted === undefined ||
    request.previous_formatted === undefined
  ) {
    console.log("no previous formatted content");
  } else {
    console.log("previous formatted content", request.previous_formatted);
  }

  var selection = window.getSelection().toString();
  var formatted = format(selection);
  var formattedForClipboard = formatForClipboard(formatted);
  showFormatted(formatted, () => {
    navigator.clipboard.writeText(formattedForClipboard);
  });
  sendResponse(formattedForClipboard);
};

var bubbleDOM = document.createElement("div");
var dialog = $(bubbleDOM);
document.body.appendChild(bubbleDOM);

var maxWidth = $(window).width() * 0.8;
var maxHeight = $(window).height() * 0.8;

const setupDialogCommon = () => {
  dialog.dialog({
    autoOpen: false,
    closeText: "close",
    width: "auto",
    maxWidth: maxWidth,
    maxHeight: maxHeight,
    modal: true,
  });
  dialog.css({
    "overflow-wrap": "break-word",
  });
};

const showMessage = (message) => {
  showDialog(message);
};

const showFormatted = (formatted, onClose) => {
  showDialog(formatted, "Formatted content", "Copy & Close", onClose);
};

const showDialog = (content, dialogTitle, buttonText, onClose) => {
  setupDialogCommon();
  if (content) {
    dialog.html(content);
  }

  dialog.dialog({
    title: dialogTitle ? dialogTitle : "Info",
    buttons: [
      {
        text: buttonText ? buttonText : "Close",
        click: () => {
          if (onClose) {
            onClose();
          }
          dialog.dialog("close");
        },
      },
    ],
  });

  // in case of long single word (like long id/hash), force the max width
  var currentWidth = dialog.dialog("widget").width();
  if (currentWidth > maxWidth) {
    dialog.dialog("option", "width", maxWidth);
  }
  dialog.dialog("open");
  dialog.dialog("moveToTop");
};

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
  var ignoreFollowingSpace = true;
  arr.forEach((current, index, array) => {
    if (ignoreFollowingSpace && current == " ") {
      return;
    }
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
};
