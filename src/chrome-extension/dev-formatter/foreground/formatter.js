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
    dialog.html("No previous selected content");
    dialog.dialog("open");
    dialog.dialog("moveToTop");
    sendResponse("NoPrevious");
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

  dialog.html(view);
  dialog.dialog({
    buttons: [
      {
        text: "Copy & Close",
        click: () => {
          navigator.clipboard.writeText(formattedForClipboard);
          dialog.dialog("close");
        },
      },
    ],
  });

  dialog.dialog("open");
  dialog.dialog("moveToTop");
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
  var dialog = $(bubbleDOM);
  var formatted = format(selection);
  var formattedForClipboard = formatForClipboard(formatted);
  dialog.html(formatted);
  dialog.dialog({
    autoOpen: false,
    closeText: "close",
    width: "auto",
    maxWidth: $(window).width() * 0.8,
    maxHeight: $(window).height() * 0.8,
    modal: true,
    buttons: [
      {
        text: "Copy & Close",
        click: () => {
          navigator.clipboard.writeText(formattedForClipboard);
          dialog.dialog("close");
        },
      },
    ],
  });
  dialog.dialog("open");
  dialog.dialog("moveToTop");
  sendResponse(formattedForClipboard);
};

var bubbleDOM = document.createElement("div");
document.body.appendChild(bubbleDOM);

const setupDialogCommon = () => {
  bubbleDOM.setAttribute("title", "Formatter");
}

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
