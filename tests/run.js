// Basit birim testleri: node tests/run.js
// app.js bir tarayıcı betiğidir; DOM ve Firebase taklit edilerek yalnızca saf hesap fonksiyonları sınanır.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const SRC = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

// Belirli bir "bugün" ile sandbox kurar (yıl geçişi gibi durumları sınamak için)
function load(nowIso) {
  const RD = Date;
  class FakeDate extends RD {
    constructor(...a) { if (a.length === 0) super(nowIso); else super(...a); }
    static now() { return new RD(nowIso).getTime(); }
  }
  const sb = {
    window: { addEventListener() {}, location: { search: "" } },
    document: { addEventListener() {}, getElementById() { return null; } },
    URLSearchParams, console, Chart: function () {}, Date: FakeDate,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  };
  vm.createContext(sb);
  vm.runInContext(SRC, sb);
  return sb;
}

const S = (t, c) => ({ total: t, correct: c === undefined ? t : c });
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("ok  " + name); }

const app = load("2026-10-17T12:00:00+03:00");

test("net: 3 yanlış 1 doğruyu götürür", () => {
  assert.strictEqual(app.calcNet(10, 3), 9);
  assert.strictEqual(app.calcNet(0, 6), -2);
  assert.strictEqual(app.fnet(app.calcNet(20, 4)), 18.67);
});

test("cw: yanlış sayısı toplam eksi doğru, negatif olmaz", () => {
  assert.strictEqual(app.cw(10, 7), 3);
  assert.strictEqual(app.cw(5, 9), 0);
});

test("availMonths: başlangıçtan bugüne kadar", () => {
  const ms = app.availMonths();
  assert.strictEqual(ms[0], "2026-01");
  assert.strictEqual(ms[ms.length - 1], "2026-10");
  assert.strictEqual(ms.length, 10);
});

test("availMonths: yıl sınırını aşar (Şubat 2027)", () => {
  const a = load("2027-02-10T12:00:00+03:00");
  const ms = a.availMonths();
  assert.strictEqual(ms.length, 14);
  assert.strictEqual(ms[ms.length - 1], "2027-02");
  // vm içindeki dizi farklı bir Array sınıfından gelir; karşılaştırmadan önce ana bağlama çevrilir
  assert.deepStrictEqual(Array.from(ms), Array.from(ms).sort());
});

test("rekor: ay ve yıl seviyeleri, ilk gün rekor sayılmaz", () => {
  const r = {
    "2026-09-15": { matematik: S(80) },
    "2026-10-01": { matematik: S(50) },
    "2026-10-02": { matematik: S(60) },
  };
  r["2026-10-03"] = { matematik: S(70) };
  assert.strictEqual(app.recordLevel(r, "2026-10-03", "matematik").level, "month");
  r["2026-10-03"] = { matematik: S(90) };
  assert.strictEqual(app.recordLevel(r, "2026-10-03", "matematik").level, "year");
  r["2026-10-03"] = { matematik: S(55) };
  assert.strictEqual(app.recordLevel(r, "2026-10-03", "matematik"), null);
  assert.strictEqual(app.recordLevel({ "2026-10-03": { matematik: S(70) } }, "2026-10-03", "matematik"), null);
});

test("rekor: yıllar ayrı sayılır (2026 verisi 2027 rekorunu etkilemez)", () => {
  const r = {
    "2026-12-20": { matematik: S(200) },
    "2027-01-05": { matematik: S(30) },
    "2027-01-06": { matematik: S(40) },
  };
  const rec = app.recordLevel(r, "2027-01-06", "matematik");
  assert.strictEqual(rec.prev, 30);
});

test("kutlama: aynı değer bir kez, değer değişince yeniden, rekor altında kayıt silinir", () => {
  const base = () => ({ "2026-10-01": { matematik: S(50) }, "2026-10-02": { matematik: S(60) } });
  const d = "2026-10-03", store = {};
  const step = (v) => { const r = base(); r[d] = { matematik: S(v) }; return app.achievementsFor(r, d, "matematik", store).length; };
  assert.ok(step(100) > 0);
  assert.strictEqual(step(100), 0);
  assert.ok(step(75) > 0);
  assert.strictEqual(step(40), 0);
  assert.ok(step(100) > 0);
});

console.log("\n" + passed + " test geçti");
