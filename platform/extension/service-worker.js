console.log("Service worker loaded!");

// When the extension is clicked
chrome.action.onClicked.addListener((tab) => {
  // Execute script
  chrome.scripting.executeScript({
    // in the current tab
    target: { tabId: tab.id },
    // within the javascript context of the page
    world: "MAIN",
    func: () => {
      alert("Extension Starting");
      console.log("Extension works!");

      if (
        window.EXCALIDRAW_ASSET_PATH ||
        window.EXCALIDRAW_THROTTLE_RENDER ||
        window.__EXCALIDRAW_SHA__
      ) {
        console.log("Excalidraw Detected");
      } else {
        console.log("Excalidraw Not Detected");
      }
    },
  });
});
