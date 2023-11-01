/**
 * This class defines a custom `Map` object for accessing elements from a keyboard event.
 *
 * Map: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
 *
 * KeyboardEvent: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
 */
class Keymap extends Map {
  /**
   * Returns the key sequence from a keyboard event.
   * Its main use is for accessing the keymap.
   *
   * @returns {symbol}
   */
  static getKeySequence({ctrlKey = false, altKey = false, shiftKey = false, metaKey = false, code}) {
    return Symbol.for([ctrlKey, altKey, shiftKey, metaKey, code])
  }

  /**
   * @param {KeyboardEvent} keyboardEvent
   * @returns {any}
   */
  get(keyboardEvent) {
    const key = Keymap.getKeySequence(keyboardEvent)
    return super.get(key)
  }

  /**
   * @param {KeyboardEvent} keyboardEvent
   * @param {*} value
   * @returns {Keymap}
   */
  set(keyboardEvent, value) {
    const key = Keymap.getKeySequence(keyboardEvent)
    return super.set(key, value)
  }

  /**
   * @param {KeyboardEvent} keyboardEvent
   * @returns {boolean}
   */
  has(keyboardEvent) {
    const key = Keymap.getKeySequence(keyboardEvent)
    return super.has(key)
  }
}

export default Keymap
