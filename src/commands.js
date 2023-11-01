// This module contains commands to add keyboard shortcuts.
//
// Commands are parameter-less actions that can be performed with a tab context.
// Their main use is for key bindings.
// Commands are defined by adding properties to the `commands` object in the extension’s manifest.
// The command signature must be a function of one argument (a tab context).
//
// Manifest: https://developer.chrome.com/docs/extensions/mv3/manifest/
// Commands: https://developer.chrome.com/docs/extensions/reference/commands/

/**
 * @typedef {object} Context
 * @property {chrome.tabs.Tab} tab
 * @property {MostRecentlyUsedTabsManager} mostRecentlyUsedTabsManager
 */

import {
  blurActiveElement,
  clickPageElement,
  focusPageElement,
  getSelectedText,
  prompt,
  scrollBy,
  scrollByPages,
  scrollTo,
  scrollToMax,
  writeTextToClipboard,
} from './injectable_scripts.js'

import {
  chunk,
  clamp,
  getISODateString,
  getOpenTabRelative,
  getOpenWindowRelative,
  getVisibleTabs,
  modulo,
  // moveTabs,
  partition,
  sendNotification,
  waitForNavigation,
} from './utils.js'

// Language-sensitive string comparison
// Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator
const { compare: localeCompare } = new Intl.Collator

// List of tab group colors
// Reference: https://developer.chrome.com/docs/extensions/reference/tabGroups/#type-Color
const tabGroupColors = Object.values(chrome.tabGroups.Color)

// Constants -------------------------------------------------------------------

const { TAB_GROUP_ID_NONE } = chrome.tabGroups
const { NEW_TAB: NEW_TAB_DISPOSITION } = chrome.search.Disposition

// Enums -----------------------------------------------------------------------

// Enum representing a direction.
const Direction = { Backward: -1, Forward: 1 }

// Navigation ------------------------------------------------------------------

/**
 * TODO: OK
 * Goes back to the previous page in tab’s history.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function goBack(cx) {
  await chrome.tabs.goBack(cx.tab.id)
  await waitForNavigation(cx.tab.id, 'onCommitted')
}

/**
 * TODO: OK
 * Goes forward to the next page in tab’s history.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function goForward(cx) {
  await chrome.tabs.goForward(cx.tab.id)
  await waitForNavigation(cx.tab.id, 'onCommitted')
}

/**
 * TODO: OK
 * Reloads selected tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function reloadTab(cx) {
  const tabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })
  await Promise.all(
    tabs.map((tab) =>
      chrome.tabs.reload(tab.id)
    )
  )
}

/**
 * TODO: OK
 * Reloads selected tabs, ignoring cached content.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function reloadTabWithoutCache(cx) {
  const tabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })
  await Promise.all(
    tabs.map((tab) =>
      chrome.tabs.reload(tab.id, {
        bypassCache: true
      })
    )
  )
}

/**
 * TODO: OK
 * Goes to the next page in the series, if one is available.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel#attr-next
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function goToNextPage(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: clickPageElement,
    args: ['[rel="next"]']
  })
}

/**
 * TODO: OK
 * Goes to the previous page in the series, if one is available.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel#attr-prev
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function goToPreviousPage(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: clickPageElement,
    args: ['[rel="prev"]']
  })
}

/**
 * TODO: OK
 * Navigates at the URL specified.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Location/assign
 *
 * @param {Context} cx
 * @param {function} func
 * @returns {Promise<void>}
 */
async function assignURL(cx, func) {
  const baseURL = new URL(cx.tab.url)
  const navigateURL = new URL(func(baseURL), baseURL)
  return chrome.tabs.update(cx.tab.id, {
    url: navigateURL.toString()
  })
}

/**
 * TODO: OK
 * Removes any URL parameters.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function removeURLParams(cx) {
  await assignURL(cx, url => url.pathname)
}

/**
 * TODO: OK
 * Goes up in the URL hierarchy.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function goUp(cx) {
  await assignURL(cx, url => url.pathname.endsWith('/') ? '..' : '.')
}

/**
 * TODO: OK
 * Goes to the root URL.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function goToRoot(cx) {
  await assignURL(cx, url => '/')
}

// Accessibility ---------------------------------------------------------------

/**
 * TODO: OK
 * Focuses the first input, if any.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusInput(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: focusPageElement,
    args: ['input']
  })
}

/**
 * TODO: OK
 * Focuses the first text area, if any.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusTextArea(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: focusPageElement,
    args: ['textarea']
  })
}

/**
 * TODO: OK
 * Focuses the first video, if any.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusVideo(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: focusPageElement,
    args: ['video']
  })
}

/**
 * TODO: OK
 * Blurs the active element.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function blurElement(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: blurActiveElement
  })
}

// Clipboard -------------------------------------------------------------------

/**
 * TODO: OK
 * @param {Context} cx
 * @param {function} func
 * @param {string} message
 * @returns {Promise<void>}
 */
async function copy_impl(cx, func, message) {
  const tabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })
  const text = tabs.map(func).join('\n')
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: writeTextToClipboard,
    args: [text]
  })
  await sendNotification(message)
}

/**
 * TODO: OK
 * Copies URL of selected tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function copyURL(cx) {
  await copy_impl(cx, tab => tab.url, 'URL copied to clipboard')
}

/**
 * TODO: OK
 * Copies title of selected tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function copyTitle(cx) {
  await copy_impl(cx, tab => tab.title, 'Title copied to clipboard')
}

/**
 * TODO: OK
 * Copies title and URL of selected tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function copyTitleAndURL(cx) {
  await copy_impl(cx, ({title, url}) => `[${title}](${url})`, 'Title and URL copied to clipboard')
}

// Web search ------------------------------------------------------------------

/**
 * TODO: OK
 * Performs a search for selected text using the default search engine.
 * The results will be displayed in a new tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openWebSearchForSelectedText(cx) {
  const [{ result: selectedText }] = await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: getSelectedText
  })

  // Bail out if there is nothing to search.
  if (selectedText === null) {
    return
  }

  // Perform a search using the default search engine.
  // The results will be displayed in a new tab.
  await chrome.search.query({
    text: selectedText,
    disposition: NEW_TAB_DISPOSITION
  })

  // Post-fix the created tab state.
  const [createdTab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  })

  await Promise.all([
    chrome.tabs.update(createdTab.id, {
      openerTabId: cx.tab.id
    }),

    chrome.tabs.move(createdTab.id, {
      index: cx.tab.index + 1
    }),

    // Add the new tab to the opener tab’s group, if it has one.
    cx.tab.groupId !== TAB_GROUP_ID_NONE && chrome.tabs.group({
      tabIds: [createdTab.id],
      groupId: cx.tab.groupId
    })
  ])
}

// Scroll ----------------------------------------------------------------------

/**
 * TODO: OK
 * Scrolls down.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function scrollDown(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: scrollBy,
    args: [0, 70]
  })
}

/**
 * TODO: OK
 * Scrolls up.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function scrollUp(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: scrollBy,
    args: [0, -70]
  })
}

/**
 * TODO: OK
 * Scrolls left.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function scrollLeft(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: scrollBy,
    args: [-70, 0]
  })
}

/**
 * TODO: OK
 * Scrolls right.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function scrollRight(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: scrollBy,
    args: [70, 0]
  })
}

/**
 * TODO: OK
 * Scrolls one page down.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function scrollPageDown(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: scrollByPages,
    args: [0.9]
  })
}

/**
 * TODO: OK
 * Scrolls one page up.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function scrollPageUp(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: scrollByPages,
    args: [-0.9]
  })
}

/**
 * TODO: OK
 * Scrolls half page down.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function scrollHalfPageDown(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: scrollByPages,
    args: [0.5]
  })
}

/**
 * TODO: OK
 * Scrolls half page up.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function scrollHalfPageUp(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: scrollByPages,
    args: [-0.5]
  })
}

/**
 * TODO: OK
 * Scrolls to the top of the page.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function scrollToTop(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: scrollTo,
    args: [0, 0]
  })
}

/**
 * TODO: OK
 * Scrolls to the bottom of the page.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function scrollToBottom(cx) {
  await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: scrollToMax,
    args: [0]
  })
}

// Zoom ------------------------------------------------------------------------

/**
 * TODO: OK
 * Zooms in.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function zoomIn(cx) {
  const zoomFactor = await chrome.tabs.getZoom(cx.tab.id)
  await chrome.tabs.setZoom(cx.tab.id, zoomFactor + 0.1)
}

/**
 * TODO: OK
 * Zooms out.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function zoomOut(cx) {
  const zoomFactor = await chrome.tabs.getZoom(cx.tab.id)
  await chrome.tabs.setZoom(cx.tab.id, zoomFactor - 0.1)
}

/**
 * TODO: OK
 * Resets the zoom factor.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function zoomReset(cx) {
  await chrome.tabs.setZoom(cx.tab.id, 0)
}

/**
 * TODO: OK
 * Turns full-screen mode on or off.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function toggleFullScreen(cx) {
  const currentWindow = await chrome.windows.get(cx.tab.windowId)
  const nextWindowState = currentWindow.state === 'fullscreen' ? 'normal' : 'fullscreen'
  await chrome.windows.update(currentWindow.id, {
    state: nextWindowState
  })
}

// Create tabs -----------------------------------------------------------------

/**
 * TODO: OK
 * Opens and activates a new tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openNewTab(cx) {
  await chrome.tabs.create({
    active: true,
    openerTabId: cx.tab.id
  })
}

/**
 * TODO: OK
 * Opens and activates a new tab to the right.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openNewTabRight(cx) {
  const createdTab = await chrome.tabs.create({
    active: true,
    index: cx.tab.index + 1,
    openerTabId: cx.tab.id
  })
  // Add the new tab to the opener tab’s group, if it has one.
  if (cx.tab.groupId !== TAB_GROUP_ID_NONE) {
    await chrome.tabs.group({
      tabIds: [createdTab.id],
      groupId: cx.tab.groupId
    })
  }
}

/**
 * TODO: OK
 * Opens a new window.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openNewWindow(cx) {
  await chrome.windows.create({
    focused: true
  })
}

/**
 * TODO: OK
 * Opens a new window in Incognito mode.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openNewIncognitoWindow(cx) {
  await chrome.windows.create({
    focused: true,
    incognito: true
  })
}

// Close tabs ------------------------------------------------------------------

/**
 * TODO: OK
 * Closes selected tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function closeTab(cx) {
  const tabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })
  const tabIds = tabs.map(tab => tab.id)
  await chrome.tabs.remove(tabIds)
}

/**
 * TODO: OK
 * Closes the window that contains the tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function closeWindow(cx) {
  await chrome.windows.remove(cx.tab.windowId)
}

/**
 * TODO: OK
 * Reopens previously closed tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function restoreTab(cx) {
  await chrome.sessions.restore()
}

// Tab state -------------------------------------------------------------------

/**
 * TODO: OK
 * Duplicates selected tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function duplicateTab(cx) {
  const tabs = await chrome.tabs.query({
    windowId: cx.tab.windowId
  })

  const tabGroups = await chrome.tabGroups.query({
    windowId: cx.tab.windowId
  })

  const groupIdToProperties = new Map(
    tabGroups.map(({ id, title, color, collapsed }) => [
      id, { title, color, collapsed }
    ])
  )

  const tabPartition = chunk(tabs, byGroup).map(([groupId, tabs]) => {
    const [selectedTabs, otherTabs] = partition(tabs, isSelected)
    return [groupId, selectedTabs, otherTabs]
  })

  const duplicatedTabMap = new Map

  for (const [groupId, selectedTabs, otherTabs] of tabPartition) {
    // Duplicate selected tabs.
    let duplicatedTabs = await Promise.all(
      selectedTabs.map((tab) =>
        chrome.tabs.duplicate(tab.id)
      )
    )

    // Duplicate tab group if fully selected.
    if (groupId !== TAB_GROUP_ID_NONE && otherTabs.length === 0) {
      const groupProperties = groupIdToProperties.get(groupId)
      const groupId = await chrome.tabs.group({
        tabIds: duplicatedTabs.map(getTabId)
      })

      await chrome.tabGroups.update(groupId, groupProperties)

      // Resync tab position.
      duplicatedTabs = await chrome.tabs.query({
        groupId
      })
    }

    for (const index in selectedTabs) {
      duplicatedTabMap.set(selectedTabs[index].id, duplicatedTabs[index].index)
    }
  }

  // Select duplicated tabs.
  const tabsToHighlight = [
    duplicatedTabMap.get(cx.tab.id), ...duplicatedTabMap.values()
  ]

  await chrome.tabs.highlight({
    tabs: tabsToHighlight,
    windowId: cx.tab.windowId
  })
}

/**
 * Pins or unpins selected tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function togglePinTab(cx) {
  const tabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })
  const someTabsNotPinned = tabs.some((tab) => !tab.pinned)
  await Promise.all(
    tabs.map((tab) => chrome.tabs.update(tab.id, { pinned: someTabsNotPinned }))
  )
}

/**
 * Groups specified tabs and preserves selection.
 *
 * @param {number[]} tabIds
 * @param {Context} cx
 * @returns {Promise<void>}
 */
async function groupTabsAndPreserveSelection(cx, tabIds) {
  const { id: tabId, windowId } = cx.tab
  const groupId = await chrome.tabs.group({ tabIds })
  const groupedTabs = await chrome.tabs.query({ groupId })
  const tabToActivate = groupedTabs.find((tab) => tab.id === tabId)
  const tabsToHighlight = [tabToActivate, ...groupedTabs].map(tab => tab.index)
  await chrome.tabs.highlight({
    tabs: tabsToHighlight,
    windowId
  })
}

/**
 * Groups or ungroups selected tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function toggleGroupTab(cx) {
  const tabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })
  const someTabsNotInGroup = tabs.some((tab) => tab.groupId === TAB_GROUP_ID_NONE)
  const groupAction = someTabsNotInGroup ? groupTabsAndPreserveSelection.bind(null, cx) : chrome.tabs.ungroup.bind(null)
  const tabIds = tabs.map(tab => tab.id)
  await groupAction(tabIds)
}

/**
 * Collapses or uncollapses tab groups.
 * Note: Active groups are not collapsible.
 * Ensures highlighted tabs are visible.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function toggleCollapseTabGroups(cx) {
  const selectedTabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })
  const allTabGroups = await chrome.tabGroups.query({
    windowId: cx.tab.windowId
  })

  // Determine whose groups are active.
  // A group that contains highlighted tabs is considered active.
  const activeGroupIds = new Set(selectedTabs.map(tab => tab.groupId))
  activeGroupIds.delete(TAB_GROUP_ID_NONE)

  // Note: Active groups are not collapsible.
  const [activeGroups, collapsibleGroups] = partition(allTabGroups, (tabGroup) => activeGroupIds.has(tabGroup.id))
  const someExpanded = collapsibleGroups.some(tabGroup => !tabGroup.collapsed)

  await Promise.all([
    // At least one group is not collapsed, so collapse everything.
    // All groups are collapsed, so expand everything.
    Promise.all(
      collapsibleGroups.map((tabGroup) =>
        chrome.tabGroups.update(tabGroup.id, { collapsed: someExpanded })
      )
    ),
    // Ensure highlighted tabs are visible.
    Promise.all(
      activeGroups.map((tabGroup) =>
        chrome.tabGroups.update(tabGroup.id, { collapsed: false })
      )
    )
  ])
}

/**
 * Mutes or unmutes selected tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function toggleMuteTab(cx) {
  const tabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })
  const someTabsNotMuted = tabs.some((tab) => !tab.mutedInfo.muted)
  await Promise.all(
    tabs.map((tab) =>
      chrome.tabs.update(tab.id, {
        muted: someTabsNotMuted
      })
    )
  )
}

/**
 * Discards selected tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function discardTab(cx) {
  const tabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })
  await Promise.all(
    tabs.map((tab) => chrome.tabs.discard(tab.id))
  )
}

// Organize tabs ---------------------------------------------------------------

/**
 * Sorts tabs by URL.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function sortTabsByURL(cx) {
  const tabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })
  const tabChunks = chunk(tabs, (tab) => tab.pinned || tab.groupId)

  // Sort chunked tabs by URL.
  await Promise.all(
    tabChunks.map(([key, tabs]) => {
      // Sort tabs and keep a reference to the original tab indices.
      const tabIndices = tabs.map(tab => tab.index)
      const sortedTabs = tabs.sort((tab, otherTab) => localeCompare(tab.url, otherTab.url))

      // Move tabs to their post-sort locations.
      return Promise.all(
        sortedTabs.map((tab, index) => chrome.tabs.move(tab.id, { index: tabIndices[index] }))
      )
    })
  )
}

/**
 * Groups tabs by domain.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function groupTabsByDomain(cx) {
  const tabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })
  const tabIds = tabs.map(tab => tab.id)
  const tabsByDomain = Map.groupBy(tabs, tab => new URL(tab.url).hostname)

  // Get all tab groups and group them by title.
  const tabGroups = await chrome.tabGroups.query({
    windowId: cx.tab.windowId
  })
  const tabGroupsByTitle = Object.groupBy(tabGroups, tabGroup => tabGroup.title)

  // Group tabs by domain.
  await Promise.all(
    Array.from(tabsByDomain, ([hostname, tabs]) => {
      const tabGroups = tabGroupsByTitle[hostname]

      // Add tabs to an existing group if possible.
      return tabGroups
        ? chrome.tabs.group({ tabIds, groupId: tabGroups[0].id })
        : chrome.tabs.group({ tabIds }).then(groupId => chrome.tabGroups.update(groupId, { title: hostname }))
    })
  )
}

// Manage tab groups -----------------------------------------------------------

/**
 * Renames tab group (prompts for a new name).
 * Tags: args
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function renameTabGroupPrompt(cx) {
  // Fail-fast if there is no tab group.
  if (cx.tab.groupId === TAB_GROUP_ID_NONE) {
    return
  }

  const tabGroup = await chrome.tabGroups.get(cx.tab.groupId)

  // Prompt for a new name.
  const [{ result: tabGroupTitle }] = await chrome.scripting.executeScript({
    target: {
      tabId: cx.tab.id
    },
    func: prompt,
    args: ['Name this group', tabGroup.title]
  })

  // Bail out if there is no new name.
  if (tabGroupTitle === null || tabGroupTitle === tabGroup.title) {
    return
  }

  // Update tab group title.
  await chrome.tabGroups.update(tabGroup.id, { title: tabGroupTitle })
}

/**
 * Cycles through tab group colors.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
async function cycleTabGroupColor(cx, delta) {
  // Fail-fast if there is no tab group.
  if (cx.tab.groupId === TAB_GROUP_ID_NONE) {
    return
  }

  const tabGroup = await chrome.tabGroups.get(cx.tab.groupId)

  // Get the next color.
  const colorIndex = tabGroupColors.indexOf(tabGroup.color)
  const nextColorIndex = modulo(colorIndex + delta, tabGroupColors.length)
  const nextColor = tabGroupColors[nextColorIndex]

  // Cycle through tab group colors.
  await chrome.tabGroups.update(tabGroup.id, { color: nextColor })
}

/**
 * Cycles forward through tab group colors.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function cycleTabGroupColorForward(cx) {
  await cycleTabGroupColor(cx, 1)
}

/**
 * Cycles backward through tab group colors.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function cycleTabGroupColorBackward(cx) {
  await cycleTabGroupColor(cx, -1)
}

// Switch tabs -----------------------------------------------------------------

/**
 * Activates the first audible tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusAudibleTab(cx) {
  const [audibleTab] = await chrome.tabs.query({
    audible: true
  })
  if (audibleTab) {
    await chrome.tabs.update(audibleTab.id, { active: true })
    await chrome.windows.update(audibleTab.windowId, { focused: true })
  }
}

/**
 * Activates an open tab relative to the current tab.
 * Skips hidden tabs—the ones whose are in collapsed tab groups—
 * and wraps around.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
async function focusTabRelative(cx, delta) {
  const tab = await getOpenTabRelative(cx.tab.id, cx.tab.windowId, cx, delta)
  await chrome.tabs.update(tab.id, { active: true })
}

/**
 * Activates the next open tab.
 * Skips hidden tabs—the ones whose are in collapsed tab groups—
 * and wraps around.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusNextTab(cx) {
  await focusTabRelative(cx, 1)
}

/**
 * Activates the previous open tab.
 * Skips hidden tabs—the ones whose are in collapsed tab groups—
 * and wraps around.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusPreviousTab(cx) {
  await focusTabRelative(cx, -1)
}

/**
 * Activates a tab by its index.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
async function focusTabByIndex(cx, index) {
  const tabs = await getVisibleTabs(cx.tab.windowId)
  const targetTab = tabs.at(index)

  if (targetTab) {
    await chrome.tabs.update(targetTab.id, { active: true })
    await chrome.windows.update(targetTab.windowId, { focused: true })
  }
}

/**
 * Activates the leftmost open tab.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusFirstTab(cx) {
  await focusTabByIndex(cx, 0)
}

/**
 * Activates the second leftmost open tab.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusSecondTab(cx) {
  await focusTabByIndex(cx, 1)
}

/**
 * Activates the third leftmost open tab.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusThirdTab(cx) {
  await focusTabByIndex(cx, 2)
}

/**
 * Activates the fourth leftmost open tab.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusFourthTab(cx) {
  await focusTabByIndex(cx, 3)
}

/**
 * Activates the fifth leftmost open tab.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusFifthTab(cx) {
  await focusTabByIndex(cx, 4)
}

/**
 * Activates the sixth leftmost open tab.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusSixthTab(cx) {
  await focusTabByIndex(cx, 5)
}

/**
 * Activates the seventh leftmost open tab.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusSeventhTab(cx) {
  await focusTabByIndex(cx, 6)
}

/**
 * Activates the eighth leftmost open tab.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusEighthTab(cx) {
  await focusTabByIndex(cx, 7)
}

/**
 * Activates the rightmost open tab.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusLastTab(cx) {
  await focusTabByIndex(cx, -1)
}

/**
 * Activates the nth most recently used tab among your open tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
async function focusMostRecentTabByIndex(cx, index) {
  const { mostRecentlyUsedTabsManager } = cx
  const tabIds = mostRecentlyUsedTabsManager.getMostRecentTabs()
  if (tabIds.length > index) {
    const tab = await chrome.tabs.get(tabIds[index])
    await chrome.tabs.update(tab.id, { active: true })
    await chrome.windows.update(tab.windowId, { focused: true })
  }
}

/**
 * Activates the last active tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusLastActiveTab(cx) {
  await focusMostRecentTabByIndex(cx, 0)
}

/**
 * Activates the second last active tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusSecondLastActiveTab(cx) {
  await focusMostRecentTabByIndex(cx, 1)
}

/**
 * Activates the third last active tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusThirdLastActiveTab(cx) {
  await focusMostRecentTabByIndex(cx, 2)
}

/**
 * Activates the fourth last active tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusFourthLastActiveTab(cx) {
  await focusMostRecentTabByIndex(cx, 3)
}

/**
 * Activates the fifth last active tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusFifthLastActiveTab(cx) {
  await focusMostRecentTabByIndex(cx, 4)
}

/**
 * Activates the sixth last active tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusSixthLastActiveTab(cx) {
  await focusMostRecentTabByIndex(cx, 5)
}

/**
 * Activates the seventh last active tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusSeventhLastActiveTab(cx) {
  await focusMostRecentTabByIndex(cx, 6)
}

/**
 * Activates the eighth last active tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusEighthLastActiveTab(cx) {
  await focusMostRecentTabByIndex(cx, 7)
}

/**
 * Activates the ninth last active tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusNinthLastActiveTab(cx) {
  await focusMostRecentTabByIndex(cx, 8)
}

/**
 * Activates an open window relative to the current window.
 * Skips minimized windows and wraps around.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
async function focusWindowRelative(cx, delta) {
  const window = await getOpenWindowRelative(cx.tab.windowId, delta)
  await chrome.windows.update(window.id, { focused: true })
}

/**
 * Activates the next open window.
 * Skips minimized windows and wraps around.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusNextWindow(cx) {
  await focusWindowRelative(cx, 1)
}

/**
 * Activates the previous open window.
 * Skips minimized windows and wraps around.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function focusPreviousWindow(cx) {
  await focusWindowRelative(cx, -1)
}

// Move tabs -------------------------------------------------------------------

/**
 * TODO: OK
 * Grabs selected tabs.
 * Moves selected tabs to the current tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function grabTab(cx) {
  const tabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })

  const currentTabIndex = tabs.findIndex(tab => tab.id === cx.tab.id)
  const leftTabs = tabs.slice(0, currentTabIndex)
  const rightTabs = tabs.slice(currentTabIndex + 1)

  // Move selected tabs to the current tab.
  await Promise.all([
    moveTabs(leftTabs.map(getTabId), {
      index: cx.tab.index
    }),
    moveTabs(rightTabs.map(getTabId).toReversed(), {
      index: cx.tab.index + 1
    })
  ])

  // Add selected tabs—except pinned tabs—to the current tab’s group, if it has one.
  if (cx.tab.groupId !== TAB_GROUP_ID_NONE) {
    await chrome.tabs.group({
      tabIds: [].concat(
        leftTabs.flatMap(tab => tab.pinned ? [] : tab.id),
        rightTabs.map(getTabId)
      ),
      groupId: cx.tab.groupId
    })
  }
}

/**
 * TODO: OK
 * Moves selected tabs left/right.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {Context} cx
 * @param {Direction} direction
 * @returns {Promise<void>}
 */
async function moveTabDirection(cx, direction) {
  let focusIndex, anchorIndex, focusOffset, anchorOffset, reduceMethod, moveGroupToTab, ungroupTabs
  switch (direction) {
    case Direction.Backward:
      focusIndex = 0
      anchorIndex = -1
      focusOffset = -1
      anchorOffset = 1
      // Note: Chrome does not behave correctly when moving multiple tabs to the right,
      // hence moving the group at the end of the window beforehand.
      moveGroupToTab = async (groupId, tabId) => {
        await chrome.tabGroups.move(groupId, { index: -1 })
        targetTab = await chrome.tabs.get(tabId)
        return chrome.tabGroups.move(groupId, {
          index: targetTab.index + anchorOffset
        })
      }
      ungroupTabs = (tabIds) => {
        return chrome.tabs.ungroup(tabIds)
      }
      break
    case Direction.Forward:
      focusIndex = -1
      anchorIndex = 0
      focusOffset = 1
      anchorOffset = 0
      moveGroupToTab = async (groupId, tabId) => {
        targetTab = await chrome.tabs.get(tabId)
        return chrome.tabGroups.move(groupId, {
          index: targetTab.index + anchorOffset
        })
      }
      // Note: Chrome ungroups tabs sequentially,
      // hence reversing tab IDs to preserve order.
      ungroupTabs = (tabIds) => {
        return chrome.tabs.ungroup(tabIds.toReversed())
      }
      break
  }

  // Partition pinned tabs and group tabs by group.
  const tabs = await chrome.tabs.query({
    windowId: cx.tab.windowId
  })

  const tabGroups = await chrome.tabGroups.query({
    windowId: cx.tab.windowId
  })

  const tabsByGroup = Map.groupBy(tabs, byGroup)

  const groupIdToSelPartition = new Map(
    Array.from(tabsByGroup, ([groupId, tabs]) => {
      const [selectedTabs, otherTabs] = partition(tabs, isSelected)
      return [groupId, [selectedTabs, otherTabs]]
    })
  )

  // Determine whose tabs are hidden.
  // A tab in a collapsed group is considered hidden.
  const collapsedInfo = new Map(
    tabGroups.map(({ id, collapsed }) => [
      id, collapsed
    ])
  )

  const startIndex = tabs.findIndex(tab => !tab.pinned)
  const [pinnedTabs, otherTabs] = startIndex === -1
    ? [tabs, []]
    : [tabs.slice(0, startIndex), tabs.slice(startIndex)]

  const movedTabs = []
  {
    // Move chunked tabs.
    const tabPartition = chunk(pinnedTabs, isSelected)

    // Handle the left/right boundary.
    // Do nothing if the first chunk to proceed is selected.
    // This also ensures that selected tabs are always preceded/followed by another tab.
    if (tabPartition.length > 0) {
      const [isSelected] = tabPartition.at(focusIndex)
      if (isSelected) {
        tabPartition.splice(focusIndex, 1)
      }
    }

    // Move pinned tabs.
    if (tabPartition.length > 0) {
      for (let index = tabPartition[0][0] ? 0 : 1; index < tabPartition.length; index += 2) {
        const [isSelected, tabSelection] = tabPartition[index]
        const focusTab = tabSelection.at(focusIndex)
        const anchorTab = tabSelection.at(anchorIndex)
        const targetTab = tabs[focusTab.index + focusOffset]
        moveTabs.push(
          chrome.tabs.move(targetTab.id, {
            index: anchorTab.index
          })
        )
      }
    }
  }
  {
    // Move chunked tabs.
    const tabPartition = chunk(otherTabs, isSelected)

    // Handle the left/right boundary.
    // Do nothing if the first chunk to proceed is selected.
    // This also ensures that selected tabs are always preceded/followed by another tab.
    if (tabPartition.length > 0) {
      const [isSelected, tabSelection] = tabPartition.at(focusIndex)
      // Only ungroup tabs if the selection
      // spawns a single group and is not fully selected.
      if (isSelected) {
        const focusTab = tabSelection.at(focusIndex)
        const anchorTab = tabSelection.at(anchorIndex)
        if (
          anchorTab.groupId === focusTab.groupId &&
          focusTab.groupId !== TAB_GROUP_ID_NONE &&
          groupIdToSelPartition.get(focusTab.groupId)[1].length === 0
        ) {
          movedTabs.push(
            ungroupTabs(tabSelection.map(getTabId))
          )
        }
        tabPartition.splice(focusIndex, 1)
      }
    }

    // Move other tabs.
    // Only iterate selected tabs.
    if (tabPartition.length > 0) {
      for (let index = tabPartition[0][0] ? 0 : 1; index < tabPartition.length; index += 2) {
        const [isSelected, tabSelection] = tabPartition[index]
        // Get some info about the tab selection,
        // whether it spawns multiple groups, entirely selected.
        const focusTab = tabSelection.at(focusIndex)
        const anchorTab = tabSelection.at(anchorIndex)
        const targetTab = tabs[focusTab.index + focusOffset]

        // Get some info about the range of selected tabs.
        // Get some info about the target tab.
        // Determine whether the target tab is hidden.
        // A tab in a collapsed group is considered hidden.
        // Move selected tabs, tabs in group or tab group left/right.
        // Only move tab group if fully selected.
        // Skips hidden tabs—the ones whose are in collapsed tab groups.
        //
        // Tab strip—before/after:
        // Backward: [A] __[B] [B] [B]__ => __[B] [B] [B]__ [A]
        // Forward: __[A] [A] [A]__ [B] => [B] __[A] [A] [A]__
        if (
          anchorTab.groupId === TAB_GROUP_ID_NONE &&
          targetTab.groupId === TAB_GROUP_ID_NONE
        ) {
          console.log('TODO')
          movedTabs.push(
            chrome.tabs.move(targetInfo.tabId, {
              index: anchorInfo.tabIndex
            })
          )
        }
        // Backward: [A] [__[B] [B]__ [...]] => [A] __[B] [B]__ [[...]]
        // Forward: [[...] __[A] [A]__] [B] => [[...]] __[A] [A]__ [B]
        else if (
          groupIdToSelPartition.get(anchorTab.groupId)[1].length > 0 &&
          anchorTab.groupId === focusTab.groupId &&
          targetTab.groupId === TAB_GROUP_ID_NONE
        ) {
          movedTabs.push(
            ungroupTabs(anchorInfo.tabIds)
          )
        }
        // Backward: [A] __[[B] [B] [B]]__ => __[[B] [B] [B]]__ [A]
        // Forward: __[[A] [A] [A]]__ [B] => [B] __[[A] [A] [A]]__
        else if (
          groupIdToSelPartition.get(anchorTab.groupId)[1].length === 0 &&
          anchorTab.groupId === focusTab.groupId &&
          targetTab.groupId === TAB_GROUP_ID_NONE
        ) {
          movedTabs.push(
            chrome.tabs.move(targetInfo.tabId, {
              index: anchorInfo.tabIndex
            })
          )
        }
        // Backward: [A] __[[B] [B] [B]] [C] [C] [C]__ => __[[B] [B] [B]] [C] [C] [C]__ [A]
        // Forward: __[A] [A] [A] [[B] [B] [B]]__ [C] => [C] __[A] [A] [A] [[B] [B] [B]]__
        else if (
          anchorTab.groupId === TAB_GROUP_ID_NONE &&
          anchorTab.groupId !== focusTab.groupId &&
          targetTab.groupId === TAB_GROUP_ID_NONE
        ) {
          movedTabs.push(
            chrome.tabs.move(targetInfo.tabId, {
              index: anchorInfo.tabIndex
            })
          )
        }
        // Backward: [A] __[B] [B] [B] [[C] [C]__ [...]] => __[B] [B] [B] [C] [C]__ [A] [[...]]
        // Forward: [[...] __[A] [A]] [B] [B] [B]__ [C] => [[...]] [C] __[A] [A] [B] [B] [B]__
        else if (
          groupIdToSelPartition.get(anchorTab.groupId)[1].length > 0 &&
          anchorTab.groupId !== focusTab.groupId &&
          targetTab.groupId === TAB_GROUP_ID_NONE
        ) {
          movedTabs.push(
            ungroupTabs(anchorInfo.tabIds),
            chrome.tabs.move(targetInfo.tabId, {
              index: anchorInfo.tabIndex
            })
          )
        }
        // Backward: [A] __[B] [B] [B] [[C] [C] [C]]__ => __[B] [B] [B] [[C] [C] [C]]__ [A]
        // Forward: __[[A] [A] [A]] [B] [B] [B]__ [C] => [C] __[[A] [A] [A]] [B] [B] [B]__
        else if (
          groupIdToSelPartition.get(anchorTab.groupId)[1].length === 0 &&
          anchorTab.groupId !== focusTab.groupId &&
          targetTab.groupId === TAB_GROUP_ID_NONE
        ) {
          movedTabs.push(
            chrome.tabs.move(targetInfo.tabId, {
              index: anchorInfo.tabIndex
            })
          )
        }
        // Backward: [[A] __[B]] [C] [C]__ => [[A] __[B] [C] [C]__]
        // Forward: __[A] [A] [[B]__ [C]] => [__[A] [A] [B]__ [C]]
        else if (
          targetTab.groupId !== anchorTab.groupId &&
          targetTab.groupId === focusTab.groupId
        ) {
          movedTabs.push(
            chrome.tabs.group({
              tabIds: tabSelection.map(tab => tab.id),
              groupId: targetTab.groupId
            })
          )
        }
        // Backward: [[A] __[B] [B] [B]__] => [__[B] [B] [B]__ [A]]
        // Forward: [__[A] [A] [A]__ [B]] => [[B] __[A] [A] [A]__]
        else if (
          targetTab.groupId === anchorTab.groupId &&
          targetTab.groupId === focusTab.groupId
        ) {
          movedTabs.push(
            chrome.tabs.move(targetInfo.tabId, {
              index: anchorInfo.tabIndex
            })
          )
        }
        // Backward: [[A]] __[B] [B] [B]__ => [[A] __[B] [B] [B]__]
        // Forward: __[A] [A] [A]__ [[B]] => [__[A] [A] [A]__ [B]]
        else if (
          anchorTab.groupId === TAB_GROUP_ID_NONE &&
          anchorTab.groupId === focusTab.groupId &&
          collapsedInfo.get(targetTab.groupId) === false
        ) {
          movedTabs.push(
            chrome.tabs.group({
              tabIds: tabSelection.map(tab => tab.id),
              groupId: targetTab.groupId
            })
          )
        }
        // Backward: [[...]] __[B] [B] [B]__ => __[B] [B] [B]__ [[...]]
        // Forward: __[A] [A] [A]__ [[...]] => [[...]] __[A] [A] [A]__
        else if (
          anchorTab.groupId === TAB_GROUP_ID_NONE &&
          anchorTab.groupId === focusTab.groupId &&
          collapsedInfo.get(targetTab.groupId) === true
        ) {
          movedTabs.push(
            moveGroupToTab(targetInfo.groupId, anchorInfo.tabId)
          )
        }
        // Backward: [[A]] [__[B] [B]__ [...]] => [[A]] __[B] [B]__ [[...]]
        // Forward: [[...] __[A] [A]__] [[B]] => [[...]] __[A] [A]__ [[B]]
        else if (
          groupIdToSelPartition.get(anchorTab.groupId)[1].length > 0 &&
          anchorTab.groupId === focusTab.groupId &&
          targetTab.groupId !== TAB_GROUP_ID_NONE
        ) {
          movedTabs.push(
            ungroupTabs(tabSelection.map(getTabId))
          )
        }
        // Backward: [[A]] __[[B] [B] [B]]__ => __[[B] [B] [B]]__ [[A]]
        // Forward: __[[A] [A] [A]]__ [[B]] => [[B]] __[[A] [A] [A]]__
        else if (
          groupIdToSelPartition.get(anchorTab.groupId)[1].length === 0 &&
          anchorTab.groupId === focusTab.groupId &&
          targetTab.groupId !== TAB_GROUP_ID_NONE
        ) {
          movedTabs.push(
            moveGroupToTab(targetInfo.groupId, anchorInfo.tabId)
          )
        }
        // Backward: [[A]] __[[B] [B] [B]] [C] [C] [C]__ => __[[B] [B] [B]] [C] [C] [C]__ [[A]]
        // Forward: __[A] [A] [A] [[B] [B] [B]]__ [[C]] => [[C]] __[A] [A] [A] [[B] [B] [B]]__
        else if (
          anchorTab.groupId === TAB_GROUP_ID_NONE &&
          anchorTab.groupId !== focusTab.groupId &&
          targetTab.groupId !== TAB_GROUP_ID_NONE
        ) {
          movedTabs.push(
            moveGroupToTab(targetInfo.groupId, anchorInfo.tabId)
          )
        }
        // Backward: [[A]] __[B] [B] [B] [[C] [C]__ [...]] => __[B] [B] [B] [C] [C]__ [[A]] [[...]]
        // Forward: [[...] __[A] [A]] [B] [B] [B]__ [[C]] => [[...]] [[C]] __[A] [A] [B] [B] [B]__
        else if (
          groupIdToSelPartition.get(anchorTab.groupId)[1].length > 0 &&
          anchorTab.groupId !== focusTab.groupId &&
          targetTab.groupId !== TAB_GROUP_ID_NONE
        ) {
          movedTabs.push(
            ungroupTabs(anchorInfo.tabIds),
            moveGroupToTab(targetInfo.groupId, anchorInfo.tabId)
          )
        }
        // Backward: [[A]] __[B] [B] [B] [[C] [C] [C]]__ => __[B] [B] [B] [[C] [C] [C]]__ [[A]]
        // Forward: __[[A] [A] [A]] [B] [B] [B]__ [[C]] => [[C]] __[[A] [A] [A]] [B] [B] [B]__
        else if (
          anchorInfo.isInGroup &&
          groupIdToSelPartition.get(anchorTab.groupId)[1].length === 0 &&
          anchorTab.groupId !== focusTab.groupId &&
          targetTab.groupId !== TAB_GROUP_ID_NONE
        ) {
          movedTabs.push(
            moveGroupToTab(targetInfo.groupId, anchorInfo.tabId)
          )
        }
      }
    }
  }
  await Promise.all(movedTabs)
}

/**
 * Moves selected tabs left.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function moveTabLeft(cx) {
  await moveTabDirection(cx, Direction.Backward)
}

/**
 * Moves selected tabs right.
 * Skips hidden tabs—the ones whose are in collapsed tab groups.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function moveTabRight(cx) {
  await moveTabDirection(cx, Direction.Forward)
}

/**
 * TODO: OK
 * Moves selected tabs to the far left/right.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
async function moveTabEdgeDirection(cx, direction) {
  let tabIndex, toOrdered
  switch (direction) {
    case Direction.Backward:
      tabIndex = 0
      toOrdered = list => list
      break
    case Direction.Forward:
      tabIndex = -1
      toOrdered = list => list.toReversed()
      break
  }

  const tabs = await chrome.tabs.query({
    windowId: cx.tab.windowId
  })

  const tabsByGroup = Map.groupBy(tabs, byGroup)

  const startIndex = tabs.findIndex(tab => !tab.pinned)
  const [pinnedTabs, otherTabs] = startIndex === -1
    ? [tabs, []]
    : [tabs.slice(0, startIndex), tabs.slice(startIndex)]

  const tabPartition = chunk(otherTabs, byGroup).map(([groupId, tabs]) => {
    const [selectedTabs, otherTabs] = partition(tabs, isSelected)
    return [groupId, selectedTabs, otherTabs]
  })

  await Promise.all(
    [].concat(
      // Move pinned tabs.
      moveTabs(toOrdered(pinnedTabs).filter(isSelected).map(getTabId), {
        index: tabIndex
      }),

      // Move other tabs.
      toOrdered(tabPartition).map(([groupId, selectedTabs, otherTabs]) => {
        if (
          groupId !== TAB_GROUP_ID_NONE &&
          otherTabs.length === 0
        ) {
          // Move tab group to the far left/right.
          // Handle “Cannot move the group to an index that is in the middle of pinned tabs” error.
          return chrome.tabGroups.move(groupId, {
            index: tabIndex === 0
              ? pinnedTabs.length
              : tabIndex
          })
        } else if (
          groupId !== TAB_GROUP_ID_NONE &&
          otherTabs.length > 0
        ) {
          // Move tabs in group to the far left/right.
          return moveTabs(selectedTabs.map(getTabId), {
            index: tabsByGroup.get(groupId).at(tabIndex).index
          })
        } else {
          // Move tabs to the far left/right.
          return moveTabs(selectedTabs.map(getTabId), {
            index: tabIndex
          })
        }
      })
    )
  )
}

/**
 * Moves selected tabs to the far left.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function moveTabFirst(cx) {
  await moveTabEdgeDirection(cx, Direction.Backward)
}

/**
 * Moves selected tabs to the far right.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function moveTabLast(cx) {
  await moveTabEdgeDirection(cx, Direction.Forward)
}

/**
 * Moves selected tabs to the specified window.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
async function moveTabsToWindow(cx, windowId) {
  // Prevent moving tabs to the same window.
  if (cx.tab.windowId === windowId) {
    return
  }

  const tabs = await chrome.tabs.query({
    windowId: cx.tab.windowId
  })
  const startIndex = tabs.findIndex(tab => !tab.pinned)
  const [pinnedTabs, otherTabs] = startIndex === -1
    ? [tabs, []]
    : [tabs.slice(0, startIndex), tabs.slice(startIndex)]

  // Move chunked tabs.
  const isSelected = tab => tab.highlighted
  const byGroup = tab => tab.groupId
  const moveProperties = { windowId, index: -1 }
  const movedTabChunks = await Promise.all([
    // Move pinned tabs.
    moveTabs(pinnedTabs.filter(isSelected).map(tab => tab.id), moveProperties).then(tabs =>
      Promise.all(
        tabs.map((tab) => chrome.tabs.update(tab.id, { pinned: true }))
      )
    ),

    // Move other tabs.
    ...chunk(otherTabs, byGroup).map(([groupId, tabs]) => {
      const selectedTabs = tabs.filter(isSelected)
      // Only move tab group if fully selected.
      return groupId !== TAB_GROUP_ID_NONE && selectedTabs.length === tabs.length
        ? chrome.tabGroups.move(groupId, moveProperties).then((tabGroup) =>
            chrome.tabs.query({
              groupId: tabGroup.groupId
            })
          )
        : moveTabs(selectedTabs.map(tab => tab.id), moveProperties)
    })
  ])

  // Focus window and select tabs.
  const activeTab = await chrome.tabs.get(cx.tab.id)
  await chrome.windows.update(windowId, { focused: true })
  const tabsToHighlight = [activeTab].concat(...movedTabChunks).map(tab => tab.index)
  await chrome.tabs.highlight({ tabs: tabsToHighlight, windowId })
}

/**
 * Moves selected tabs to a new window.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function moveTabNewWindow(cx) {
  // Create a new window
  // and keep a reference to the created tab (the New Tab page) in order to delete it later.
  const createdWindow = await chrome.windows.create()
  const createdTab = createdWindow.tabs[0]

  // Move selected tabs to the created window.
  await moveTabsToWindow(cx, createdWindow.id)
  await chrome.tabs.remove(createdTab.id)
}

/**
 * Moves selected tabs to the previous open window, if any.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function moveTabPreviousWindow(cx) {
  const previousWindow = await getOpenWindowRelative(cx.tab.windowId, -1)
  await moveTabsToWindow(cx, previousWindow.id)
}

// Select tabs -----------------------------------------------------------------

/**
 * Deselects all other tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function selectTab(cx) {
  const { index: tabIndex, windowId } = cx.tab
  await chrome.tabs.highlight({ tabs: [tabIndex], windowId })
}

/**
 * Selects the next/previous tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
async function selectTabDirection(cx, direction) {
  const { windowId } = cx.tab
  const currentTab = cx.tab
  const allTabs = await chrome.tabs.query({ windowId: cx.tab.windowId })

  // Shrink or expand selection, depending on the direction.
  let anchorIndex, focusIndex, focusOffset
  switch (direction) {
    case Direction.Backward:
      [anchorIndex, focusIndex] = currentTab.index < allTabs.length - 1 && allTabs[currentTab.index + 1].highlighted
        ? [0, -1]
        : [-1, 0]
      focusOffset = -1
      break
    case Direction.Forward:
      [anchorIndex, focusIndex] = currentTab.index > 0 && allTabs[currentTab.index - 1].highlighted
        ? [-1, 0]
        : [0, -1]
      focusOffset = 1
      break
  }

  // Only iterate selected tabs.
  const tabsToHighlight = [currentTab.index]
  const tabPartition = chunk(allTabs, (tab) => tab.highlighted)
  for (let index = tabPartition[0][0] ? 0 : 1; index < tabPartition.length; index += 2) {
    const selectedTabs = tabPartition[index][1]
    const anchorTabIndex = selectedTabs.at(anchorIndex).index
    const focusTabIndex = clamp(selectedTabs.at(focusIndex).index + focusOffset, 0, allTabs.length - 1)

    // Make Array.slice() work regardless of the selection direction.
    // Reference: https://developer.mozilla.org/en-US/docs/Web/API/Selection
    const [startIndex, endIndex] = anchorTabIndex < focusTabIndex
      ? [anchorTabIndex, focusTabIndex]
      : [focusTabIndex, anchorTabIndex]

    // Create a new slice which represents the range of selected tabs.
    const tabs = allTabs.slice(startIndex, endIndex + 1)
    const tabIndices = tabs.map(tab => tab.index)
    tabsToHighlight.push(...tabIndices)
  }
  // Update selection ranges.
  await chrome.tabs.highlight({ tabs: tabsToHighlight, windowId })
}

/**
 * Selects the previous tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function selectPreviousTab(cx) {
  await selectTabDirection(cx, Direction.Backward)
}

/**
 * Selects the next tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function selectNextTab(cx) {
  await selectTabDirection(cx, Direction.Forward)
}

/**
 * Selects related tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function selectRelatedTabs(cx) {
  const { windowId } = cx.tab
  const isSelected = tab => tab.highlighted
  const byGroup = tab => tab.pinned || tab.groupId
  const byDomain = tab => new URL(tab.url).hostname

  // Partition tabs and select related tabs for each group.
  const allTabs = await chrome.tabs.query({
    windowId: cx.tab.windowId
  })
  const tabsToHighlight = [cx.tab.index]
  for (const [_, tabPartition] of chunk(allTabs, byGroup)) {
    for (const [_, tabs] of Map.groupBy(tabPartition, byDomain)) {
      if (tabs.some(isSelected)) {
        const tabIndices = tabs.map(tab => tab.index)
        tabsToHighlight.push(...tabIndices)
      }
    }
  }
  await chrome.tabs.highlight({ tabs: tabsToHighlight, windowId })
}

/**
 * Selects tabs in group.
 * Note: Can be used for ungrouped tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function selectTabsInGroup(cx) {
  const { windowId } = cx.tab
  const isSelected = tab => tab.highlighted
  const byGroup = tab => tab.pinned || tab.groupId

  // Partition tabs and extend each selection to the whole group.
  const allTabs = await chrome.tabs.query({
    windowId: cx.tab.windowId
  })
  const tabsToHighlight = [cx.tab.index]
  for (const [_, tabs] of chunk(allTabs, byGroup)) {
    if (tabs.some(isSelected)) {
      const tabIndices = tabs.map(tab => tab.index)
      tabsToHighlight.push(...tabIndices)
    }
  }
  await chrome.tabs.highlight({ tabs: tabsToHighlight, windowId })
}

/**
 * Selects all tabs.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function selectAllTabs(cx) {
  const { windowId } = cx.tab
  const tabs = await chrome.tabs.query({
    windowId: cx.tab.windowId
  })
  const tabsToHighlight = [cx.tab, ...tabs].map(tab => tab.index)
  await chrome.tabs.highlight({ tabs: tabsToHighlight, windowId })
}

/**
 * Selects tabs to the right.
 * Starts from the leftmost selected tab.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function selectRightTabs(cx) {
  const { windowId } = cx.tab
  const tabs = await chrome.tabs.query({
    windowId: cx.tab.windowId
  })
  const startIndex = tabs.findIndex(tab => tab.highlighted)
  const rightTabs = tabs.slice(startIndex)
  const tabsToHighlight = [cx.tab, ...rightTabs].map(tab => tab.index)
  await chrome.tabs.highlight({ tabs: tabsToHighlight, windowId })
}

/**
 * Flips tab selection.
 * Note: The current tab might be placed between the anchor and focus tabs.
 * Ensures that the selection faces forward in this case.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function flipTabSelection(cx) {
  const { windowId } = cx.tab
  const allTabs = await chrome.tabs.query({
    windowId: cx.tab.windowId
  })
  const selectedTabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })

  // Determine the direction to flip selections.
  let tabIndex = cx.tab.index
  let focusIndex = tabIndex
  // Ensure that the selection faces forward.
  while (focusIndex < allTabs.length - 1 && allTabs[focusIndex + 1].highlighted) {
    focusIndex++
  }
  // If the focus index hasn’t changed, flip backward.
  if (tabIndex === focusIndex) {
    while (focusIndex > 0 && allTabs[focusIndex - 1].highlighted) {
      focusIndex--
    }
  }
  tabIndex = focusIndex

  const tabsToHighlight = [tabIndex].concat(selectedTabs.map(tab => tab.index))
  await chrome.tabs.highlight({ tabs: tabsToHighlight, windowId })
}

// Bookmarks -------------------------------------------------------------------

/**
 * Saves selected tabs as bookmarks.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function bookmarkTab(cx) {
  const byURL = item => item.url

  const tabs = await chrome.tabs.query({
    highlighted: true,
    windowId: cx.tab.windowId
  })
  const bookmarks = await chrome.bookmarks.search({})

  const tabsByURL = Map.groupBy(tabs, byURL)
  const bookmarksByURL = Map.groupBy(bookmarks, byURL)

  // Save selected tabs as bookmarks.
  const createdBookmarks = await Promise.all(
    Array.from(tabsByURL).flatMap(([url, [{title}]]) =>
      // Don’t bookmark a page twice.
      bookmarksByURL.has(url)
        ? []
        : [chrome.bookmarks.create({ title, url })]
    )
  )

  // Let user know about created bookmarks.
  await sendNotification(`${createdBookmarks.length} bookmarks added`)
}

/**
 * Saves the current session as bookmarks.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function bookmarkSession(cx) {
  const byGroup = tab => tab.groupId

  const allTabs = await chrome.tabs.query({
    windowId: cx.tab.windowId
  })
  const allTabGroups = await chrome.tabGroups.query({
    windowId: cx.tab.windowId
  })

  const dateString = getISODateString(new Date)
  const baseFolder = await chrome.bookmarks.create({ title: `Session ${dateString}` })

  const groupIdToProperties = new Map(
    allTabGroups.map(({ id, title }) => [
      id, { parentId: baseFolder.id, title }
    ])
  )

  // Save the current session as bookmarks.
  // Note: The create calls must be processed synchronously to ensure order.
  for (const [groupId, tabs] of chunk(allTabs, byGroup)) {
    const groupProperties = groupIdToProperties.get(groupId)

    // The parent folder into which to place bookmarks.
    // Either the base folder or a subfolder of it to represent a group.
    const parentFolder = groupId === TAB_GROUP_ID_NONE
      ? baseFolder
      : await chrome.bookmarks.create(groupProperties)

    const parentId = parentFolder.id
    for (const { title, url } of tabs) {
      await chrome.bookmarks.create({ parentId, title, url })
    }
  }

  // Show result in folder.
  await openChromePage(cx, `chrome://bookmarks/?id=${baseFolder.id}`)
  await sendNotification('Session bookmarked')
}

// Folders ---------------------------------------------------------------------

/**
 * Opens the Downloads folder.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openDownloadsFolder(cx) {
  await chrome.downloads.showDefaultFolder()
}

// Chrome URLs -----------------------------------------------------------------

/**
 * Opens a Chrome page at the URL specified.
 * Note: Chrome attempts to focus an existing tab or create a new tab,
 * using an existing slot—the New Tab page—if possible.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
async function openChromePage(cx, navigateURL) {
  const baseURL = new URL('/', navigateURL)
  // Search a tab by its URL.
  const [matchingTab] = await chrome.tabs.query({
    url: baseURL + '*',
    windowId: cx.tab.windowId
  })

  if (matchingTab) {
    // Switch to the tab.
    await chrome.tabs.update(matchingTab.id, { active: true })
    await chrome.windows.update(matchingTab.windowId, { focused: true })

    // Refresh URL?
    // Only if the URL to navigate the tab to does not match.
    if (matchingTab.url !== navigateURL) {
      await chrome.tabs.update(matchingTab.id, { url: navigateURL })
    }
  } else {
    // Is the current tab a new tab?
    // Use the New Tab page as a placeholder, instead of opening a new tab.
    if (cx.tab.url === 'chrome://newtab/') {
      await chrome.tabs.update(cx.tab.id, { url: navigateURL })
    } else {
      await chrome.tabs.create({ url: navigateURL, active: true, openerTabId: cx.tab.id })
    }
  }
}

/**
 * Opens the History page.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openHistoryPage(cx) {
  await openChromePage(cx, 'chrome://history/')
}

/**
 * Opens the Downloads page.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openDownloadsPage(cx) {
  await openChromePage(cx, 'chrome://downloads/')
}

/**
 * Opens the Bookmarks page.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openBookmarksPage(cx) {
  await openChromePage(cx, 'chrome://bookmarks/')
}

/**
 * Opens the Settings page.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openSettingsPage(cx) {
  await openChromePage(cx, 'chrome://settings/')
}

/**
 * Opens the Passwords page.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openPasswordsPage(cx) {
  await openChromePage(cx, 'chrome://password-manager/passwords')
}

/**
 * Opens the Search engines page.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openSearchEnginesPage(cx) {
  await openChromePage(cx, 'chrome://settings/searchEngines')
}

/**
 * Opens the Extensions page.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openExtensionsPage(cx) {
  await openChromePage(cx, 'chrome://extensions/')
}

/**
 * Opens the Extensions > Keyboard shortcuts page.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openShortcutsPage(cx) {
  await openChromePage(cx, 'chrome://extensions/shortcuts')
}

/**
 * Opens the Experiments page.
 *
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function openExperimentsPage(cx) {
  await openChromePage(cx, 'chrome://flags/')
}

const getTabId = (tab) => tab.id
const isSelected = (tab) => tab.highlighted
const byGroup = (tab) => tab.groupId

/**
 * TODO: OK
 * Moves specified tabs.
 * Returns a `Promise` with details about the moved tabs.
 *
 * Reference: https://developer.chrome.com/docs/extensions/reference/tabs/#method-move
 *
 * @param {number[]} tabIds
 * @param {object} moveProperties
 * @returns {Promise<chrome.tabs.Tab[]>}
 */
async function moveTabs(tabIds, moveProperties) {
  return Promise.all(
    tabIds.map((tabId) =>
      chrome.tabs.move(tabId, moveProperties)
    )
  )
}
