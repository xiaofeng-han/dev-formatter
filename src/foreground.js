const SPACE_CHARS = [" ", "\t"];
const KEY_VALUE_DELIMITER = ["=", ":"];
const LEVEL_CHANGING_SYMBOLS = [..."{}[]"];
const COMMA = ",";
const HTML_NEWLINE = "<br/>";
const HTML_INDENT_UNIT = "&nbsp;";
const NEWLINE = "\n";
const INDENT_UNIT = " ";
const UNIT_PER_INDENT = 4;
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
  if (
    typeof request.formatted === undefined ||
    request.formatted === undefined
  ) {
    console.log("no previous formatted content");
    showMessage("No previous selected content");
    return;
  }
  var baseText = difflib.stringAsLines(request.formatted.clipboard);
  var selection = window.getSelection().toString();
  console.log("selection for diff", selection);
  var newText = difflib.stringAsLines(format(selection, false, true).clipboard);
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
  var selection = window.getSelection().toString();
  var formatted = format(selection);
  showFormatted(formatted, () => {
    navigator.clipboard.writeText(formatted.clipboard);
  });
  sendResponse(formatted);
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
    height: maxHeight,
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
  showDialog(formatted.html, "Formatted content", "Copy & Close", onClose);
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
  var currentHeight = dialog.dialog("widget").height();
  if (currentWidth > maxWidth) {
    dialog.dialog("option", "width", maxWidth);
  }

  if (currentHeight > maxHeight) {
    dialog.dialog("option", "height", maxHeight);
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

const getChangeLineContent = (level, isHTML) => {
  var localNewline = isHTML ? HTML_NEWLINE : NEWLINE;
  var localUnitPerIndent = isHTML ? HTML_INDENT_UNIT : INDENT_UNIT;

  return (
    localNewline + localUnitPerIndent.repeat(UNIT_PER_INDENT).repeat(level)
  );
};

const addToResult = (result, content, forHTML, forClipboard) => {
  if (forHTML) {
    result.html.push(content);
  }

  if (forClipboard) {
    result.clipboard.push(content);
  }
};

const popFromResult = (result, forHTML, forClipboard) => {
  if (forHTML) {
    result.html.pop();
  }

  if (forClipboard) {
    result.clipboard.pop();
  }
};

const changeLine = (result, level, forHTML, forClipboard) => {
  if (forHTML) {
    addToResult(result, getChangeLineContent(level, true), true, false);
  }

  if (forClipboard) {
    addToResult(result, getChangeLineContent(level, false), false, true);
  }
};
const format = (selection, forHTML = true, forClipboard = true) => {
  const arr = [...selection];
  var level = 0;

  var result = {
    html: [],
    clipboard: [],
  };
  var ignoreFollowingSpace = true;
  arr.forEach((current, index, array) => {
    if (SPACE_CHARS.indexOf(current) >= 0) {
      if (ignoreFollowingSpace) {
        return;
      }
    } else {
      ignoreFollowingSpace = false;
    }
    addToResult(result, current, forHTML, forClipboard);
    if (isOpening(current)) {
      changeLine(result, ++level, forHTML, forClipboard);
    }
    if (isClosing(current)) {
      popFromResult(result, forHTML, forClipboard);
      changeLine(result, --level, forHTML, forClipboard);
      addToResult(result, current, forHTML, forClipboard);
    }

    if (current == COMMA) {
      changeLine(result, level, forHTML, forClipboard);
      ignoreFollowingSpace = true;
    }
  });
  return {
    html: forHTML ? result.html.join("") : undefined,
    clipboard: forClipboard ? result.clipboard.join("") : undefined,
  };
};

const formatForClipboard = (formatted) => {
  var forClipboard = formatted.replace(/\&nbsp;/g, " ");
  forClipboard = forClipboard.replace(/<br\/>/g, "\n");
  return forClipboard;
};
