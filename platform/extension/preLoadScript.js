const EXCALIDRAW_HIDE_POINTER = false;
const EXCALIDRAW_HIDE_USERNAME = true;
const EXCALIDRAW_HIDE_SELECTED_ELEMENTS = true;
const EXCALIDRAW_HIDE_DEBUG = true;

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
  debug = false
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
 */

// Color Ids
const SPECTATOR_ID_TO_COLOR_ID = new Map();
const SPECTATOR_COLOR_ID_TO_ID_WITH_SPEC = new Map();
const SPECTATOR_TARGET_HUE_DECI_BLOCK = 3;

const prefixOfTuchedIds = "SPEC";
const idLength = 20;

function replaceIdForColorId(id) {
  if (id.startsWith(prefixOfTuchedIds)) {
    console.log("Already touched key. Returning:", id);
    // TODO: Add ability to change color map to new target hue deci block and delete old ColorKey. Otherwise we would have a memory leak as soon it is possible to change colors in an instance.
    return id;
  } else if (SPECTATOR_ID_TO_COLOR_ID.has(id)) {
    const existingId = SPECTATOR_ID_TO_COLOR_ID.get(id);

    console.log("Retrieved existing key:", existingId, "for", id);
    return existingId;
  } else {
    const newId = generateUniqueIdForTargetHueDeciBlock(
      SPECTATOR_TARGET_HUE_DECI_BLOCK,
      Array.from(SPECTATOR_ID_TO_COLOR_ID.values()),
      idLength,
      prefixOfTuchedIds,
      true
    );

    SPECTATOR_ID_TO_COLOR_ID.set(id, newId);
    SPECTATOR_COLOR_ID_TO_ID_WITH_SPEC.set(newId, [
      id,
      SPECTATOR_TARGET_HUE_DECI_BLOCK,
    ]);

    console.log("Created new key:", newId, "for", id);

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
        EXCALIDRAW_HIDE_POINTER ||
        EXCALIDRAW_HIDE_SELECTED_ELEMENTS ||
        EXCALIDRAW_HIDE_USERNAME ||
        EXCALIDRAW_HIDE_DEBUG
      ) {
        // Check if key is string and value is an object
        if (typeof key === "string" && typeof value === "object") {
          // Check if value has pointer and selectedElementIds properties
          // and delete accordingly.

          if ("pointer" in value) {
            // TODO: Split into a call for changing the target hue of a particular ID and patching the ID. This was we can look for certain user names etc and assign them colors.
            key = replaceIdForColorId(key);
          }

          if (EXCALIDRAW_HIDE_POINTER && "pointer" in value) {
            delete value.pointer;
          } else if (EXCALIDRAW_HIDE_USERNAME && "username" in value) {
            delete value.username;
          }

          if (
            EXCALIDRAW_HIDE_SELECTED_ELEMENTS &&
            "selectedElementIds" in value
          ) {
            delete value.selectedElementIds;
          }
        }
      }

      return originalSet.call(this, key, value);
    };

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

    // Return the modified map instance directly
    return originalMapInstance;
  },
});
