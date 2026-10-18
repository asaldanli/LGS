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
  const handlers = {};
  const el = () => ({ textContent: "", style: {}, classList: { add() {}, remove() {} }, addEventListener() {} });
  const sb = {
    window: { addEventListener(e, f) { handlers["w:" + e] = f; }, location: { search: "" } },
    document: { visibilityState: "visible", addEventListener(e, f) { handlers["d:" + e] = f; }, getElementById() { return el(); } },
    URLSearchParams, console, Chart: function () {}, Date: FakeDate, setTimeout, clearTimeout,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  };
  vm.createContext(sb);
  vm.runInContext(SRC, sb);
  sb.__handlers = handlers;
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

test("deneme: 2026 LGS net puanları ile 90 net 500 puan, sıfır net taban puan", () => {
  const full = {};
  app.LGS_DERSLER.forEach((s) => { full[s.id] = { c: s.q, w: 0 }; });
  const r = app.denemeSonuc(full);
  assert.strictEqual(r.total, 90);
  assert.strictEqual(r.puan, 500);
  assert.strictEqual(app.LGS_TABAN, 187.9);
  assert.strictEqual(app.denemeSonuc({}).puan, 188);
});

test("deneme: karışık sonuç ders neti ve yaklaşık puan (net başına ders puanlarıyla)", () => {
  const d = {
    turkce: { c: 18, w: 2 }, matematik: { c: 15, w: 3 }, fen: { c: 10, w: 6 },
    sosyal: { c: 8, w: 1 }, din: { c: 9, w: 0 }, ingilizce: { c: 7, w: 3 },
  };
  const r = app.denemeSonuc(d);
  assert.strictEqual(app.fnet(r.nets.turkce), 17.33);
  assert.strictEqual(app.fnet(r.total), 62);
  // 187,9 + 17,333x4,18 + 14x4,98 + 8x3,83 + 7,667x1,68 + 9x1,93 + 6x1,62 = 187,9 + 72,45 + 69,72 + 30,64 + 12,88 + 17,37 + 9,72
  assert.strictEqual(r.puan, 401);
  // çok düşük net taban altına inse de 100'ün altına inmez
  assert.strictEqual(app.denemeSonuc({ turkce: { c: 0, w: 20 }, matematik: { c: 0, w: 20 }, fen: { c: 0, w: 20 } }).puan >= 100, true);
});

test("hedefler: kayıtlı ay kendi hedefini, boş ay önceki aydan taşınanı kullanır", () => {
  app.goals = { "2026-09": { matematik: { targetTotal: 500 } } };
  assert.strictEqual(app.effectiveGoals("2026-09").matematik.targetTotal, 500);
  assert.strictEqual(app.effectiveGoals("2026-10").matematik.targetTotal, 500);
  assert.strictEqual(app.effectiveGoals("2026-05"), null);
  app.goals = {};
});

test("hedefler: ders bazlı doğruluk hedefi, yoksa eski genel hedefe düşer", () => {
  const g = { matematik: { targetTotal: 500, targetAccuracy: 95 }, __acc: 90 };
  assert.deepStrictEqual(JSON.parse(JSON.stringify(app.goalFor(g, "matematik"))), { t: 500, a: 95 });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(app.goalFor(g, "fen"))), { t: 0, a: 90 });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(app.goalFor(null, "fen"))), { t: 0, a: 0 });
});

test("hedefler: kaydedilmemiş ay önceki aydan devam eder, kayıtlı ay kendini kullanır", () => {
  const src = { "2026-09": { matematik: { targetTotal: 500 } }, "2026-11": { matematik: { targetTotal: 600 } } };
  assert.strictEqual(app.goalSourceMonth("2026-10", src), "2026-09");
  assert.strictEqual(app.goalSourceMonth("2026-11", src), "2026-11");
  assert.strictEqual(app.goalSourceMonth("2026-12", src), "2026-11");
  assert.strictEqual(app.goalSourceMonth("2026-05", src), null);
  assert.strictEqual(app.effectiveGoals("2026-12", src).matematik.targetTotal, 600);
});

test("yönetici hedef kaydı: değerler sınırlanır, yalnızca seçili öğrenci ve ay yoluna yazılır", () => {
  const a = load("2026-10-18T12:00:00+03:00");
  const writes = [];
  a.db = { ref(path) { return { set(v) { writes.push([path, JSON.parse(JSON.stringify(v))]); return Promise.resolve(); } }; } };
  a.goalsBy = { omer: {}, zeynep: {} };
  a.admGoalStudent = "zeynep"; a.admGoalMonth = "2026-10"; a.admGoalDraft = {};
  a.admGoalSet("matematik", "targetTotal", "600");
  a.admGoalSet("matematik", "targetAccuracy", "150");   // 100'e sınırlanır
  a.admGoalSet("fen", "targetTotal", "-5");              // 0'a sınırlanır
  a.admGoalSave();
  assert.strictEqual(writes.length, 1);
  assert.strictEqual(writes[0][0], "goals/zeynep/2026-10");
  assert.deepStrictEqual(writes[0][1].matematik, { targetTotal: 600, targetAccuracy: 100 });
  assert.deepStrictEqual(writes[0][1].fen, { targetTotal: 0, targetAccuracy: 0 });
  assert.strictEqual(Object.keys(writes[0][1]).length, 7);
});

test("kayıt: sekme kapanırken bekleyen değer hemen yazılır, çift yazım olmaz", () => {
  const a = load("2026-10-18T12:00:00+03:00");
  const writes = [];
  const mkRef = () => ({ child() { return mkRef(); }, set(d) { writes.push(JSON.stringify(d)); return Promise.resolve(); } });
  a.curStudent = "omer"; a.selDate = "2026-10-18"; a.recs = {}; a.recRef = mkRef();
  a.saveField("matematik", "total", 55);
  assert.strictEqual(writes.length, 0);
  a.__handlers["w:pagehide"]();
  assert.strictEqual(writes.length, 1);
  assert.strictEqual(writes[0], '{"total":55,"correct":0}');
  // gün değişse de aynı dersin önceki günkü bekleyen kaydı iptal olmaz
  a.saveField("matematik", "total", 10);
  a.selDate = "2026-10-19";
  a.saveField("matematik", "total", 20);
  a.__handlers["w:pagehide"]();
  assert.strictEqual(writes.length, 3);
});

console.log("\n" + passed + " test geçti");
process.exit(0);   // bekleyen zamanlayıcılar süreci açık tutmasın
