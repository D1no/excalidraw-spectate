# excalidraw-spectate

WIP — Chrome extension that adds "Spectator Mode" to Excalidraw to enable clean video feed recording and improve cross domain collaboration by eliminating overwhelming distractions.

---

# Motivation

[Excalidraw](https://github.com/excalidraw/excalidraw) — an open source whiteboarding web app — is a valuable tool to collaborate with none-technical domain experts on the spot; crucial in i.e. domain modeling and life cycle oriented machine learning (event storming). It is often very valuable to record these sessions, do a few post-edits and leverage them for documentation or explainer videos.

The build in real-time collaboration feature of Excalidraw already allows us to simply open another window and use the real-time nature of that second view as a "**Spectator**":

- A perspective that watches the whole action from a global perspective over time, avoiding the disorientation of switching between different point of views.

## Validation

You see the _↓ lower window_ from the creator perspective: very noisy.

The _upper window ↑_ however, acts as a "Spectator" with a fixed view that is much more pleasant to watch.

![excalidraw_spectator_value_proposition](https://github.com/D1no/excalidraw-spectate/assets/2397125/47d83af1-d4fb-482b-aa5d-519d9a9c27d7)

This separation allows us to easily track back the discovery process, give credit to collaborators in presentations as a time-lapse, and cut out typos and mistakes. For explainer videos, it enables us _a priori_ to zoom in on elements through the _magic of video editing_.

## Goal: Spectator Mode

_The goal is to only show the whiteboards canvas, nothing more. From there, potentially enable to screen record at a much high canvas pixel resolution for post editing and explainer videos with some value added capabilities._

Excalidraw has currently three view modes:

- Default: _Shows all the creation tools._
- Zen Mode: _Hides the editor side bar._
- View Mode: _Hides the top toolbar._

There are still a few things that prevent a **100% distraction free** presentation and post video workflow (like zooming in or out in a video editor without running into fixed size UI elements). So we need to **hide these elements as well**:

- UI Buttons (🔵): _All overlays like the menu and zoom._
- Collaborator (🔴)
  - Highlights: _The outlines around the collaborators selections._
  - Names: _The names of the collaborators (privacy)._
  - Cursors: _The cursors of the collaborators._

![specator_mode_delta_status_quo](https://github.com/D1no/excalidraw-spectate/assets/2397125/10539ead-dd5a-4af4-a8e0-3ac5683eac4b)

## Solution: Chrome Extension

The fastest path to verification of the idea is to create a chrome extension that

- ...injects a few lines of CSS or code to **hide the UI elements** (🔵, easy since react components).
- ...injects a few lines of JavaScript to **hide the collaborator elements** (🔴, much more difficult since inside the canvas).
- ...provides a simple window that can be recorded with screen recording software like [Kap](https://github.com/wulkano/Kap), [OBS](https://github.com/obsproject/obs-studio) or in real-time via recorded web meetings.

#### Additional Ideas

After that, an extended feature could be to **handle the screen recording directly** in the extension via the [MediaStream API](https://developer.chrome.com/docs/extensions/reference/tabCapture/); not only allowing to record the canvas with a higher resolution and with transparency directly (separating the spectator zoom level from the actual recording), but also generate a multi layer video or project file that enables control over individual elements in post production.

Additionally, for the purpose of _well prepared live teaching_, elements at a specific opacity could be hidden from the spectator view... yielding as a sort of "**onion skinning**" for the creator to live redraw complex diagrams without forgetting crucial elements and not being locked in to following a script. Example:

![spectator_mode_onion_skinning_idea](https://github.com/D1no/excalidraw-spectate/assets/2397125/dfa12aac-2e32-44c4-ba86-02a3d17f2893)

_At a later point in time it may makes sense to attempt to contribute this functionality to the Excalidraw codebase directly. But for now an independent browser specific extension appears to be a sensible approach for now to avoid forking the codebase. This also mitigates a direct dependency on the Excalidraw team, which appears to be overwhelmed with issues and requests already._

---

# Approach Analysis

Excalidraw makes use of ReactJS and the [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) to render the whiteboard. The canvas is a 2D rasterized image that is rendered on the GPU and does not expose any DOM elements to the browser.

![specator_mode_delta_status_quo](https://github.com/D1no/excalidraw-spectate/assets/2397125/10539ead-dd5a-4af4-a8e0-3ac5683eac4b)

The UI buttons (🔵) are React components that are rendered on top of the canvas. They are not part of the canvas itself and could easily be hidden with CSS added by a Chrome Extension.

The collaborator elements (🔴) however, though still state managed by ReactJS, are rendered directly inside the canvas. They are not DOM elements, cannot be hidden with CSS and therefore need to be controlled with JavaScript by either

- (A) patch the minified JavaScript code that renders the canvas (hacky, but easy to implement)
- (B) dispatching state updates directly to the ReactJS fiber tree (elegant, but more difficult to implement)
- (C) identifying and use Excalidraw globals outside of the ReactJS scope to change relevant states (limited, but less intrusive)

## Understanding the Inner-Workings

When a collaborator session is started, the apps canvas is switched out to an `<InteractiveCanvas>` react component that takes among others `props.appState.collaborators`. Inside a `useEffect` the component loops over the collaborators (user) array object to identify what to render:

- all elements that are selected, giving them the outline (`user.selectedElementIds`)
- cursor position (`user.pointer` and `user.pointer`)
- the username (`user.username`)
- _the users state (`user.userState`)_

So the code responsible for rendering collaborator (🔴) elements is located inside `src/components/canvases/InteractiveCanvas.tsx` ([here](https://github.com/excalidraw/excalidraw/blob/7c9cf30909c6c368407994cb25e22292b99eee5d/src/components/canvases/InteractiveCanvas.tsx#L81-L107)) and driven by render props under appState which follows the type `Collaborator[]` located in `src/types.ts` ([here](https://github.com/excalidraw/excalidraw/blob/7c9cf30909c6c368407994cb25e22292b99eee5d/src/types.ts#L41-L56)).

### Addressing Rendering Stage

Since we are only interested in simply "hiding" the visual representation of collaborators (users), we could _add a conditional_ directly to the `forEach` loop inside the `<InteractiveCanvas>` to hide it.

```typescript
// src/components/canvases/InteractiveCanvas.tsx
const InteractiveCanvas = (props: InteractiveCanvasProps) => {
  // ...
  useEffect(() => {
    // ...
    props.appState.collaborators.forEach((user, socketId) => {
      if (!SPECTATOR_MODE) { // <-- new conditional
```

This however leaves the state lingering, changing the render logic as a side effect.

### Addressing State Stage

Intercepting `appState.collaborators` directly to conditionally allow or block its inclusion via a proxy or dispatching react fiber updates to the retrieved react instance... _(todo more investigation where state is stored and where it comes from)_

## Approach (A): Patching the Minified JavaScript

This approach hinges on mutating the minified ReactJS JavaScript bundle seen below before it is executed by the browser. In this case, the effect hooks closure would be changed directly by searching for `appState.collaborators` and replacing it with a variant that includes a conditional to disable the rendering.

```javascript
b.useEffect)((function() {
  // ...
    e.appState.collaborators.forEach((function(t, n) {
        if (t.selectedElementIds)
            for (var l = 0, c = Object.keys(t.selectedElementIds); l < c.length; l++) {
                var u = c[l];
                u in i || (i[u] = []),
                i[u].push(n)
// ...
```

### Concerns

Though this works in principle, intercepting js scripts and changing them with a chrome extension feels relative intrusive for "simply hiding" a few elements. It likely requires the use of the `chrome.declarativeNetRequest` API in manifest V3 (`webRequestBlocking` in V2) which in itself is a very high permission to hand to a chrome extension. So this might be ok for a short term solution, but likely not a public one.

## Approach (B): Dispatching React Fiber Updates

This approach is based on the idea of dispatching updates to the ReactJS fiber tree directly. This is a much more elegant approach, but requires a lot more effort and understanding of the Excalidraw codebase as we need to manually read and dispatch against the react instance. This however, would allow is to interact with the app instead of patching it.

The general approach is to use ReactJS' build in-feature to provide access to the fiber tree. It is the same method the [React Developer Tools Chrome Extension](https://chrome.google.com/webstore/detail/react-developer-tools) uses to inspect components and their state.

Here, the ReactJS instance is exposed via `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` and can be accessed via `window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers` which is an object that contains all the ReactJS instances on the page. From there, we can maybe access the Excalidraw instance via something like `window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers[0].renderer.component.element._owner.stateNode` which should be the root component of the Excalidraw app.

### Concerns

This approach is much more elegant, but requires a lot more effort in understanding how state is managed in Excalidraw and how to dispatch updates against the ReactJS fiber tree.

At the moment, the `App.tsx` file alone [inside](https://github.com/excalidraw/excalidraw/blob/7c9cf30909c6c368407994cb25e22292b99eee5d/src/components/App.tsx) the Excalidraw open source project has _over 8k lines of code_ with almost no comments.... _which is unusual even for veteran ReactJS engineers_. Therefore maybe unreasonable effort to work through just to hide a few elements.

## Approach (C): Excalidraw Globals

Lets compare what globals are available in the Excalidraw web app in the browser compared to an empty iframe (eliminating standard window globals) by running in the console:

```javascript
(function () {
  var iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  var standardGlobals = Object.keys(iframe.contentWindow);
  document.body.removeChild(iframe);
  var allGlobals = Object.keys(window);
  var nonStandardGlobals = allGlobals.filter(function (g) {
    return !(
      standardGlobals.includes(g) ||
      g === "iframe" ||
      g === "standardGlobals" ||
      g === "nonStandardGlobals"
    );
  });
  console.log(nonStandardGlobals);
})();
```

### Globals

All results from 2023-11-21.

#### Excalidraw Local

Cloning the [excalidraw repository](https://github.com/excalidraw/excalidraw) and running `yarn start:production` on the _master_ branch.

_8 app globals_

```javascript
[
  "EXCALIDRAW_ASSET_PATH",
  "EXCALIDRAW_THROTTLE_RENDER",
  "__EXCALIDRAW_SHA__",
  // ... rest simple analytics and error reporting (sentry)
  "__SENTRY__",
  "scriptEle",
  "sa_event_loaded",
  "sa_loaded",
  "sa_event",
];
```

#### Excalidraw Local with Collaboration

Running excalidraw in dev mode via `yarn start` and also cloning the [excalidraw-room repository](https://github.com/excalidraw/excalidraw-room) and running it from the _master_ branch in the background via `yarn start:dev` to have a websocket turn server.

_1 additional app global_

```javascript
[
  "collab",
  // ... since dev mode, lots of debug globals
];
```

✅ `collab` provides global access to the [collaborators](https://github.com/excalidraw/excalidraw/blob/7c9cf30909c6c368407994cb25e22292b99eee5d/src/types.ts#L41-L56) state, the [excalidrawAPI](https://github.com/excalidraw/excalidraw/blob/7c9cf30909c6c368407994cb25e22292b99eee5d/src/types.ts#L610) to retrieve and update scene data and many other methods.

<details>
  <summary>Full list of properties on window.collab</summary>

```javascript
[
    "_reactInternalInstance"
    "_reactInternals",
    "activeIntervalId",
    "beforeUnload",
    "broadcastElements",
    "collaborators",  // <-- collaborators and with selected ElementIDs
    "context",
    "decryptPayload",
    "destroySocketClient",
    "excalidrawAPI",  // <-- ExcalidrawAPI to retrieve & update scene data
    "fallbackInitializationHandler",
    "fetchImageFilesFromFirebase",
    "fileManager",
    "getLastBroadcastedOrReceivedSceneVersion",
    "getSceneElementsIncludingDeleted",
    "handleClose",
    "handleRemoteSceneUpdate",
    "idleTimeoutId",
    "initializeIdleDetector",
    "initializeRoom",
    "isCollaborating",
    "lastBroadcastedOrReceivedSceneVersion",
    "loadImageFiles",
    "onIdleStateChange",
    "onOfflineStatusToggle",
    "onPointerMove",
    "onPointerUpdate",
    "onUnload",
    "onUsernameChange",
    "onVisibilityChange",
    "portal",
    "props",
    "queueBroadcastAllElements",
    "queueSaveToFirebase",
    "reconcileElements",
    "refs",
    "reportActive",
    "reportIdle",
    "saveCollabRoomToFirebase",
    "setIsCollaborating",
    "setLastBroadcastedOrReceivedSceneVersion",
    "setUsername",
    "socketInitializationTimer",
    "startCollaboration",
    "state",
    "stopCollaboration",
    "syncElements",
    "updater",
]
```

</details>

❌ However, it appears that this global is **only available during testing and dev** and not in production mode `excalidraw-app/collab/Collab.tsx` ([here](https://github.com/excalidraw/excalidraw/blob/7c9cf30909c6c368407994cb25e22292b99eee5d/excalidraw-app/collab/Collab.tsx#L175)

```typescript
if (import.meta.env.MODE === ENV.TEST || import.meta.env.DEV) {
  window.collab = window.collab || ({} as Window["collab"]);
  Object.defineProperties(window, {
    collab: {
// ...
```

#### Excalidraw.com

Accessing the website [excalidraw.com](https://excalidraw.com/) in incognito mode and starting a collaboration session with another window.

❌ No `collab`. Only the 8 app globals like in the local version.

### Thoughts

...potentially re-enable the `collab` global in production mode via a chrome extension?

...needs re-tracing of the sourcemap to the conditional in the `Collab.tsx` file.
