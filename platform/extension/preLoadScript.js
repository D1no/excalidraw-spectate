/**
 * This script injects a global to have the react runtime provide its instance.
 */

console.log("Preload script loaded!");

if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined") {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    inject: function (internals) {
      console.log("Excalidraw React instance hooked.", internals);
      // Store the injected internals for later use if needed.
      window.REACT_RUNTIME = internals;
    },
    onCommitFiberRoot: function (rendererID, root) {
      // Hooks into updates.
      console.log("React Fiber Update Detected");

      // Find the stateNode which corresponds to the component that has the appState.
      const instance = root.current.stateNode;
      if (instance && instance.state && instance.state.appState) {
        // TODO
      }
    },
    onCommitFiberUnmount: function () {
      // Called when a fiber unmounts, use for cleanup if necessary.
    },
  };
}
