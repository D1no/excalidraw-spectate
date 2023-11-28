const SPECTATOR_HIDE_POINTER = true;
const SPECTATOR_HIDE_USERNAME = true;
const SPECTATOR_HIDE_SELECTED_ELEMENTS = true;

const SPECTATOR_NO_COLOR =
  SPECTATOR_HIDE_POINTER &&
  SPECTATOR_HIDE_USERNAME &&
  SPECTATOR_HIDE_SELECTED_ELEMENTS;

const SPECTATOR_DEBUG = false;
const SPECTATOR_URL_FRAGMENT = ",spectate";
// TODO: Don't force spectator mode
const SPECTATOR_FORCE_ACTIVE = true;

/******************************************************************************
 * Check if we want to run the script based on the url. Only continue if there is
 * ",spectate" in the url.
 */

// TODO: This is not ideal, since the page needs a hard reload to get into spectator mode.
function checkIfSpectatorMode(ourFragment = SPECTATOR_URL_FRAGMENT) {
  const url = window.location.href;
  if (url.includes(ourFragment)) {
    // Change URL state without reloading with the fragment removed
    window.history.replaceState(null, null, url.replace(ourFragment, ""));
    return true;
  } else {
    // Not in spectator mode
    return false;
  }
}

if (SPECTATOR_FORCE_ACTIVE || checkIfSpectatorMode()) {
  /******************************************************************************
   * Add class to root node to hide UI elements with css selectors
   */

  document.addEventListener("DOMContentLoaded", () => {
    const excalidrawAppDiv = document.querySelector("#root");
    if (excalidrawAppDiv) {
      excalidrawAppDiv.classList.add("spectating");
    }
  });

  /******************************************************************************
   * Generate ID for Target Color
   */

  // Collapsed algorithm from the Excalidraw logic to evaluate against.
  function hashToIntegerHueDeciBlock(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = (hash << 5) - hash + char;
    }
    return Math.abs(hash) % 37;
  }

  // Finds a new ID that has the desired hue color space in blocks of 10 at a time complexity of O(nk) where n is the number of existing IDs and k the number of iterations needed to find a unique ID which depends on the target length.
  // This is not deterministic but finding a new ID against 10 existing IDs with a length of 20 takes about 3ms.
  function generateUniqueIdForTargetHueDeciBlock(
    targetHueDeciBlock,
    existingIds,
    idLengthToGenerate,
    idPrefix,
    debug = SPECTATOR_DEBUG
  ) {
    if (
      targetHueDeciBlock < 0 ||
      targetHueDeciBlock > 36 ||
      idLengthToGenerate < 3
    ) {
      console.error("Out of bounds in targetHueDeciBlock or idLength below 3");
      return null;
    }

    const letters = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const allChars = letters + numbers;
    // If no prefix is given, generate a random letter to avoid type casting surprises
    const textPrefix =
      idPrefix || letters.charAt(Math.floor(Math.random() * letters.length));
    // targetHueDeciBlock to two digit string
    const targetHueDeciBlockString = targetHueDeciBlock
      .toString()
      .padStart(2, "0");
    const prefix = textPrefix + targetHueDeciBlockString;

    let newId = "";
    let iterationCount = 0;

    let startTime;
    if (debug) {
      startTime = performance.now();
    }

    while (true) {
      iterationCount++;
      // Start with a prefix where we include the hueblock to be able to detect and change it later
      newId = prefix;
      for (let i = 0; i < idLengthToGenerate; i++) {
        // Pack with random characters
        newId += allChars.charAt(Math.floor(Math.random() * allChars.length));
      }

      // Check if the new ID is unique to the whole set and has the desired HeuDeci value
      if (
        !existingIds.includes(newId) &&
        hashToIntegerHueDeciBlock(newId) === targetHueDeciBlock
      ) {
        if (debug) {
          const endTime = performance.now();

          console.log(
            `Found for Hue ${targetHueDeciBlock * 10} the new ID: ${newId}`
          );
          console.log(
            `Iterations: ${iterationCount} against ${existingIds.length} existing IDs`
          );
          console.log(`Time taken: ${(endTime - startTime).toFixed(2)} ms`);
        }
        // Leaving the loop
        break;
      }
    }

    // Return the new ID
    return newId;
  }

  /******************************************************************************
   * Replace ID for Color
   * TODO: This doesn't work on Excalidraw Plus
   */

  // Color Ids
  const SPECTATOR_ID_TO_COLOR_ID = new Map();
  const SPECTATOR_COLOR_ID_TO_ID_WITH_SPEC = new Map();
  // Color 21: Light Blue
  // Darker Blue: 24
  // Color 0: Red
  const SPECTATOR_TARGET_HUE_DECI_BLOCK = 21;

  const prefixOfTuchedIds = "SPEC";
  const idLength = 20;

  function replaceIdForColorId(id, debug = SPECTATOR_DEBUG) {
    if (id.startsWith(prefixOfTuchedIds)) {
      if (debug) console.log("Already touched key. Returning:", id);
      // TODO: Add ability to change color map to new target hue deci block and delete old ColorKey. Otherwise we would have a memory leak as soon it is possible to change colors in an instance.
      return id;
    } else if (SPECTATOR_ID_TO_COLOR_ID.has(id)) {
      const existingId = SPECTATOR_ID_TO_COLOR_ID.get(id);

      if (debug) console.log("Retrieved existing key:", existingId, "for", id);
      return existingId;
    } else {
      const newId = generateUniqueIdForTargetHueDeciBlock(
        SPECTATOR_TARGET_HUE_DECI_BLOCK,
        Array.from(SPECTATOR_ID_TO_COLOR_ID.values()),
        idLength,
        prefixOfTuchedIds
      );

      SPECTATOR_ID_TO_COLOR_ID.set(id, newId);
      SPECTATOR_COLOR_ID_TO_ID_WITH_SPEC.set(newId, [
        id,
        SPECTATOR_TARGET_HUE_DECI_BLOCK,
      ]);

      if (debug) console.log("Created new key:", newId, "for", id);

      return newId;
    }
  }

  const expectedMinLengthOrgID = 16;

  /******************************************************************************
   * Proxy Map
   */

  // Check i.e. for a fragment like #spectate to proxy when necessary.

  const OriginalMap = Map;

  window.Map = new Proxy(OriginalMap, {
    construct(target, args) {
      const originalMapInstance = new target(...args);

      const originalSet = originalMapInstance.set;

      // Wrap the original 'set' method
      // TODO: Decide if we want to only proxy on the value retrieval side, deleting the set method.
      originalMapInstance.set = function (key, value) {
        // Check if we need to even take a look at this operation
        if (
          SPECTATOR_HIDE_POINTER ||
          SPECTATOR_HIDE_SELECTED_ELEMENTS ||
          SPECTATOR_HIDE_USERNAME ||
          SPECTATOR_DEBUG
        ) {
          // Check if key is string and value is an object
          if (typeof key === "string" && typeof value === "object") {
            // Check if value has pointer and selectedElementIds properties
            // and delete accordingly.

            if (!SPECTATOR_NO_COLOR) {
              if ("pointer" in value) {
                // TODO: Split into a call for changing the target hue of a particular ID and patching the ID. This was we can look for certain user names etc and assign them colors.
                key = replaceIdForColorId(key);
              }
            }

            if (SPECTATOR_HIDE_POINTER && "pointer" in value) {
              delete value.pointer;
            } else if (SPECTATOR_HIDE_USERNAME && "username" in value) {
              delete value.username;
            }

            if (
              SPECTATOR_HIDE_SELECTED_ELEMENTS &&
              "selectedElementIds" in value
            ) {
              delete value.selectedElementIds;
            }
          }
        }

        return originalSet.call(this, key, value);
      };

      // TODO: This means, we need to reload the window if settings change
      if (!SPECTATOR_NO_COLOR) {
        const originalForEach = originalMapInstance.forEach;

        // Wrap the original 'forEach' method
        // Used for rendering to canvas. We ignore get for now.
        originalMapInstance.forEach = function (originalCallback, thisArg) {
          const wrappedCallback = (value, key, map) => {
            let modifiedKey = key;
            // Check if key is string and value is an object
            if (typeof key === "string" && typeof value === "object") {
              // Check if the string is likely an ID

              // NOTE: Without the matchers, we would also mutate firebase keys. These matchers are from
              // https://github.com/excalidraw/excalidraw/blob/7c9cf30909c6c368407994cb25e22292b99eee5d/src/types.ts#L41-L56
              if (
                key.length >= expectedMinLengthOrgID &&
                ("pointer" in value ||
                  "button" in value ||
                  "selectedElementIds" in value ||
                  "username" in value ||
                  "userState" in value || // <- Likely most reliable one
                  "avatarUrl" in value)
              ) {
                // Replace the returning key.
                modifiedKey = replaceIdForColorId(key);
              }
            }

            // Call the original callback function with modified arguments
            originalCallback.call(thisArg, value, modifiedKey, map);
          };

          // Call the original 'forEach' method with the wrapped callback to keep its context
          return originalForEach.call(this, wrappedCallback, thisArg);
        };
      }

      supportLaserPointer = false;
      // Right now the laser pointer can flip to the orgID for color, since we don't
      // intercept on the constructor side.
      if (supportLaserPointer) {
        // Used in LaserPointer Tool here:
        // https://github.com/excalidraw/excalidraw/blob/dd220bcaea1678a85453b3af900fe3fae0e3481e/src/components/LaserTool/LaserPathManager.ts#L255-L279
        // This is not enough - need more than just entries as it uses has etc.
        const originalEntries = originalMapInstance.entries;

        // Wrap the original 'entries' method
        originalMapInstance.entries = function () {
          const iterator = originalEntries.call(this);
          return {
            next: () => {
              const result = iterator.next();
              if (result.done) return result;

              let [key, value] = result.value;
              if (typeof key === "string" && typeof value === "object") {
                // Your logic to check the key and value
                if (
                  key.length >= expectedMinLengthOrgID &&
                  ("pointer" in value ||
                    "button" in value ||
                    "selectedElementIds" in value ||
                    "username" in value ||
                    "userState" in value ||
                    "avatarUrl" in value)
                ) {
                  key = replaceIdForColorId(key);
                }
              }
              return { value: [key, value], done: false };
            },
            [Symbol.iterator]: function () {
              return this;
            },
          };
        };
      }

      // Return the modified map instance directly
      return originalMapInstance;
    },
  });
}
