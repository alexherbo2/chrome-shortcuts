// This module contains the popup commands.
//
// Commands are sent through a channel defined in the popup service worker.
//
// The command signature must be a function of one argument, a context made of:
//
// - `tab`: the current tab,
// - `window`: a reference to the popup window,
// - `port`: the channel to communicate with the service worker.

/**
 * @typedef {object} PopupCommandContext
 * @property {chrome.tabs.Tab} tab
 * @property {Window} window
 * @property {chrome.runtime.Port} port
 */

/**
 * Creates a new function that, when called, sends a message to the service worker.
 *
 * @param {string} commandName
 * @param {boolean} passingMode
 * @param {boolean} stickyWindow
 * @returns {(context: PopupCommandContext) => void}
 */
function message(commandName, passingMode, stickyWindow) {
  return (context) => {
    const { tab, port } = context
    port.postMessage({ type: 'command', command: commandName, passingMode, stickyWindow, tab })
  }
}

// Navigation ------------------------------------------------------------------

export const goBack = message('goBack', false, true)
export const goForward = message('goForward', false, true)
export const reloadTab = message('reloadTab')
export const reloadTabWithoutCache = message('reloadTabWithoutCache')
export const goToNextPage = message('goToNextPage')
export const goToPreviousPage = message('goToPreviousPage')
export const removeURLParams = message('removeURLParams')
export const goUp = message('goUp')
export const goToRoot = message('goToRoot')

// Accessibility ---------------------------------------------------------------

export const focusInput = message('focusInput', true)
export const focusTextArea = message('focusTextArea', true)
export const focusVideo = message('focusVideo', true)
export const blurElement = message('blurElement', true)

// Clipboard -------------------------------------------------------------------

export const copyURL = message('copyURL', true)
export const copyTitle = message('copyTitle', true)
export const copyTitleAndURL = message('copyTitleAndURL', true)

// Web search ------------------------------------------------------------------

export const openWebSearchForSelectedText = message('openWebSearchForSelectedText')

// Scroll ----------------------------------------------------------------------

export const scrollDown = message('scrollDown')
export const scrollUp = message('scrollUp')
export const scrollLeft = message('scrollLeft')
export const scrollRight = message('scrollRight')
export const scrollPageDown = message('scrollPageDown')
export const scrollPageUp = message('scrollPageUp')
export const scrollHalfPageDown = message('scrollHalfPageDown')
export const scrollHalfPageUp = message('scrollHalfPageUp')
export const scrollToTop = message('scrollToTop')
export const scrollToBottom = message('scrollToBottom')

// Zoom ------------------------------------------------------------------------

export const zoomIn = message('zoomIn')
export const zoomOut = message('zoomOut')
export const zoomReset = message('zoomReset')
export const toggleFullScreen = message('toggleFullScreen', true)

// Create tabs -----------------------------------------------------------------

export const openNewTab = message('openNewTab')
export const openNewTabRight = message('openNewTabRight')
export const openNewWindow = message('openNewWindow')
export const openNewIncognitoWindow = message('openNewIncognitoWindow')

// Close tabs ------------------------------------------------------------------

export const closeTab = message('closeTab', false, true)
export const closeWindow = message('closeWindow')
export const restoreTab = message('restoreTab', false, true)

// Tab state -------------------------------------------------------------------

export const duplicateTab = message('duplicateTab', false, true)
export const togglePinTab = message('togglePinTab')
export const toggleGroupTab = message('toggleGroupTab')
export const toggleCollapseTabGroups = message('toggleCollapseTabGroups')
export const toggleMuteTab = message('toggleMuteTab')
export const discardTab = message('discardTab')

// Organize tabs ---------------------------------------------------------------

export const sortTabsByURL = message('sortTabsByURL')
export const groupTabsByDomain = message('groupTabsByDomain')

// Manage tab groups -----------------------------------------------------------

export const renameTabGroupPrompt = message('renameTabGroupPrompt')
export const cycleTabGroupColorForward = message('cycleTabGroupColorForward')
export const cycleTabGroupColorBackward = message('cycleTabGroupColorBackward')

// Switch tabs -----------------------------------------------------------------

export const focusAudibleTab = message('focusAudibleTab')
export const focusNextTab = message('focusNextTab', false, true)
export const focusPreviousTab = message('focusPreviousTab', false, true)
export const focusFirstTab = message('focusFirstTab', false, true)
export const focusSecondTab = message('focusSecondTab', false, true)
export const focusThirdTab = message('focusThirdTab', false, true)
export const focusFourthTab = message('focusFourthTab', false, true)
export const focusFifthTab = message('focusFifthTab', false, true)
export const focusSixthTab = message('focusSixthTab', false, true)
export const focusSeventhTab = message('focusSeventhTab', false, true)
export const focusEighthTab = message('focusEighthTab', false, true)
export const focusLastTab = message('focusLastTab', false, true)
export const focusLastActiveTab = message('focusLastActiveTab', true, true)
export const focusSecondLastActiveTab = message('focusSecondLastActiveTab', true, true)
export const focusThirdLastActiveTab = message('focusThirdLastActiveTab', true, true)
export const focusFourthLastActiveTab = message('focusFourthLastActiveTab', true, true)
export const focusFifthLastActiveTab = message('focusFifthLastActiveTab', true, true)
export const focusSixthLastActiveTab = message('focusSixthLastActiveTab', true, true)
export const focusSeventhLastActiveTab = message('focusSeventhLastActiveTab', true, true)
export const focusEighthLastActiveTab = message('focusEighthLastActiveTab', true, true)
export const focusNinthLastActiveTab = message('focusNinthLastActiveTab', true, true)
export const focusNextWindow = message('focusNextWindow', true, true)
export const focusPreviousWindow = message('focusPreviousWindow', true, true)

// Move tabs -------------------------------------------------------------------

export const grabTab = message('grabTab')
export const moveTabLeft = message('moveTabLeft')
export const moveTabRight = message('moveTabRight')
export const moveTabFirst = message('moveTabFirst')
export const moveTabLast = message('moveTabLast')
export const moveTabNewWindow = message('moveTabNewWindow', false, true)
export const moveTabPreviousWindow = message('moveTabPreviousWindow', false, true)
export const moveTabGroupLeft = message('moveTabGroupLeft')
export const moveTabGroupRight = message('moveTabGroupRight')
export const moveTabGroupFirst = message('moveTabGroupFirst')
export const moveTabGroupLast = message('moveTabGroupLast')
export const moveTabGroupNewWindow = message('moveTabGroupNewWindow', false, true)
export const moveTabGroupPreviousWindow = message('moveTabGroupPreviousWindow', false, true)

// Select tabs -----------------------------------------------------------------

export const selectTab = message('selectTab')
export const selectPreviousTab = message('selectPreviousTab')
export const selectNextTab = message('selectNextTab')
export const selectRelatedTabs = message('selectRelatedTabs')
export const selectTabsInGroup = message('selectTabsInGroup')
export const selectAllTabs = message('selectAllTabs')
export const selectRightTabs = message('selectRightTabs')
export const flipTabSelection = message('flipTabSelection', false, true)

// Bookmarks -------------------------------------------------------------------

export const bookmarkTab = message('bookmarkTab')
export const bookmarkSession = message('bookmarkSession', false, true)

// Folders ---------------------------------------------------------------------

export const openDownloadsFolder = message('openDownloadsFolder')

// Chrome URLs -----------------------------------------------------------------

export const openHistoryPage = message('openHistoryPage')
export const openDownloadsPage = message('openDownloadsPage')
export const openBookmarksPage = message('openBookmarksPage')
export const openSettingsPage = message('openSettingsPage')
export const openPasswordsPage = message('openPasswordsPage')
export const openSearchEnginesPage = message('openSearchEnginesPage')
export const openExtensionsPage = message('openExtensionsPage')
export const openShortcutsPage = message('openShortcutsPage')
export const openExperimentsPage = message('openExperimentsPage')

// Popup -----------------------------------------------------------------------

/**
 * Closes the popup window.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Window/close
 *
 * @param {PopupCommandContext} context
 * @returns {void}
 */
export function closePopup(context) {
  context.window.close()
}
