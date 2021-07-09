// Default logging level
export const DEFAULT_LOG_LEVEL = Number(process.env.LOG_LEVEL) || 3;

// Default time for a modal to stay active
export const DEFAULT_MODAL_DURATION = 120000; // 2 minutes

// Min time delta to trigger a timer event
export const TRIGGER_RESOLUTION = 500; // 500ms