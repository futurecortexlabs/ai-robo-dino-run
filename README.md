# AI ROBO DINO RUN

ゲームはここから行けます↓
https://futurecortexlabs.github.io/ai-robo-dino-run/

🤖🦖 AIロボティラノを操作して障害物を避けながら走り続けるエンドレスランゲームです。

AI Robo Dino Run is a browser-based endless runner game where you control a robotic T-Rex and dodge obstacles to achieve the highest score.

GitHub Pagesでそのまま配布できる、PC・スマホ対応の横スクロール型ブラウザゲームです。

プレイヤーはAIロボティラノを操作し、障害物・レーザー・ボスドローンを避けながらスコアを伸ばします。
ランキング機能は入れていません。ハイスコアだけが、遊んだ端末のブラウザ内に保存されます。

## 特徴

- HTML / CSS / JavaScriptだけで動作
- GitHub Pages対応
- PC・スマホ対応
- スマホ操作UI最適化（JUMP / DASH大型化）
- touchstart対応でタップ反応を改善
- PWA対応
- ティラノサウルス風プレイヤー画像
- ジャンプ / 二段ジャンプ / ダッシュ
- コイン収集
- コンボ
- シールド
- マグネット
- ボスドローン
- レーザー攻撃
- AI風実況
- 効果音ON/OFF
- 一時停止
- 端末内ハイスコア保存

## 操作方法

### PC

- `Space` / `↑` / `W`：ジャンプ
- `Shift` / `↓` / `S`：ダッシュ
- `P`：一時停止
- `Enter`：リスタート

### スマホ

- `JUMP` ボタン：ジャンプ
- `DASH` ボタン：ダッシュ
- ゲーム画面タップ：ジャンプ

## 記録について

ハイスコアは `localStorage` を使って、遊んだ端末のブラウザ内に保存されます。

つまり、PCで出した記録はPCに、スマホで出した記録はスマホに残ります。
ブラウザのデータを削除すると、記録も消える場合があります。

## GitHub Pagesで公開する方法

1. このフォルダの中身をGitHubリポジトリにアップロードします。
2. GitHubのリポジトリ画面で `Settings` を開きます。
3. `Pages` を開きます。
4. `Build and deployment` の `Source` を `Deploy from a branch` にします。
5. `Branch` を `main`、フォルダを `/root` にします。
6. `Save` を押します。
7. 数分後に公開URLが表示されます。

## ファイル構成

```txt
ai-robo-dino-run/
├─ index.html
├─ style.css
├─ game.js
├─ manifest.json
├─ sw.js
├─ README.md
├─ LICENSE
├─ .nojekyll
└─ assets/
   └─ robo_dino.png
```

## ライセンス

MIT License
