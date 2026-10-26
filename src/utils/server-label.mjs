export function cleanServerName(name) {
  return name.replace(/[🔴🟢🟡🟠🔵⚪⚫]/gu, "").replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "").replace(/\s+/g, " ").trim();
}

export function isAutomaticRoute(name) {
  // Upstream labels can wrap route names in emoji or punctuation, not just spaces.
  return /(?:^|[^\p{L}\p{N}_])(?:авто(?:[^\p{L}\p{N}_]|$)|автоматическ|auto(?:[^\p{L}\p{N}_]|$))/iu.test(cleanServerName(name));
}
