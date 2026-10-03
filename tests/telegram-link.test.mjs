import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTelegramHref } from "../src/utils/telegram-link.mjs";

const link = (href) => normalizeTelegramHref(href, "https://t.me/s/exitcloud_vpn", ["cabinet.stvillage.top"]);
test("bare domains are web links, not relative Telegram paths", () => {
  assert.equal(link("cabinet.stvillage.top"), "https://cabinet.stvillage.top/");
  assert.equal(link("example.com/path?x=1"), "https://example.com/path?x=1");
});
test("repair only the confirmed legacy cabinet link, not arbitrary Telegram links", () => {
  assert.equal(link("https://t.me/s/cabinet.stvillage.top"), "https://cabinet.stvillage.top/");
  assert.equal(link("https://t.me/s/another.channel"), "https://t.me/s/another.channel");
  assert.equal(link("/exitcloud_vpn/224"), "https://t.me/exitcloud_vpn/224");
  assert.equal(link("#anchor"), "https://t.me/s/exitcloud_vpn#anchor");
});
test("unsafe and empty links remain rejected", () => {
  assert.equal(link("javascript:alert(1)"), null);
  assert.equal(link("data:text/html,unsafe"), null);
  assert.equal(link(""), null);
});
