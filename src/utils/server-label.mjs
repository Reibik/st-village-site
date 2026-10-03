export function cleanServerName(name) {
  return name.replace(/[🔴🟢🟡🟠🔵⚪⚫]/gu, "").replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "").replace(/\s+/g, " ").trim();
}

export function isAutomaticRoute(name) {
  return /(?:^|\s)(?:авто(?:\s|$)|автоматическ|auto(?:\s|$))/iu.test(cleanServerName(name));
}
