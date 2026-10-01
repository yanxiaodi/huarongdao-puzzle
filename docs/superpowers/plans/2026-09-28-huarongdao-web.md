# 华容道 Web 重制版实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The checklist below tracks implementation progress.

**Goal:** 将 406 关旧版华容道做成支持简体中文、繁体中文和英文的 Phaser 响应式 Web 游戏，并提供可逐步播放的本地解法。

**Architecture:** React 负责网页菜单、HUD 和弹层，并通过 i18next 管理界面语言；Phaser 绘制棋盘并处理游戏内交互。纯 TypeScript 规则和状态是单一事实来源；语言偏好与进度保存在本地，解法先由静态数据提供，访问策略独立。

**Tech Stack:** Vite、TypeScript、React、Phaser、i18next、react-i18next、LocalStorage、XML 解析依赖；实施时选用稳定版本并提交 lockfile。

**Spec:** docs/superpowers/specs/2026-09-28-huarongdao-web.md

## Global Constraints

- 棋盘 4×5；曹操到达 x=1、y=3 时获胜。
- 迁移 406 关，难度 0–6；通关当前档 ceil(60%) 后开放下一档。
- 一次成功连续拖动计一步；浮点评分阈值为 1.5 和 3。
- 首版有解法查看与播放，不实现购买、支付后端或账号。
- 支持 `zh-CN`、`zh-Hant`、`en`；语言偏好优先于浏览器语言，最终回退 `zh-CN`。
- 即时切换语言不重载页面、不重建 Phaser 实例、不丢失棋局。
- 解法播放使用独立只读状态；退出不能覆盖玩家局面或撤销历史。
- reference/HRD 只作本地参考；任何实现步骤都不得暂存或提交该目录。

## Review Focus

- 缺字段、重复 ID、越界或重叠的旧关卡必须报出关卡 ID 和原因，不能静默转换。
- applyMove 必须拒绝非有限数、非正数或非整数 distance；多格移动须按方向逐格检查所有中间位置及终点，任一格出界或碰撞都拒绝整条命令，不能越过阻挡棋子；非法命令不改变棋盘，也不增加步数。
- 缺失、损坏或版本未知的 LocalStorage 存档必须回退到可玩的新局面。
- 解法数据缺失时显示 unavailable，访问受限时显示 locked；含非法移动的播放进入 invalid 并停止，玩家局面不变。
- 开启 prefers-reduced-motion 后减少动效，棋盘操作仍可用。
- 非法或未知语言偏好安全回退；三种语言的较长文案在窄屏下仍可读。

---

### Task 1: 创建 Web 工程骨架

**Files:**
- Create: package.json
- Create: package-lock.json
- Create: index.html
- Create: vite.config.ts
- Create: tsconfig.json
- Create: .gitignore (ignore /reference/)
- Create: src/main.tsx
- Create: src/app/App.tsx
- Create: src/app/theme.css
- Create: src/game/PhaserHost.tsx
- Create: src/game/scenes/BootScene.ts
- Create: src/game/scenes/PuzzleScene.ts

**Interfaces:**
- PhaserHost 接收棋盘快照与动作回调，不拥有规则或存档。
- App 管理首页、关卡选择和游戏页的顶层页面状态。

- [x] 初始化 Vite React TypeScript 工程，安装 Phaser 与 XML 转换依赖。
- [x] 创建 React 入口、App 页面壳和全局主题 token。
- [x] PhaserHost 创建/销毁 Phaser 实例，避免热重载重复画布。
- [x] 建立 BootScene 和空 PuzzleScene，按窗口尺寸绘制比例正确的 4×5 棋盘框。
- [x] 添加忽略构建产物和依赖目录的 .gitignore；reference 不加入构建输入。
- [x] 手动打开开发页，确认页面、画布和窗口缩放正常。

**Deliverable:** 可启动的 Web 游戏空壳，不改动旧项目副本。

### Task 2: 加入多语言与语言切换

**Files:**
- Create: `src/i18n/types.ts`
- Create: `src/i18n/resources.ts`
- Create: `src/i18n/languagePreference.ts`
- Create: `src/i18n/index.ts`
- Create: `src/i18n/i18next.d.ts`
- Modify: `package.json`, `package-lock.json`
- Modify: `src/main.tsx`
- Modify: `src/app/App.tsx`, `src/app/theme.css`, `src/game/PhaserHost.tsx`

**Interfaces:**
~~~ts
type AppLocale = "zh-CN" | "zh-Hant" | "en";
function getInitialLocale(): AppLocale;
function saveLocalePreference(locale: AppLocale): void;
~~~

- [x] 安装 `i18next` 与 `react-i18next`，锁定解析后的依赖版本。
- [x] 建立三份结构一致、按页面分组的 TypeScript 翻译资源；提供类型化 `t()` key、变量插值和数量复数消息。
- [x] 初始语言按 localStorage 偏好、浏览器语言、`zh-CN` 回退顺序解析；将 `zh-TW`、`zh-HK`、`zh-MO`、`zh-Hant` 归一为 `zh-Hant`，将其他 `zh-*` 归一为 `zh-CN`。
- [x] 在 React 首次渲染前初始化 i18next；语言变化时更新 `<html lang>`、页面标题和描述元数据。
- [x] 翻译首页、选关页、棋局页、导航、画布无障碍名称和加载提示中的所有用户可读文字。
- [x] 在页头加入可访问的简中/繁中/英文切换控件，标明选中项并保存手动选择。
- [x] 语言变化仅重绘 React 文案；PhaserHost 继续持有原游戏实例，画布文字的语言事件在画布内容进入后接入。
- [x] 执行 `npm run build`，确认 TypeScript 检查和 Vite 构建通过。
- [ ] 手动浏览三页切换三种语言，刷新确认语言偏好恢复，并确认棋盘视图在切换前后保留。

**Deliverable:** 首页、选关页、棋局页和页面元数据均可在三种语言间即时切换并持久保存语言偏好。

### Task 3: 导入并校验关卡数据

**Files:**
- Create: scripts/import-levels.ts
- Create: scripts/level-titles.en.json
- Modify: package.json, package-lock.json
- Create: src/data/levelSchema.ts
- Create: public/data/levels.json
- Create: docs/legacy-level-data.md
- Create: docs/legacy-level-mapping.json (optional importer output; archival only)
- Read: reference/HRD/HRD/HRD/AllLevels.xml

**Interfaces:**
~~~ts
type Piece = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  axes: ("horizontal" | "vertical")[];
};

type Level = {
  id: number;
  targetPieceId: string;
  names: Record<"zh-CN" | "zh-Hant" | "en", string>;
  difficulty: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  minSteps: number;
  pieces: Piece[];
};
~~~

- [x] 转换脚本要求显式传入 --input 和 --output；reference XML 只用于开发者手动再生成数据。
- [x] 定义稳定棋子 ID、位置、宽高和允许移动轴的数据结构；关卡名称保存为简体、繁体和英文三种文本。
- [x] 检查关卡数量、ID 唯一性、targetPieceId 引用有效且尺寸为 2×2、minSteps 为有限正整数、棋子类型、棋盘边界、占格冲突和难度分布；错误报告关卡 ID、字段和原因。
- [x] 出错时报告关卡 ID、字段和原因；成功后生成有版本号的 JSON。
- [x] 在 docs/legacy-level-data.md 说明本地 XML 的放置/传入方式和再生成命令；构建只读取已跟踪的 public/data/levels.json。
- [x] 对照首关、末关和每档边界关卡，人工核对 ID、MinSteps、位置及难度。

**Deliverable:** 可重复生成、内容可审阅并通过结构校验的 406 关数据。

### Task 4: 实现规则、计步、评分与解锁

**Files:**
- Create: src/game/domain/types.ts
- Create: src/game/domain/rules.ts
- Create: src/game/domain/scoring.ts
- Create: src/game/domain/GameStore.ts

**Interfaces:**
~~~ts
type BoardState = {
  positions: Record<string, { x: number; y: number }>;
};
type Direction = "up" | "down" | "left" | "right";

type MoveCommand = {
  pieceId: string;
  direction: Direction;
  distance: number;
};

function applyMove(state: BoardState, level: Level, move: MoveCommand): BoardState | null;
function hasWon(state: BoardState, level: Level): boolean;
function rateMoves(steps: number, minSteps: number): 1 | 2 | 3;

type GameSnapshot = {
  levelId: number;
  board: BoardState;
  steps: number;
  undoStack: BoardState[];
  status: "playing" | "won";
};

interface GameStore {
  getSnapshot(): GameSnapshot;
  subscribe(listener: () => void): () => void;
  move(command: MoveCommand): boolean;
  undo(): void;
  restart(): void;
  startLevel(level: Level): void;
  restore(snapshot: GameSnapshot, canonicalLevel: Level): boolean;
}
~~~

- [x] 实现棋盘占格、棋子方向、目标位置边界和碰撞判定；多格移动按方向逐格检查中间位置及终点，路径任一格出界或碰撞即拒绝，不能越过阻挡棋子。
- [x] applyMove 在任何位移与占格计算前校验 distance 是有限正整数；否则返回 null，棋盘状态与步数不变。
- [x] 其他非法移动返回 null；合法移动返回新状态，不原地改写输入。
- [x] 一次成功拖动命令计一步；撤销保存命令前的状态。
- [x] 使用 level.targetPieceId 定位目标定义，校验 2×2 尺寸并实现曹操出口判定；完成浮点评分及 ceil(60%) 解锁计算。
- [x] 手工核对 1.5 倍/3 倍边界、越界/碰撞、多格移动中途遇阻和 60% 解锁临界关卡数。

**Deliverable:** 可独立使用的规则模块，移动、计步、胜利、评分与解锁行为明确。

### Task 5: 实现 Phaser 棋盘与拖动

**Files:**
- Modify: src/game/scenes/PuzzleScene.ts
- Modify: src/game/PhaserHost.tsx
- Create: src/game/render/PieceView.ts

**Interfaces:**
- PuzzleScene 读取 BoardState 并发送 MoveCommand；GameStore 返回权威的新状态。
- Phaser 只渲染快照，不重复实现碰撞或胜利规则。

- [x] 根据 Level 与 BoardState 绘制 4×5 网格和不同尺寸棋子。
- [x] 拖动开始记录棋子和指针，松手将位移换算为合法轴向整数格。
- [x] 请求 GameStore 判断移动；成功后吸附到新位置，失败后回弹。
- [x] 显示选中与合法方向提示，加入约 120–180 ms 吸附动效。
- [x] 用代表关卡手动操作横竖棋子、多格移动、障碍碰撞、越界和通关。

**Deliverable:** 一关可以完整游玩的 Phaser 棋盘。

### Task 6: 加入页面流程与本地进度

**Files:**
- Create: src/ui/HomeScreen.tsx
- Create: src/ui/LevelSelectScreen.tsx
- Create: src/ui/GameHud.tsx
- Create: src/ui/WinDialog.tsx
- Create: src/ui/CompletionHistoryDialog.tsx
- Create: src/ui/ReplayScreen.tsx
- Create: src/progression/progress.ts
- Create: src/progression/storage.ts
- Create: src/game/domain/MovePlayback.ts
- Modify: src/app/App.tsx
- Modify: src/app/theme.css
- Modify: src/game/domain/types.ts, src/game/domain/GameStore.ts
- Modify: src/game/PhaserHost.tsx, src/game/scenes/PuzzleScene.ts
- Modify: src/data/levelCatalog.ts, src/i18n/resources.ts

**Interfaces:**
- GameSnapshot 保存成功 MoveCommand 序列；moves、steps、undoStack 与 board 必须描述同一条合法路径。
- ProgressStore 按关保存未通关局面、最高星级、收藏、设置和完整通关记录。

~~~ts
type UserSettings = { soundEnabled: boolean; locale: AppLocale };

type SavedGame = { snapshot: GameSnapshot; openedAt: string };

type CompletionRecord = {
  id: string;
  levelId: number;
  steps: number;
  moves: MoveCommand[];
  stars: 1 | 2 | 3;
  completedAt: string;
};

type ProgressSnapshot = {
  schemaVersion: 1;
  gamesByLevel: Record<string, SavedGame>;
  bestStars: Record<number, 1 | 2 | 3>;
  favorites: number[];
  completionRecords: CompletionRecord[];
  settings: UserSettings;
};

interface ProgressStore {
  load(levels: ReadonlyMap<number, Level>): ProgressSnapshot;
  getSnapshot(): ProgressSnapshot;
  getMostRecentUnfinishedLevelId(): number | null;
  openLevel(level: Level): GameSnapshot;
  saveGame(snapshot: GameSnapshot): void;
  recordWin(snapshot: GameSnapshot, level: Level): CompletionRecord;
  toggleFavorite(levelId: number): void;
  deleteCompletionRecord(recordId: string): void;
  updateSettings(settings: UserSettings): void;
}
~~~
- LevelSelectScreen 通过 ProgressStore 展示锁定状态和解锁进度。

- [x] 首页主操作按进度显示“继续最近打开的未通关关卡”或“开始第 1 关”；每关单独保留未通关局面。
- [x] 展示全部 406 关和七档难度；显示锁定状态、解锁进度、收藏、最佳星级与该关历史入口。
- [x] 接入撤销、条件确认重开、通关弹层与手动进入下一关。
- [x] GameSnapshot 记录每次成功移动的 MoveCommand；撤销同步移除命令，重开清空命令序列。
- [x] 每次通关保存步数、完整成功走法、本次星级与通关时间；不设应用内历史条数上限，按步数升序、时间降序排列。
- [x] 每关历史可回放与确认删除；删除回放不降低最佳星级或解锁进度；通关弹层可直接回放刚完成的一局。
- [x] 回放独立使用 canonical 初始棋盘并在进入时暂停；支持播放/暂停、逐步前进/后退，沿用旧版 1500ms 起步、每次调整 200ms、最短 200ms 的速度。
- [x] ProgressStore.load 将 LocalStorage JSON 当作 unknown，按当前已发布关卡目录校验 schemaVersion、设置、成绩、收藏、全部未通关局面和回放记录；无效时整体回退到可玩的默认进度。
- [x] 校验棋盘、撤销历史和 MoveCommand 序列彼此连续且合法；回放必须从 canonical 初始局面合法到达胜利。
- [x] 成功移动、撤销、重开、开始关卡、通关、收藏和设置变化均写入版本化进度；LocalStorage 写入失败时显示原因。
- [x] 只用更高星级覆盖已有成绩；完成当前档 ceil(60%) 后开放下一档。
- [ ] 手动验证刷新续玩、撤销、重开、收藏、锁定状态、通关记录排序/删除和回放控制。

**Deliverable:** 从选择关卡到通关的完整本地游戏流程。

### Task 7: 加入解法数据接口与播放器

**Files:**
- Create: src/solutions/types.ts
- Create: src/solutions/SolutionRepository.ts
- Create: src/solutions/SolutionAccessProvider.ts
- Create: src/solutions/LocalSolutionRepository.ts
- Create: src/solutions/AlwaysAllowSolutionAccess.ts
- Create: src/solutions/SolutionPlayback.ts
- Create: src/ui/SolutionControls.tsx
- Create: scripts/generate-solutions.ts
- Create: public/data/solutions.json
- Modify: src/game/scenes/PuzzleScene.ts

**Interfaces:**
~~~ts
interface SolutionRepository {
  load(levelId: number): Promise<Solution | null>;
}

interface SolutionAccessProvider {
  check(levelId: number): Promise<"granted" | "locked" | "unavailable">;
}

type Solution = {
  levelId: number;
  moves: MoveCommand[];
};

type PlaybackStatus = "ready" | "playing" | "paused" | "completed" | "locked" | "unavailable" | "invalid";

type PlaybackSnapshot = {
  status: PlaybackStatus;
  positions: Record<string, { x: number; y: number }> | null;
  currentStep: number;
  totalSteps: number;
  message?: string;
};

interface SolutionPlayback {
  getSnapshot(): PlaybackSnapshot;
  subscribe(listener: () => void): () => void;
  play(): PlaybackSnapshot;
  pause(): PlaybackSnapshot;
  stepForward(): PlaybackSnapshot;
  stepBack(): PlaybackSnapshot;
  exit(): PlaybackSnapshot;
}
~~~

- [x] 编写离线解法生成器，为每关生成一条移动命令序列；复用与游戏相同的 applyMove。
- [x] 生成时逐步验证合法性和 hasWon 终局；任何关卡失败都报出 ID 并阻止输出完整数据。
- [x] 解法数据缺失时播放状态为 unavailable，访问策略返回 locked 时播放状态为 locked；回放中发现非法移动时停止并发布 invalid 状态及 message。
- [x] 实现本地 repository 和首版始终允许访问策略；界面只依赖两个接口。
- [x] 建立独立 SolutionPlayback，提供自动播放、暂停、前进一步、后退一步和退出。
- [x] 解法使用独立棋盘快照；玩家局面与撤销历史保持冻结，退出后完全恢复。
- [ ] 手动验证多个难度解法到达通关；途中退出后比较玩家局面和存档未变化。

**Deliverable:** 所有关卡有可播放的有效解法；以后可以替换访问策略接入购买授权。

### Task 8: 完成视觉、键盘与响应式润色

**Files:**
- Modify: src/app/theme.css
- Modify: src/game/render/PieceView.ts
- Modify: src/game/scenes/PuzzleScene.ts
- Modify: src/ui/GameHud.tsx
- Modify: src/ui/SolutionControls.tsx

- [ ] 完成现代简洁、少量东方质感的棋盘、棋子、星级和页面配色。
- [ ] 支持方向键操作焦点棋子，并为 DOM 控件提供键盘焦点样式。
- [ ] 根据 prefers-reduced-motion 减少位移、粒子和连续动画。
- [ ] 调整窄屏纵向布局和桌面侧栏布局，确保触控目标易点且弹层不遮挡操作。
- [ ] 手动检查手机窄屏、桌面缩放、键盘操作和减少动态效果设置。

**Deliverable:** 达到设计说明验收条件的首版视觉与操作体验。

## 验收顺序

先完成多语言任务并按任务内步骤验证三种语言、偏好持久化、页面元数据、棋盘保持和窄屏布局；再按设计说明“首版验收条件”逐项手工核对，并确认 reference/ 未暂存且未被打包进 Web 资源。
