chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  // If the received message has the expected format...
  if (msg.text === 'getSelected') {
    // Call the specified callback, passing
    // the web-page's DOM content as argument
    var selected = $(".cell.selected");
    if (selected.length) {
      sendResponse({
        isSelected: true,
        dataId: selected.parent().attr("data-rowid")
      })
    } else {
      sendResponse({isSelected: false})
    }
  }
});