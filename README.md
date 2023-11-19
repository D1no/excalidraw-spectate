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

## Solution Approach: Chrome Extension

The fastest path to verification of the idea is to create a chrome extension that

- ...injects a few lines of CSS or code to **hide the UI elements** (🔵, easy since react components).
- ...injects a few lines of JavaScript to **hide the collaborator elements** (🔴, much more difficult since inside the canvas).
- ...provides a simple window that can be recorded with screen recording software like [Kap](https://github.com/wulkano/Kap), [OBS](https://github.com/obsproject/obs-studio) or in real-time via recorded web meetings.

### Additional Ideas

After that, an extended feature could be to **handle the screen recording directly** in the extension via the [MediaStream API](https://developer.chrome.com/docs/extensions/reference/tabCapture/); not only allowing to record the canvas with a higher resolution and with transparency directly (separating the spectator zoom level from the actual recording), but also generate a multi layer video or project file that enables control over individual elements in post production.

Additionally, for the purpose of _well prepared live teaching_, elements at a specific opacity could be hidden from the spectator view... yielding as a sort of "**onion skinning**" for the creator to live redraw complex diagrams without forgetting crucial elements and not being locked in to following a script. Example:

![spectator_mode_onion_skinning_idea](https://github.com/D1no/excalidraw-spectate/assets/2397125/dfa12aac-2e32-44c4-ba86-02a3d17f2893)

_At a later point in time it may makes sense to attempt to contribute this functionality to the Excalidraw codebase directly. But for now an independent browser specific extension appears to be a sensible approach for now to avoid forking the codebase. This also mitigates a direct dependency on the Excalidraw team, which appears to be overwhelmed with issues and requests already._

# Analysis

...
