# AGENTS.md

強さの数字：2人の架空の選手のレーティングを見て、Aの見込み（FIDE の表 8.1.2）か、勝ち・負け・引き分けのあとAの点がどれだけ動くか（K × (得点 − 見込み)）を当てる1日5問の学習ゲーム。点の動きに正解したら、相手（B）の点がどう動くか（5つ）も選ぶ。K の値・400点の決まり・丸め方の問題も出る。`index.html` と `data.js`（問題の種類）を GitHub Pages で公開する。

## 準備（最初に一度）

```bash
bash scripts/setup.sh   # Node.js（版は .nvmrc）を確かめ、検査の依存とブラウザを入れる。何度実行してもよい
```

Claude Code のクラウドセッションでは `.claude/settings.json` のフックが自動で実行する。

## push する前の確認

```bash
node qa/run.mjs   # 問題（33種類×3000問：選び肢・答えは1つ・問いの文から FIDE の表と式で答えと2段目を数え直す・出典）・今日の5問と上級（3年分）・とことん・通しで遊ぶ・続きから・2段目・復習・幅320px・PWA・引き継ぎ・見やすさ（CI の QA と同じ）
```

## このリポジトリの決まり

- 中身は FIDE「FIDE Rating Regulations」<https://handbook.fide.com/chapter/B022024>（2024年3月1日から。8.3.1 は2025年10月1日から）に書いてあることだけ（2026-11-26 に読んだ。要点は共有フォルダ games/tsuyosa-research.md）。使うのは、表 8.1.2（点の差から見込み）・8.3.1（400点より大きい差は400点。2650点より下の選手）・8.3.2（動く点 = K × (得点 − 見込み)）・8.3.3（K は40・20・10）・8.3.4（丸め）・7.2.1（1400点より下はレーティングなし）。種類を足すときもページを読み、`qa/run.mjs` の表（`ROWS`・`FACT`・`kQ`）にも足す。
- 選手はどれも2650点より下にする（2650点以上は差に上限が無い別の決まりになる。QA が見る）。K の決まりが重なる選手（18歳の年までで2400点に届いた など）は出さない。1回の大会の局数で K を小さくする決まり（K × 局数が700をこえるとき）は扱わない（1局ずつの問題のため）。
- 選手・大会は架空。名前は A・B だけ。お金・賭け・賞金・実在の選手を出さない（QA が見る）。遊び方と「このゲームについて」と README に、選手と大会は架空で本物の選手の記録ではないことを置く（QA が見る）。
- 問題は3つの形。見込みの問題（`m<A>_<B>`）は見込み%を選ぶ。点の動きの問題（`d<A><w|d|l><B>`）は Aの動く点を選び、正解したら2段目「では、Bの点はどう動く？」（Aと同じ大きさ・およそ2倍・およそ半分・およそ4倍・どちらも動かない）を選ぶ。決まりの問題は答え1つとまちがい2〜3つで、2段目は無い。やさしいは選び肢3つ、ふつう・むずかしいは4つ。むずかしいには400点の上限・表の行の境目・0.5の丸め・選手のようすから K を読む問題を入れる。2回目のヒントはまちがいを消して2つにしぼり、要点（`key`）も見せる。
- 今日の5問（やさしい2・ふつう2・むずかしい1、種類は重ねない）・上級（むずかしい3、今日のむずかしいと別）は日本時間の日付の種で決まり、だれでも同じ。`Math.random()` は練習・とことんの種だけ。乱数は `sort` の比較の中で引かない。`KINDS`・言い回し・まちがいの選び肢は、足すだけでも過去の日の問題が変わる。公開後は変えず、変えるときは QA の `PINS`（3日分の5問と上級）を作り直して理由を PR に書く。`data.js` を変える PR は自動ではマージされない（`hold_paths`）。
- ★はまちがい＋ヒントの数（0で★3・1で★2・2以上で★1）。上級はヒントなし。時間制限なし。
- 好きなだけ遊べる：チケット・ライフ・回数制限・🔒で開くモードを入れない（shared-workflows `routines/game-dev.md` F1〜F7。QA が見る）。とことん（`runs.e`）はまちがえても続き、「ここで降りる」で終わる。
- 1問を深くする：`depth.js` と `qa/depth-check.mjs` は shared-workflows `template/` の写しで、ここでは直さない。自信あり・2段目「では、Bの点はどう動く？」・復習（1→3→7日後）。記録 `tss-v1`・文字 `tss-fs`・復習 `tss-depth`。
- 共有は遊ぶ人が押したときに開くリンクだけ。シェアの文に問題・答えを出さない。感想は Issue フォーム（`.github/ISSUE_TEMPLATE/feedback.yml`）を開くだけ。応援は Ko-fi へのただのリンクだけ。
- 外へ通信しない（CSP の `connect-src 'self'` を広げない）。見やすさ（`<!-- a11y:begin -->`〜`end`・`qa/a11y.mjs`）と引き継ぎ（`transfer.js`・`qa/transfer-check.mjs`）は shared-workflows `template/` の写しで、ここでは直さない。
- 画面の土台は風力階級よみ（fuuryoku-yomi）から写した（ひな形の部品は `node scripts/new-game.mjs` で入れた）。写し元の言葉が残っていないかを QA が見る。保存の読み直しは共通部品 GameStore（`<!-- store:begin -->`〜`end`。shared-workflows `template/store/store.js` の写しで、ここでは直さない）。
- PWA：画面のファイルを足したら `sw.js` の `SHELL` にも足し、中身を大きく変えたら `CACHE` の版を上げる。アイコンは `node tools/make-icons.cjs`、`og.png` は `node tools/make-og.cjs`。
- 公開リポジトリなので、個人情報・鍵を入れない。

## 公開

- GitHub Pages は `main` のルート（`/`）を公開する。PR の QA と Secret scan が ✅ になると `automerge.yml` が自動でマージする。止めたいときは下書きにするか、ラベル「自動マージしない」を付ける。
- `sw.js`・`manifest.webmanifest`・`data.js` を変える PR は自動ではマージされない（`hold_paths`）。CodeRabbit のレビューを読み、手でマージする直前に今の head へのレビューを読み直す。CodeRabbit は PR に `@coderabbitai review` とコメントして頼む。

## 共通のきまり

- PR の作り方・マージの仕方は satou-aaaaa/shared-workflows の `routines/pr.md`、全体のきまりは `routines/common.md` に従う。
- CI の部品は shared-workflows の共通部品を呼ぶ。リポジトリ側の .github/workflows には呼び出しと設定値だけを書く。
- Claude 以外の AI・人が作業するときは、shared-workflows の `routines/tool-map.md` と `routines/without-claude.md` を読む。
