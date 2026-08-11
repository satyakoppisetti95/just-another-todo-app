/** Cross-component signals for live sidebar / analytics updates. */

export function notifyStatsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("jata:stats-changed"));
  }
}

export function notifyNewList() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("jata:new-list"));
  }
}
