// This module contains Chrome API functions.
// Reference: https://developer.chrome.com/docs/extensions/reference/

/**
 * Moves specified tabs.
 * Returns a `Promise` with details about the moved tabs.
 *
 * Reference: https://developer.chrome.com/docs/extensions/reference/tabs/#method-move
 *
 * @param {number[]} tabIds
 * @param {object} moveProperties
 * @returns {Promise<chrome.tabs.Tab[]>}
 */
export async function moveTabs(tabIds, moveProperties) {
  switch (tabIds.length) {
    case 0:
      // Handle “No tabs given” error.
      return []

    case 1:
      // Return `Promise<Tab[]>` instead of `Promise<Tab>`.
      return chrome.tabs.move(tabIds, moveProperties).then((tab) =>
        [tab]
      )

    default:
      return chrome.tabs.move(tabIds, moveProperties)
  }
}

/**
 * Creates and displays a notification.
 * Returns a `Promise` with the ID of the created notification.
 *
 * Reference: https://developer.chrome.com/docs/extensions/reference/notifications/#method-create
 *
 * @param {string} message
 * @returns {Promise<string>}
 */
export async function sendNotification(message) {
  return chrome.notifications.create({ title: 'Chrome', message, type: 'basic', iconUrl: '/assets/chrome-logo@128px.png' })
}

/**
 * Waits for a specific navigation event.
 *
 * Reference: https://developer.chrome.com/docs/extensions/reference/webNavigation/#event
 *
 * @param {number} tabId
 * @param {string} eventType
 * @returns {Promise<void>}
 */
export async function waitForNavigation(tabId, eventType) {
  const event = chrome.webNavigation[eventType]

  return new Promise((resolve) => {
    event.addListener(
      function fireAndForget(details) {
        if (details.tabId === tabId) {
          event.removeListener(fireAndForget)
          resolve()
        }
      }
    )
  })
}

// This module contains additional `Array` functions.
// Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array

/**
 * Returns a `Tuple` with two arrays.
 * The first one contains the elements in the collection for which the passed block is truthy,
 * and the second one those for which the block is falsy.
 *
 * Reference: https://crystal-lang.org/api/master/Enumerable.html#:~:text=#partition
 *
 * @template Element
 * @param {Array<Element>} array
 * @param {(element: Element) => boolean} predicate
 * @returns {[Array<Element>, Array<Element>]}
 */
export function partition(array, predicate) {
  const leftPartition = []
  const rightPartition = []
  for (const element of array) {
    if (predicate(element)) {
      leftPartition.push(element)
    } else {
      rightPartition.push(element)
    }
  }
  return [leftPartition, rightPartition]
}

/**
 * Returns an `Array` that enumerates over the items, chunking them together based on the return value of the block.
 * Consecutive elements which return the same block value are chunked together.
 *
 * Reference: https://crystal-lang.org/api/master/Enumerable.html#:~:text=#chunks
 *
 * @template Element,Result
 * @param {Array<Element>} array
 * @param {(element: Element) => Result} callback
 * @returns {[Result, Array<Element>][]}
 */
export function chunk(array, callback) {
  const chunks = []
  for (const element of array) {
    const [lastKey, currentChunk] = chunks.at(-1) ?? []
    const key = callback(element)
    if (key === lastKey) {
      currentChunk.push(element)
    } else {
      chunks.push([key, [element]])
    }
  }
  return chunks
}

// This module contains date-time functions.
// Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date

/**
 * Returns the ISO date portion of the specified date.
 *
 * @param {Date} date
 * @returns {string}
 */
export function getISODateString(date) {
  return date.toLocaleDateString('en-CA')
}

// This module contains mathematical functions.

/**
 * Returns the remainder of a division.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
 *
 * @param {number} dividend
 * @param {number} divisor
 * @returns {number}
 */
export function modulo(dividend, divisor) {
  return ((dividend % divisor) + divisor) % divisor
}

/**
 * Clamps a value between *min* and *max*.
 *
 * Reference: https://crystal-lang.org/api/master/Comparable.html#clamp(min,max)-instance-method
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max))
}

/**
 * Returns visible tabs in the tab strip.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {number} windowId
 * @returns {Promise<chrome.tabs.Tab[]>}
 */
export async function getVisibleTabs(windowId) {
  // Determine whose tabs are hidden.
  // A tab in a collapsed group is considered hidden.
  const tabGroups = await getAllTabGroups(windowId)
  const collapsedInfo = Object.fromEntries(tabGroups.map((tabGroup) => [tabGroup.id, tabGroup.collapsed]))

  const tabs = await getAllTabs(windowId)
  const visibleTabs = tabs.filter((tab) => !collapsedInfo[tab.groupId])

  return visibleTabs
}

/**
 * Returns an open tab relative to the current tab.
 * Skips hidden tabs—the ones whose are in collapsed tab groups—
 * and wraps around.
 *
 * @param {number} tabId
 * @param {number} windowId
 * @param {number} delta
 * @returns {Promise<chrome.tabs.Tab>}
 */
export async function getOpenTabRelative(tabId, windowId, delta) {
  const tabs = await getVisibleTabs(windowId)
  const tabIndex = tabs.findIndex(tab => tab.id === tabId)
  const index = modulo(tabIndex + delta, tabs.length)
  const tab = tabs[index]

  return tab
}

/**
 * Returns an open window relative to the current window.
 * Skips minimized windows and wraps around.
 *
 * @param {number} windowId
 * @param {number} delta
 * @returns {Promise<chrome.windows.Window>}
 */
export async function getOpenWindowRelative(windowId, delta) {
  const allWindows = await chrome.windows.getAll()
  const windows = allWindows.filter((window) => window.state !== 'minimized')
  const windowIndex = windows.findIndex((window) => window.id === windowId)
  const index = modulo(windowIndex + delta, windows.length)
  const window = windows[index]

  return window
}
