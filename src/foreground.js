const SPACE_CHARS = [" ", "\t"];
const KEY_VALUE_DELIMITER = ["=", ":"];
const LEVEL_CHANGING_SYMBOLS = [..."{}[]"];
const COMMA = ",";
const HTML_NEWLINE = "<br/>";
const HTML_INDENT_UNIT = "&nbsp;";
const NEWLINE = "\n";
const INDENT_UNIT = " ";
const UNIT_PER_INDENT = 4;
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.ping) {
    sendResponse({ pong: true });
    return;
  }

  if (request.command == COMMANDS.FORMAT) {
    doFormat();
  } else if (request.command == COMMANDS.DIFF) {
    doDiff();
  } else if (request.command == COMMANDS.SELECT) {
    doSelect();
  } else if (request.command == COMMANDS.CLEAR) {
    doClear();
  }
});

const setStorage = (content, callback) => {
  if (!content) {
    chrome.storage.local.remove(STORAGE_KEY);
    return;
  }
  var storage = {};
  storage[STORAGE_KEY] = content;
  chrome.storage.local.set(storage, () => {
    if (callback) {
      callback();
    }
  });
};

const getStorage = (callback) => {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    if (callback && result) {
      callback(result[STORAGE_KEY]);
    }
  });
};

const doSelect = () => {
  var selection = window.getSelection().toString();
  var formatted = format(selection);
  setStorage(formatted, () => {
    chrome.runtime.sendMessage({
      command: COMMANDS.SELECT,
    });
  });
};

const doDiff = () => {
  getStorage((formatted) => {
    if (typeof formatted === undefined || formatted === undefined) {
      console.log("no previous formatted content");
      showMessage("No previous selected content");
      return;
    }

    var baseText = difflib.stringAsLines(formatted.clipboard);
    var selection = window.getSelection().toString();
    var newText = difflib.stringAsLines(
      format(selection, false, true).clipboard
    );
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
  });
};

const doClear = () => {
  setStorage(undefined);
  chrome.runtime.sendMessage({
    command: COMMANDS.CLEAR,
  });
};

const doFormat = () => {
  var selection = window.getSelection().toString();
  var formatted = format(selection);
  showFormatted(formatted, () => {
    navigator.clipboard.writeText(formatted.clipboard);
  });
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
  showDialogWithButtons(formatted.html, "Formatted content", [
    {
      text: "Copy & Close",
      click: () => {
        onClose();
        dialog.dialog("close");
      },
    },
    {
      text: "Select For Diff & Close",
      click: () => {
        setStorage(formatted, () => {
          chrome.runtime.sendMessage(
            {
              command: COMMANDS.SELECT,
            },
            () => {
              onClose();
              dialog.dialog("close");
            }
          );
        });
      },
    },
  ]);
};

const showDialog = (content, dialogTitle, buttonText, onClose) => {
  var buttons = [
    {
      text: buttonText ? buttonText : "Close",
      click: () => {
        if (onClose) {
          onClose();
        }
        dialog.dialog("close");
      },
    },
  ];
  showDialogWithButtons(content, dialogTitle, buttons);
};

const showDialogWithButtons = (content, dialogTitle, buttons) => {
  setupDialogCommon();
  if (content) {
    dialog.html(content);
  }

  dialog.dialog({
    buttons,
    title: dialogTitle ? dialogTitle : "Info",
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

  dialog.dialog({
    open: (event, ui) => {
      dialog.scrollTop(0);
    },
  });
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
