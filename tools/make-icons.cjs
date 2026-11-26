// アプリのアイコン（icon-192.png・icon-512.png）を作る。紺の地に、高さのちがう3本の棒と上向きの矢（強さの数字が動く）。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#123554"/>
      <rect x="16" y="60" width="16" height="24" rx="2" fill="#7fc4ef"/><rect x="42" y="44" width="16" height="40" rx="2" fill="#fffdf7"/><rect x="68" y="28" width="16" height="56" rx="2" fill="#f6d77a"/><g fill="none" stroke="#f6d77a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 40 L44 22"/><path d="M33 20 H45 V32"/></g></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
