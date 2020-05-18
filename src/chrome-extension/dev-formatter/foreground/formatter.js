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
  console.log("Current selected", selection);
  var dialog = $("#__dev_formatter_bubble__");
  var container = document.createElement("div");
  $(container).css({
    overflow: "scroll",
  });
  $(container).html(format(selection));

  dialog.append(container);
  format(selection);
  dialog.dialog({
    autoOpen: false,
    closeText: "close",
    maxWidth: $(window).width() * 0.8,
    maxHeight: $(window).height() * 0.8,
  });
  dialog.dialog("open");
  dialog.dialog("moveToTop");
  sendResponse("Detected selection " + selection);
  /* Content script action */
});

var bubbleDOM = document.createElement("div");
bubbleDOM.setAttribute("title", "Formatted");
bubbleDOM.id = "__dev_formatter_bubble__";
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
    arr.push("&nbsp;&nbsp;");
  }
};

const format = (selection) => {
  const arr = [...selection];
  var level = 0;
  var atKey = true;
  var previous;
  var ignoreLevelChanging = false;
  var ignoreFollowingSpace = true;
  var valueStart = true;

  var result = [];
  arr.forEach((current, index, array) => {
    if (ignoreFollowingSpace && SPACE_CHARS.includes(current)) {
      return;
    } else if (ignoreFollowingSpace) {
      ignoreFollowingSpace = false;
    }

    if (KEY_VALUE_DELIMITER.includes(previous)) {
      atKey = !atKey;
      valueStart = true;
      ignoreLevelChanging = false;
    }

    if (isOpening(previous) && !isClosing(current) && !ignoreLevelChanging) {
      changeLine(result, ++level);
    } else if (
      isClosing(previous) &&
      COMMA != current &&
      !ignoreLevelChanging
    ) {
      level = Math.max(level - 1, 0);
      changeLine(result, level);
    } else if (COMMA == previous) {
      changeLine(result, level);
    } else if (isClosing(current) && !ignoreLevelChanging) {
      level = Math.max(level - 1, 0);
      changeLine(result, level);
    }

    if (isOpening(current) || isClosing(current) || COMMA == current) {
      valueStart = true;
      ignoreFollowingSpace = true;
    } else if (valueStart) {
      valueStart = false;
    }

    if (isOpening(current) && !valueStart) {
      ignoreLevelChanging = true;
    }

    previous = current;
    result.push(current);
  });

  // if (isClosing(previous)) {
  //   var last = result.pop();
  //   changeLine(result, --level);
  //   result.push(last);
  // }
  return result.join("");
};
// // Move that bubble to the appropriate location.
// function renderBubble(mouseX, mouseY, selection) {
//   bubbleDOM.innerHTML = selection;
//   bubbleDOM.style.top = mouseY + "px";
//   bubbleDOM.style.left = mouseX + "px";
//   bubbleDOM.style.visibility = "visible";
// }
