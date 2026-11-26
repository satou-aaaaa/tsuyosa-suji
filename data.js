// 強さの数字の問題を作る（ブラウザと node の両方で使う）。
// 中身は FIDE（国際チェス連盟）の「FIDE Rating Regulations」（2024年3月1日から。2026-11-26 に読んだ。要点は共有フォルダ games/tsuyosa-research.md）に書いてあることだけ：
// 表 8.1.2（点の差 D から見込み PD）・8.3.1（400点より大きい差は400点として数える。2650点より下の選手）・8.3.2（動く点 = K × (得点 − PD)）・
// 8.3.3（K の値）・8.3.4（端数はいちばん近い整数、0.5 は0から遠いほうへ）・7.1.4／7.2.1／8.2.3（はじめての点・1400点の下）。
// 選手・大会は架空。お金・賭けは使わない。選手はみな 2650 点より下（8.3.1 の「2650点以上」の決まりは扱わない）。
// 1問は、2人の点を見て「見込み」を選ぶか、勝ち・負け・引き分けのあとに「動く点」を選ぶ（正解したら2段目「では、相手の点は？」）か、決まりの問いに答える。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ tag なら、どの端末でも同じ問題になる。
// KINDS・言い回し・まちがいの選び肢は、足すだけでも過去の日の問題が変わる（選ぶ範囲が変わるため）。公開したあとは変えず、変えるときは qa/run.mjs の PINS を作り直して PR に理由を書く。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];

  // 出典（画面の「なぜ」に出す）
  const SRC = {
    fide: ["FIDE Rating Regulations（2024年3月1日から）", "https://handbook.fide.com/chapter/B022024"],
  };

  // FIDE 表 8.1.2：点の差 D の上の端（以下）。i 番目の行の、点の高いほうの見込み H は (50 + i)%、低いほうの L は (50 − i)%
  const DUP = [3, 10, 17, 25, 32, 39, 46, 53, 61, 68, 76, 83, 91, 98, 106, 113, 121, 129, 137, 145, 153, 162, 170, 179, 188, 197, 206, 215, 225, 235,
    245, 256, 267, 278, 290, 302, 315, 328, 344, 357, 374, 391, 411, 432, 456, 484, 517, 559, 619, 735, Infinity];
  const CAP = 400; // 8.3.1：400点より大きい差は400点として数える（2650点より下の選手）
  const rowOf = (d) => DUP.findIndex((u) => d <= u);
  // a から見た見込み（%の整数）。差は400点まで
  const pdOf = (a, b) => { const d = Math.min(Math.abs(a - b), CAP), h = 50 + rowOf(d); return a >= b ? h : 100 - h; };
  // 差に400点の上限をつけなかったとき（むずかしいのまちがいの選び肢に使う）
  const pdRaw = (a, b) => { const h = 50 + rowOf(Math.abs(a - b)); return a >= b ? h : 100 - h; };
  // 動く点 = K × (得点 − 見込み)。s は得点の100倍（勝ち100・引き分け50・負け0）、p は見込み%。端数は近い整数、0.5 は0から遠いほうへ（8.3.4）
  const rnd = (x100) => { const n = Math.floor((Math.abs(x100) + 50) / 100); return n === 0 ? 0 : x100 < 0 ? -n : n; };
  const delta = (k, s, p) => rnd(k * (s - p));
  const RES = { w: ["勝った", 100], d: ["引き分けた", 50], l: ["負けた", 0] };
  const fmtP = (n) => `${n}%`;
  const fmtD = (n) => (n > 0 ? `+${n}点` : n < 0 ? `−${-n}点` : "0点（動かない）");

  // 2段目「では、相手（B）の点は？」の5つ。B の動きは A と反対向きで、大きさは K の比で決まる（引き分けで差が小さいと、どちらも0）。
  // 名前に数（A の点）を書かない（書くと1段目の答えから2段目が分かる）
  const GROUPS = {
    onaji: { name: "Aと同じ大きさ", sub: "向きは反対" },
    bai: { name: "Aのおよそ2倍", sub: "向きは反対" },
    han: { name: "Aのおよそ半分", sub: "向きは反対" },
    yon: { name: "Aのおよそ4倍", sub: "向きは反対" },
    zero: { name: "どちらも動かない", sub: "点はそのまま" },
  };
  const GRP_WHY = {
    onaji: "2人の K が同じなら、Bの見込みは 100% からAの見込みを引いたもので、Bは Aと同じ大きさだけ反対向きに動きます。点は片方からもう片方へ移るだけです。",
    bai: "Bの K はAの2倍です。(得点 − 見込み) の大きさは2人で同じなので、Bの動きはAのおよそ2倍で、向きは反対です。",
    han: "Bの K はAの半分です。(得点 − 見込み) の大きさは2人で同じなので、Bの動きはAのおよそ半分で、向きは反対です。",
    yon: "Bの K（40）はAの K（10）の4倍です。(得点 − 見込み) の大きさは2人で同じなので、Bの動きはAのおよそ4倍で、向きは反対です。",
    zero: "2人の点の差が小さいと、見込みは 50% か 51% と 49% で、引き分け（0.5点）との差はわずかです。K をかけても 0.5 に届かず、端数を丸めるとどちらも 0点です。",
  };
  const grpOf = (ka, kb, da, db) => (da === 0 && db === 0 ? "zero" : kb === ka ? "onaji" : kb === 2 * ka ? "bai" : 2 * kb === ka ? "han" : kb === 4 * ka ? "yon" : null);

  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }
  const MEDIA = { taikyoku: "町の大会の対局", kiroku: "大会の記録", kimari: "レーティングの決まり" };

  // 選手の書き方。kd は K の示し方（数で書くか、選手のようすで書くか）
  const who = (n, r, kd) => `${n}（${r}点${kd ? `・${kd}` : ""}）`;

  // 見込みの選び肢：やさしいは3つ（答えと10%以上はなれたもの）、ふつうは4つ（3%以上）、むずかしいは4つ（まちがえやすいもの mis と、となり）
  function distractP(R, a, lv, mis) {
    const all = []; for (let i = 0; i <= 100; i++) if (i !== a) all.push(i);
    if (lv === 0) return pickN(R, all.filter((x) => Math.abs(x - a) >= 10 && x % 2 === 0), 2);
    if (lv === 1) return pickN(R, all.filter((x) => Math.abs(x - a) >= 3 && Math.abs(x - a) <= 30), 3);
    const m = mis.filter((x) => x !== a && x >= 0 && x <= 100), near = all.filter((x) => Math.abs(x - a) <= 3 && !m.includes(x));
    const one = m.length ? pickN(R, m, 1) : pickN(R, near, 1);
    return [...one, ...pickN(R, all.filter((x) => !one.includes(x) && Math.abs(x - a) <= 15), 2)];
  }
  // 動く点の選び肢：まちがえやすいもの mis（K のとりちがえ・向き・400点の上限・相手の見込み）と近い数から
  function distractD(R, a, lv, mis) {
    const m = [...new Set(mis)].filter((x) => x !== a), near = []; for (let d = -4; d <= 4; d++) if (d && !m.includes(a + d)) near.push(a + d);
    if (lv === 0) return pickN(R, m.filter((x) => Math.abs(x - a) >= 3).concat(near.filter((x) => Math.abs(x - a) >= 3)), 2);
    if (lv === 1) return pickN(R, [...new Set([...m, ...near])], 3);
    const one = pickN(R, m, 1); return [...one, ...pickN(R, [...new Set([...m, ...near])].filter((x) => !one.includes(x)), 2)];
  }

  const SIT_P = [
    (A, B) => `${A}と${B}が対局します。Aの見込みは？`,
    (A, B) => `町の大会で ${A}と${B}が当たりました。表で見ると、Aの見込みは？`,
    (A, B) => `${B}と${A}の1局。Aの見込み（1局で取れる点の見込み）は？`,
    (A, B) => `対戦表：${A} 対 ${B}。Aの見込みはいくつ？`,
  ];
  const SIT_D = [
    (A, B, r) => `${A}が${B}に${r}。Aの点はどれだけ動く？`,
    (A, B, r) => `大会の記録：${A}は${B}に${r}。Aの点の動きは？`,
    (A, B, r) => `${A}と${B}の1局。Aが${r}。Aの点は？`,
    (A, B, r) => `町の大会で、${A}が${B}に${r}。Aのレーティングはどう動く？`,
  ];

  // 見込みの問題。a・b は2人の点
  const M = (lv, a, b, look) => {
    const p = pdOf(a, b), d = Math.abs(a - b), row = rowOf(Math.min(d, CAP)), lo = row ? DUP[row - 1] + 1 : 0, hi = DUP[row];
    const mis = [100 - p, pdRaw(a, b)];
    const capped = d > CAP;
    const why = `${capped ? `差は${d}点ですが、400点より大きい差は400点として数えます。` : `点の差は${d}点です。`}FIDE の表 8.1.2 では、差が${lo}〜${hi}点のとき、点の高いほうの見込みは${50 + row}%、低いほうは${50 - row}%です。Aは${a >= b ? (a === b ? "同じ点" : "高いほう") : "低いほう"}なので ${p}% です。`;
    return {
      id: `m${a}_${b}`, lv, a: p, ans: fmtP(p), grp: null, col: "taikyoku", name: `${a}点 対 ${b}点：Aの見込み ${p}%`, look,
      key: `表 8.1.2：差${lo}〜${hi}点で、高いほう${50 + row}%・低いほう${50 - row}%。${capped ? "400点より大きい差は400点。" : ""}`, why, src: ["fide"],
      make: (R, lv2) => {
        const si = ri(R, 0, SIT_P.length - 1), ds = distractP(R, p, lv2, mis);
        return { type: "act", media: MEDIA.taikyoku, q: SIT_P[si](who("A", a), who("B", b)), opts: shuffle(R, [p, ...ds]).map(fmtP), ans: fmtP(p), rev: false, v: `${si}:${ds.join(".")}` };
      },
      kind: "m", ra: a, rb: b,
    };
  };
  // 動く点の問題。ka・kb は K、kda・kdb は K の示し方（null なら「K=20」のように数で書く）、res は w・d・l
  const D = (lv, a, ka, b, kb, res, look, kda, kdb) => {
    const p = pdOf(a, b), [rw, s] = RES[res], da = delta(ka, s, p), db = delta(kb, 100 - s, 100 - p), g = grpOf(ka, kb, da, db);
    const mis = [-da, delta(ka === 20 ? 40 : 20, s, p), delta(ka === 10 ? 20 : 10, s, p), delta(ka, s, pdRaw(a, b)), delta(ka, s, 100 - p), delta(ka, s, 50)];
    const d = Math.abs(a - b), capped = d > CAP;
    const kWhy = kda ? `Aは${kda}なので K=${ka}。` : "";
    const why = `${kWhy}${capped ? `差は${d}点ですが400点として数え、` : ""}Aの見込みは${p}%（表 8.1.2）。Aの得点は${s / 100}。動く点は K × (得点 − 見込み) = ${ka} × (${s / 100} − ${(p / 100).toFixed(2)}) = ${(ka * (s - p) / 100).toFixed(2).replace(/\.?0+$/, "").replace("-", "−")} で、いちばん近い整数にすると ${fmtD(da)} です${Math.abs(ka * (s - p)) % 100 === 50 ? "（0.5 は0から遠いほうへ）" : ""}。`;
    return {
      id: `d${a}${res}${b}`, lv, a: da, ans: fmtD(da), grp: g, col: "kiroku", name: `${a}点が${b}点に${rw}：${fmtD(da)}`, look,
      key: `動く点 = K × (得点 − 見込み)。勝ち1・引き分け0.5・負け0。${kda ? "K は選手のようすで決まります。" : ""}`, why, src: ["fide"],
      make: (R, lv2) => {
        const si = ri(R, 0, SIT_D.length - 1), ds = distractD(R, da, lv2, mis);
        const A = who("A", a, kda || `K=${ka}`), B = who("B", b, kdb || `K=${kb}`);
        return { type: "act", media: MEDIA.kiroku, q: SIT_D[si](A, B, rw), opts: shuffle(R, [da, ...ds]).map(fmtD), ans: fmtD(da), rev: false, v: `${si}:${ds.join(".")}` };
      },
      kind: "d", ra: a, rb: b, ka, kb, res, db,
    };
  };
  // 決まりの問題。ans：答え、ws：まちがいの選び肢の候補（やさしいは2つ、ほかは3つ使う）、sit：問いの言い方
  function fact(col, sit, ans, ws) {
    return (R, lv) => {
      const si = ri(R, 0, sit.length - 1), ds = pickN(R, ws, lv === 0 ? 2 : 3);
      return { type: "fact", media: MEDIA[col], q: sit[si], opts: shuffle(R, [ans, ...ds]), ans, rev: false, v: `${si}:${ds.map((x) => ws.indexOf(x)).join(".")}` };
    };
  }
  const F = (id, lv, name, look, key, why, sit, ans, ws) => ({ id, lv, a: -1, ans, grp: null, col: "kimari", name, look, key, why, src: ["fide"], make: fact("kimari", sit, ans, ws), kind: "f" });

  const SHIN = "まだ30局に届かない新人", WAKA = "16歳", NIJU = "2400点に届いたことがない大人", ICHI = "前に2400点に届いたことがある";
  const KINDS = [
    // ---- やさしい ----
    M(0, 1500, 1500, "2人は同じ点です。"),
    M(0, 1600, 1700, "Aのほうが100点低いです。"),
    M(0, 2000, 1800, "Aのほうが200点高いです。"),
    M(0, 1800, 1400, "差は400点ちょうどです。"),
    D(0, 1500, 20, 1500, 20, "w", "同じ点なら、見込みは50%です。"),
    D(0, 1800, 20, 1900, 20, "w", "低いほうが勝つと、大きく上がります。"),
    D(0, 2000, 20, 1800, 20, "w", "高いほうが勝っても、少ししか上がりません。"),
    F("tokuten", 0, "引き分けは0.5点", "勝ちは1点、負けは0点です。", "1局の得点は、勝ち1・引き分け0.5・負け0です。",
      "FIDE の規則 8.3.2 では、1局の得点は 1・0.5・0 のどれかです。引き分けは 0.5 です。",
      ["レーティングの計算で、引き分けの1局の得点は？", "勝ち1点・負け0点。では引き分けは？", "FIDE の計算で、引き分けは何点と数える？"], "0.5点", ["0点", "1点", "2点", "0.25点", "1.5点"]),
    F("kshin", 0, "はじめのうちは K=40", "早く本当の強さに近づくように、大きく動かします。", "レーティング一覧に入ったばかりで、まだ30局に届かない選手の K は40です。",
      "FIDE の規則 8.3.3 では、一覧に入ったばかりの選手は、少なくとも30局を終えるまで K=40 です。",
      ["一覧に入ったばかりで、まだ30局に届かない選手の K は？", "はじめての選手の K はいくつ？", "30局に届くまでの選手の K は？"], "40", ["10", "20", "100", "5", "400"]),
    F("goukei", 0, "2人の見込みを足すと100%", "片方が上がった分、もう片方が下がります。", "表 8.1.2 の高いほうと低いほうの見込みを足すと、いつも100%です。",
      "FIDE の表 8.1.2 では、どの行も、高いほうの見込み H と低いほうの見込み L を足すと 1（100%）です。",
      ["1局の2人の見込みを足すと？", "Aの見込みとBの見込みの合計は？", "表 8.1.2 で、高いほうと低いほうの見込みを足すといくつ？"], "100%", ["50%", "200%", "0%", "150%", "400%"]),
    // ---- ふつう ----
    M(1, 1650, 1500, "差は150点です。"),
    M(1, 1400, 1720, "Aのほうが320点低いです。"),
    M(1, 1880, 1830, "差は50点です。"),
    D(1, 1900, 20, 2000, 20, "l", "負けると、見込みの分だけ下がります。"),
    D(1, 1700, 20, 1500, 20, "d", "高いほうが引き分けると、少し下がります。"),
    D(1, 1600, 20, 1605, 20, "d", "差はわずか5点です。"),
    D(1, 1800, 20, 1800, 40, "w", "Bは K=40 です。", null, null),
    D(1, 1500, 40, 1600, 20, "w", "Aは K=40 です。"),
    F("k20", 1, "2400点に届いたことがなければ K=20", "大人で、30局をこえた選手です。", "レーティングが2400点より下のままの選手の K は20です。",
      "FIDE の規則 8.3.3 では、レーティングが2400点より下のままの選手は K=20 です（はじめのうち・18歳の年までの決まりにあたらないとき）。",
      ["30局をこえ、2400点に届いたことがない大人の選手の K は？", "2400点に一度も届いたことがない、ふつうの大人の選手の K は？", "30局をこえ、2400点に届いたことがない2000点の大人の選手の K は？"], "20", ["40", "10", "30", "50", "100"]),
    F("cap400", 1, "400点より大きい差は400点", "差が大きすぎても、数えるのは決まった所までです。", "2650点より下の選手では、400点より大きい差は400点として数えます。",
      "FIDE の規則 8.3.1（2025年10月1日から）では、2650点より下の選手は、400点より大きい点の差を400点の差として数えます。",
      ["2650点より下の選手で、500点の差はいくつとして数える？", "点の差が600点あるとき（2人とも2650点より下）、計算に使う差は？", "FIDE の規則で、400点より大きい差はどう数える？"], "400点", ["そのまま", "200点", "735点", "1000点", "0点"]),
    // ---- むずかしい ----
    M(2, 1450, 2100, "差が400点をこえています。"),
    M(2, 1500, 1504, "差は4点です。表の行の境目に気をつけて。"),
    M(2, 2210, 1918, "差は292点です。"),
    D(2, 1500, 20, 2000, 20, "w", "差は500点ですが…"),
    D(2, 2380, 10, 1980, 40, "l", "Aは前に2400点に届いています。", ICHI, WAKA),
    D(2, 2100, 40, 2200, 20, "w", "Aは16歳です。", WAKA, NIJU),
    D(2, 1500, 40, 1700, 20, "d", "Aははじめての大会です。", SHIN, NIJU),
    D(2, 2450, 10, 2050, 20, "w", "Aは前に2400点に届いています。", ICHI, NIJU),
    D(2, 2450, 10, 2560, 10, "w", "ちょうど 0.5 の端数が出ます。", ICHI, ICHI),
    F("k10", 2, "一度2400点に届くと K=10 のまま", "いまの点より、前に届いたかどうかを見ます。", "一覧の点が一度2400点に届いた選手は、そのあと2400点より下がっても K=10 です。",
      "FIDE の規則 8.3.3 では、一覧の点が2400点に届いた選手は、そのあと2400点より下がっても K=10 です。",
      ["前に2400点に届き、いまは2380点の選手の K は？", "一度2400点に届いた選手が2390点に下がった。K は？", "2400点に届いたことがある選手の K は、点が下がったら？"], "10", ["20", "40", "5", "30", "0"]),
    F("k18", 2, "18歳の年の終わりまでは K=40（2300点より下）", "若い選手は早く強くなることが多いからです。", "18歳になる年の終わりまでで、2300点より下の選手の K は40です。",
      "FIDE の規則 8.3.3 では、18歳の誕生日の年の終わりまで、レーティングが2300点より下なら K=40 です。",
      ["16歳で2100点の選手の K は？", "18歳になる年の終わりまでで、2300点より下の選手の K は？", "中学生で1800点の選手の K は（30局はこえている）？"], "40", ["20", "10", "18", "60", "100"]),
    F("hasu", 2, "端数は近い整数・0.5は0から遠いほうへ", "6.5 なら 7、−6.5 なら −7 です。", "大会（期間）の動く点は、合わせてからいちばん近い整数にします。0.5 は0から遠いほうへ。",
      "FIDE の規則 8.3.4 では、期間の動く点（各局を合わせたもの）をいちばん近い整数にし、0.5 は0から遠いほうへ丸めます。このゲームは1局だけの大会として数えます。",
      ["1局だけの大会で、計算が +6.5 点になった。動く点は？", "大会の K × (得点 − 見込み) の合計が 6.5 のとき、上がる点は？", "FIDE の決まりで、期間の動きが 6.5点なら、どう丸める？"], "+7点", ["+6点", "+6.5点", "+10点", "0点", "+5点"]),
    F("shita1400", 2, "1400点より下がると「レーティングなし」", "一覧にのる点には下の決まりがあります。", "1400点より下がった選手は、次の一覧でレーティングなしとして出ます。",
      "FIDE の規則 7.2.1 では、1400点より下がった選手は、次の一覧でレーティングなし（unrated）として出ます。",
      ["1400点より下がった選手は、次の一覧でどうなる？", "FIDE の一覧で、1390点に下がった選手は？", "レーティングが1400点を割ると？"], "レーティングなしとして出る", ["0点になる", "1400点のまま", "K が100になる", "名前が消える", "1000点になる"]),
  ];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);

  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // 1問を作る。tag は「種類|種」（例 "d1800w1900|2026-11-27:d0"）。同じ tag ならいつも同じ問題
  function make(tag) {
    const [kind] = String(tag).split("|"), k = Object.prototype.hasOwnProperty.call(BY, kind) ? BY[kind] : null;
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)), k.lv);
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, key: k.key, why: k.why, grp: k.grp, gwhy: k.grp ? GRP_WHY[k.grp] : "", src: k.src.map((s) => SRC[s]), ...p };
  }
  const keyOf = (P) => `${P.kind}:${P.q}:${P.opts.slice().sort().join("/")}`;

  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }

  const TSS = { KINDS, BY, GROUPS, GRP_WHY, LV, SRC, DUP, CAP, MEDIA, pdOf, pdRaw, delta, rnd, fmtP, fmtD, grpOf, kindsOf, seedOf, rng, make, keyOf, dailyTags, hardTags, pickN };
  if (typeof module !== "undefined" && module.exports) module.exports = TSS; else root.TSS = TSS;
})(typeof self !== "undefined" ? self : this);
