export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
/** Label for the main modifier key, as shown in tooltips. */
export const modKey = isMac ? 'Cmd' : 'Ctrl';
export const altKey = isMac ? 'Option' : 'Alt';
