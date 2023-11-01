// This module contains the popup service worker to run commands via messages.
//
// Uses a long-lived connection for the popup lifetime.
// This allows to determine when the popup shows up or goes away.
//
// Action: https://developer.chrome.com/docs/extensions/reference/action/
// Service workers: https://developer.chrome.com/docs/extensions/mv3/service_workers/
// Long-lived connections: https://developer.chrome.com/docs/extensions/mv3/messaging/#connect

/**
 * @typedef {object} BackgroundContext
 * @property {MostRecentlyUsedTabsManager} mostRecentlyUsedTabsManager
 */

/**
 * @typedef {PopupCommandMessage} PopupMessage
 */

/**
 * @typedef {object} PopupCommandMessage
 * @property {"command"} type
 * @property {string} commandName
 * @property {boolean} passingMode
 * @property {boolean} stickyWindow
 * @property {chrome.tabs.Tab} tab
 */

import * as commands from '../commands.js'

// Retrieve the popup config.
const popupConfigPromise = fetch('popup/config.json').then(response => response.json())

let popupIsOpen = false

/**
 * Handles the initial setup when the extension is first installed or updated to a new version.
 *
 * @param {object} details
 * @returns {void}
 */
function onInstalled(details) {
  switch (details.reason) {
    case 'install':
      onInstall()
      break
    case 'update':
      onUpdate(details.previousVersion)
      break
  }
}

/**
 * Handles the initial setup when the extension is first installed.
 *
 * @returns {Promise<void>}
 */
async function onInstall() {
  const popupConfig = await popupConfigPromise
  await chrome.storage.sync.set({ popupConfig })
}

/**
 * Handles the setup when the extension is updated to a new version.
 *
 * @param {string} previousVersion
 * @returns {Promise<void>}
 */
async function onUpdate(previousVersion) {
  const popupConfig = await popupConfigPromise
  // Merge config to handle added commands.
  const { popupConfig: { commandBindings } } = await chrome.storage.sync.get('popupConfig')
  Object.assign(popupConfig.commandBindings, commandBindings)
  await chrome.storage.sync.set({ popupConfig })
}

/**
 * Handles a new connection when the popup shows up.
 *
 * @param {chrome.runtime.Port} port
 * @param {BackgroundContext} backgroundContext
 * @returns {void}
 */
function onConnect(port, backgroundContext) {
  popupIsOpen = true
  port.onDisconnect.addListener(onDisconnect)
  port.onMessage.addListener((message, port) => {
    onMessage(message, port, backgroundContext)
  })
}

/**
 * Handles disconnection when the popup goes away.
 *
 * @param {chrome.runtime.Port} port
 * @returns {void}
 */
function onDisconnect(port) {
  popupIsOpen = false
}

/**
 * Handles message by using a discriminator field.
 * Each message has a `type` field, and the rest of the fields, and their meaning, depend on its value.
 *
 * Reference: https://crystal-lang.org/api/master/JSON/Serializable.html#discriminator-field
 *
 * @param {PopupMessage} message
 * @param {chrome.runtime.Port} port
 * @param {BackgroundContext} backgroundContext
 * @returns {void}
 */
function onMessage(message, port, backgroundContext) {
  switch (message.type) {
    case 'command':
      onCommandMessage(message, port, backgroundContext)
      break
    default:
      port.postMessage({ type: 'error', message: 'Unknown request' })
  }
}

/**
 * Handles a single command.
 *
 * @param {PopupCommandMessage} message
 * @param {chrome.runtime.Port} port
 * @param {BackgroundContext} backgroundContext
 * @returns {Promise<void>}
 */
async function onCommandMessage(message, port, backgroundContext) {
  const { command: commandName, passingMode, stickyWindow, tab } = message
  const { mostRecentlyUsedTabsManager } = backgroundContext

  // If passing mode is specified, close the popup window.
  if (passingMode) {
    port.postMessage({ type: 'command', command: 'closePopup' })
  }

  // Execute the command and wait for it to complete.
  const commandContext = {
    tab,
    mostRecentlyUsedTabsManager
  }
  await commands[commandName](commandContext)

  // If the sticky flag has been specified, then “stick” the extension’s popup.
  if (stickyWindow) {
    await chrome.action.openPopup()
  }

  // Save command to session.
  await chrome.storage.session.set({ lastCommand: commandName })
}

export default { onInstalled, onConnect }
