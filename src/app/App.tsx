import { lazy, Suspense, useState } from "react";

const PhaserHost = lazy(() =>
  import("../game/PhaserHost").then(({ PhaserHost: component }) => ({
    default: component,
  })),
);

type Screen = "home" | "levels" | "game";

const screenLabels: Record<Screen, string> = {
  home: "首页",
  levels: "选关",
  game: "棋局",
};

export function App() {
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <main className="app-shell">
      <header className="masthead">
        <button
          aria-label="返回首页"
          className="brand"
          onClick={() => setScreen("home")}
          type="button"
        >
          <span aria-hidden="true" className="brand-mark">
            華
          </span>
          <span className="brand-copy">
            <strong>华容道</strong>
            <small>HUARONGDAO PUZZLE</small>
          </span>
        </button>

        <nav aria-label="主导航" className="main-nav">
          {(["home", "levels", "game"] as const).map((item) => (
            <button
              aria-current={screen === item ? "page" : undefined}
              className={screen === item ? "nav-link nav-link--active" : "nav-link"}
              key={item}
              onClick={() => setScreen(item)}
              type="button"
            >
              {screenLabels[item]}
            </button>
          ))}
        </nav>

        <span className="edition-chip">
          <span aria-hidden="true" className="edition-dot" />
          经典益智
        </span>
      </header>

      {screen === "home" && (
        <section aria-labelledby="home-title" className="home-layout">
          <div className="intro-copy">
            <p className="eyebrow">
              <span aria-hidden="true" className="eyebrow-rule" />
              4 × 5 · 经典棋局
            </p>
            <h1 id="home-title">
              一局静心，
              <br />
              <span>方寸见天地。</span>
            </h1>
            <p className="intro-description">
              移开阻挡的棋子，为曹操打开出口。
              <br />
              想好每一步，棋路便会慢慢清晰。
            </p>
            <div className="intro-actions">
              <button
                className="button button--primary"
                onClick={() => setScreen("game")}
                type="button"
              >
                查看棋盘
                <span aria-hidden="true">↗</span>
              </button>
              <button
                className="button button--quiet"
                onClick={() => setScreen("levels")}
                type="button"
              >
                浏览关卡
              </button>
            </div>
            <div className="home-facts">
              <span><strong>406</strong> 局待解</span>
              <span className="fact-divider" />
              <span><strong>7</strong> 个难度档</span>
            </div>
          </div>

          <div aria-hidden="true" className="hero-seal">
            <div className="seal-orbit seal-orbit--outer" />
            <div className="seal-orbit seal-orbit--inner" />
            <div className="seal-center">
              <span className="seal-kicker">移步换形</span>
              <strong>曹</strong>
              <span className="seal-caption">静候出口</span>
            </div>
            <span className="seal-spark seal-spark--one">✦</span>
            <span className="seal-spark seal-spark--two">✧</span>
          </div>
        </section>
      )}

      {screen === "levels" && (
        <section aria-labelledby="levels-title" className="content-page">
          <div className="page-heading">
            <p className="eyebrow">
              <span aria-hidden="true" className="eyebrow-rule" />
              关卡图鉴
            </p>
            <h1 id="levels-title">选择一局棋。</h1>
            <p className="intro-description">
              406 个棋局分为七档难度，完成当前难度后逐步解锁。
            </p>
          </div>
          <div className="level-preview">
            <span aria-hidden="true" className="level-preview-icon">棋</span>
            <div>
              <strong>关卡目录即将开放</strong>
              <p>先从棋盘布局开始，关卡数据会接入旧版的 406 局。</p>
            </div>
          </div>
        </section>
      )}

      {screen === "game" && (
        <section aria-labelledby="game-title" className="game-layout">
          <div className="game-heading">
            <div>
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-rule" />
                棋盘预览
              </p>
              <h1 id="game-title">让棋路慢慢打开。</h1>
            </div>
            <span className="board-size-chip">4 列 <i /> 5 行</span>
          </div>

          <div className="board-card">
            <div className="board-card-top">
              <span>经典布局</span>
              <span className="board-index">第 <strong>001</strong> 局</span>
            </div>
            <Suspense fallback={<div aria-live="polite" className="phaser-loading">正在载入棋盘</div>}>
            <PhaserHost />
          </Suspense>
            <div className="board-card-bottom">
              <span><i aria-hidden="true" className="exit-mark" /> 出口在底部中央</span>
              <span className="board-caption">静观局势 · 从容落子</span>
            </div>
          </div>

          <div className="play-note">
            <span aria-hidden="true" className="note-symbol">一</span>
            <p>棋盘舞台已经就位，接下来将接入关卡、移动规则与解法播放。</p>
          </div>
        </section>
      )}

      <footer className="page-footer">
        <span>移一步，见新局。</span>
        <span>HUARONGDAO · 2026</span>
      </footer>
    </main>
  );
}