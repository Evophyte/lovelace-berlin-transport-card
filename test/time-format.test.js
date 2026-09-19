// Tests for formatDepartureTime(). Run with: node test/time-format.test.js

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// The card is a single browser file without exports: load it in a sandbox
// with just enough stubs to evaluate it, and pick the function from there.
const sandbox = {
  HTMLElement: class {},
  customElements: { get: () => undefined, define() {} },
  window: {},
  document: {},
  console: { info() {} },
};
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(
    path.join(__dirname, "..", "dist", "berlin-transport-card.js"),
    "utf8",
  ),
  sandbox,
);
const { formatDepartureTime } = sandbox;

const TZ = "Europe/Berlin";
const FORMAT = "In {min} Min. – {time}{delay_text}";
const at = (iso) => Date.parse(iso);
const departure = (overrides = {}) => ({
  time: "21:22",
  timestamp: "2026-07-01T21:22:00+02:00",
  delay: 0,
  ...overrides,
});

let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`ok   - ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL - ${name}\n${e.message}`);
  }
}

const NOW = at("2026-07-01T21:07:00+02:00");

test("on time", () => {
  assert.equal(
    formatDepartureTime(departure(), 0, NOW, FORMAT, { timeZone: TZ }),
    "In 15 Min. – 21:22",
  );
});

test("3 minutes delay moves time and {min}, adds delay text", () => {
  assert.equal(
    formatDepartureTime(departure({ delay: 180 }), 0, NOW, FORMAT, {
      timeZone: TZ,
    }),
    "In 18 Min. – 21:25 (+3)",
  );
});

test("delay null is treated as no delay", () => {
  const d = departure({ delay: null });
  assert.equal(
    formatDepartureTime(d, 0, NOW, FORMAT, { timeZone: TZ }),
    "In 15 Min. – 21:22",
  );
  assert.equal(formatDepartureTime(d, 0, NOW, "{delay}"), "0");
});

test("delay text only from a full minute on", () => {
  const f = (delay) =>
    formatDepartureTime(departure({ delay }), 0, NOW, "{delay}|{delay_text}");
  assert.equal(f(59), "0|");
  assert.equal(f(60), "1| (+1)");
  assert.equal(f(90), "1| (+1)");
  assert.equal(f(-120), "-2|"); // departs early
});

test("departure in 0 minutes uses time_format_now", () => {
  const options = { timeZone: TZ, formatNow: "Jetzt – {time}" };
  assert.equal(
    formatDepartureTime(
      departure(),
      0,
      at("2026-07-01T21:22:00+02:00"),
      FORMAT,
      options,
    ),
    "Jetzt – 21:22",
  );
  // 30 s before departure is still 0 minutes (rounded down)
  assert.equal(
    formatDepartureTime(
      departure(),
      0,
      at("2026-07-01T21:21:30+02:00"),
      FORMAT,
      options,
    ),
    "Jetzt – 21:22",
  );
});

test("without time_format_now the normal format is used for 0 minutes", () => {
  assert.equal(
    formatDepartureTime(
      departure(),
      0,
      at("2026-07-01T21:22:00+02:00"),
      FORMAT,
      { timeZone: TZ },
    ),
    "In 0 Min. – 21:22",
  );
});

test("{min} includes the delay when deciding about 'now'", () => {
  const options = { timeZone: TZ, formatNow: "Jetzt" };
  assert.equal(
    formatDepartureTime(
      departure({ delay: 180 }),
      0,
      at("2026-07-01T21:22:00+02:00"),
      "{min}",
      options,
    ),
    "3",
  );
});

test("{min} and {leave} are never negative", () => {
  const late = at("2026-07-01T21:30:00+02:00");
  assert.equal(formatDepartureTime(departure(), 5, late, "{min}/{leave}"), "0/0");
});

test("{leave} subtracts walking time", () => {
  const f = (walking) =>
    formatDepartureTime(departure(), walking, NOW, "{min}/{leave}");
  assert.equal(f(5), "15/10");
  assert.equal(f(20), "15/0");
  assert.equal(f(undefined), "15/15");
});

test("{planned} is the planned time, {time} the actual one", () => {
  assert.equal(
    formatDepartureTime(departure({ delay: 300 }), 0, NOW, "{planned} bis {time}", {
      timeZone: TZ,
    }),
    "21:22 bis 21:27",
  );
});

test("time zone: same instant is shown in the configured zone", () => {
  const d = departure({ timestamp: "2026-07-01T19:22:00+00:00" });
  const f = (timeZone) => formatDepartureTime(d, 0, NOW, "{time}", { timeZone });
  assert.equal(f("Europe/Berlin"), "21:22");
  assert.equal(f("UTC"), "19:22");
  assert.equal(f("America/New_York"), "15:22");
  // unset or unknown zone falls back to local time instead of throwing
  assert.match(f(undefined), /^\d\d:\d\d$/);
  assert.match(f("Nowhere/Land"), /^\d\d:\d\d$/);
});

test("time zone: winter time (CET)", () => {
  const d = departure({ timestamp: "2026-01-15T20:22:00+00:00" });
  assert.equal(
    formatDepartureTime(d, 0, at("2026-01-15T20:00:00Z"), "{time}", {
      timeZone: TZ,
    }),
    "21:22",
  );
});

test("DST start: delay carries over the skipped hour (01:55 + 10 min)", () => {
  const d = departure({
    time: "01:55",
    timestamp: "2026-03-29T01:55:00+01:00",
    delay: 600,
  });
  const now = at("2026-03-29T01:40:00+01:00");
  assert.equal(
    formatDepartureTime(d, 0, now, "{planned} {time} {min}{delay_text}", {
      timeZone: TZ,
    }),
    "01:55 03:05 25 (+10)",
  );
});

test("DST start: {min} counts real minutes, not wall clock", () => {
  const d = departure({
    time: "03:10",
    timestamp: "2026-03-29T03:10:00+02:00",
  });
  // wall clock 01:50 -> 03:10 looks like 80 min, in reality it is 20
  assert.equal(
    formatDepartureTime(d, 0, at("2026-03-29T01:50:00+01:00"), "{time} {min}", {
      timeZone: TZ,
    }),
    "03:10 20",
  );
});

test("DST end: delay lands after the repeated hour (02:50 CEST + 15 min)", () => {
  const d = departure({
    time: "02:50",
    timestamp: "2026-10-25T02:50:00+02:00",
    delay: 900,
  });
  const now = at("2026-10-25T02:30:00+02:00");
  assert.equal(
    formatDepartureTime(d, 0, now, "{time} {min}", { timeZone: TZ }),
    "02:05 35",
  );
});

test("DST end: second 02:30 (CET) and delay into 03:00", () => {
  const d = departure({
    time: "02:30",
    timestamp: "2026-10-25T02:30:00+01:00",
  });
  const now = at("2026-10-25T02:00:00+01:00");
  assert.equal(
    formatDepartureTime(d, 0, now, "{time}", { timeZone: TZ }),
    "02:30",
  );
  assert.equal(
    formatDepartureTime({ ...d, delay: 1800 }, 0, now, "{time}", {
      timeZone: TZ,
    }),
    "03:00",
  );
});

test("midnight is 00:xx, not 24:xx", () => {
  const d = departure({ timestamp: "2026-07-01T00:05:00+02:00" });
  assert.equal(
    formatDepartureTime(d, 0, NOW, "{time}", { timeZone: TZ }),
    "00:05",
  );
});

test("unknown placeholders are left untouched", () => {
  assert.equal(
    formatDepartureTime(departure(), 0, NOW, "{foo} {min} {constructor}"),
    "{foo} 15 {constructor}",
  );
});

test("HTML in the format string is escaped", () => {
  assert.equal(
    formatDepartureTime(
      departure(),
      0,
      NOW,
      `<img src=x onerror="alert(1)"> {min} & 'x'`,
    ),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; 15 &amp; &#39;x&#39;",
  );
});

test("HTML in sensor data is escaped as well", () => {
  assert.equal(
    formatDepartureTime(departure({ time: "<b>" }), 0, NOW, "{planned}"),
    "&lt;b&gt;",
  );
});

test("invalid timestamp does not throw", () => {
  assert.equal(
    formatDepartureTime(
      departure({ timestamp: "garbage" }),
      0,
      NOW,
      "{min}/{leave}/{time}",
    ),
    "?/?/?",
  );
});

const BADGE = "{delay_badge}";
const POS = (n) => `<span class="delay delay-pos">+${n}</span>`;
const NEG = (n) => `<span class="delay delay-neg">${n}</span>`;

test("{delay_badge}: on time is +0 in green (delay-neg)", () => {
  assert.equal(formatDepartureTime(departure(), 0, NOW, BADGE), NEG("+0"));
});

test("{delay_badge}: 3 minutes late is +3 in red (delay-pos)", () => {
  assert.equal(
    formatDepartureTime(departure({ delay: 180 }), 0, NOW, BADGE),
    POS(3),
  );
});

test("{delay_badge}: too early shows the negative number in green", () => {
  assert.equal(
    formatDepartureTime(departure({ delay: -120 }), 0, NOW, BADGE),
    NEG(-2),
  );
});

test("{delay_badge}: same number as delayDiv (delay / 60, not truncated)", () => {
  assert.equal(
    formatDepartureTime(departure({ delay: 90 }), 0, NOW, BADGE),
    POS(1.5),
  );
});

test("{delay_badge}: empty for delay null or invalid", () => {
  for (const delay of [null, undefined, NaN, "180", "<img onerror=x>"]) {
    assert.equal(
      formatDepartureTime(departure({ delay }), 0, NOW, `[${BADGE}]`),
      "[]",
      `delay ${String(delay)}`,
    );
  }
});

test("{delay_badge}: empty with showDelay false, shown otherwise", () => {
  const d = departure({ delay: 180 });
  assert.equal(
    formatDepartureTime(d, 0, NOW, BADGE, { showDelay: false }),
    "",
  );
  assert.equal(formatDepartureTime(d, 0, NOW, BADGE, { showDelay: true }), POS(3));
  assert.equal(formatDepartureTime(d, 0, NOW, BADGE, {}), POS(3));
});

test("{delay_badge}: showDelay false does not affect the other placeholders", () => {
  assert.equal(
    formatDepartureTime(departure({ delay: 180 }), 0, NOW, FORMAT, {
      timeZone: TZ,
      showDelay: false,
    }),
    "In 18 Min. – 21:25 (+3)",
  );
});

test("{delay_badge}: sits inline in the format, text around it is escaped", () => {
  assert.equal(
    formatDepartureTime(
      departure({ delay: 180 }),
      0,
      NOW,
      "In {min} Min. – {time}{delay_badge} <b>",
      { timeZone: TZ },
    ),
    `In 18 Min. – 21:25${POS(3)} &lt;b&gt;`,
  );
});

test("example card 2:{time}{delay_text} · Losgehen in {leave} Min.", () => {
  assert.equal(
    formatDepartureTime(
      departure({ delay: 180 }),
      5,
      NOW,
      "{time}{delay_text} · Losgehen in {leave} Min.",
      { timeZone: TZ },
    ),
    "21:25 (+3) · Losgehen in 13 Min.",
  );
});

if (failed) {
  console.log(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nall tests passed");
