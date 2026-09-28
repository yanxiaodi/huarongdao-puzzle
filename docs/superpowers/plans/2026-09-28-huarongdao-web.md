# 华容道 Web 重制版实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The checklist below tracks implementation progress.

**Goal:** 将 406 关旧版华容道做成 Phaser 响应式 Web 游戏，并提供可逐步播放的本地解法。

**Architecture:** React 负责网页菜单、HUD 和弹层；Phaser 绘制棋盘并处理游戏内交互。纯 TypeScript 规则和状态是单一事实来源；进度与解法先由本地浏览器存储/静态数据提供，解法授权策略独立。

**Tech Stack:** Vite、TypeScript、React、Phaser、LocalStorage、XML 解析依赖；实施时选用稳定版本并提交 lockfile。

**Spec:** docs/superpowers/specs/2026-09-28-huarongdao-web.md

## Global Constraints

- 棋盘 4×5；曹操到达 x=1、y=3 时获胜。
- 迁移 406 关，难度 0–6；通关当前档 ceil(60%) 后开放下一档。
- 一次成功连续拖动计一步；浮点评分阈值为 1.5 和 3。
- 首版有解法查看与播放，不实现购买、支付后端或账号。
- 解法播放使用独立只读状态；退出不能覆盖玩家局面或撤销历史。
- reference/HRD 只作本地参考；任何实现步骤都不得暂存或提交该目录。

## Review Focus

- 缺字段、重复 ID、越界或重叠的旧关卡必须报出关卡 ID 和原因，不能静默转换。
- applyMove 必须拒绝非有限数、非正数或非整数 distance；多格移动须按方向逐格检查所有中间位置及终点，任一格出界或碰撞都拒绝整条命令，不能越过阻挡棋子；非法命令不改变棋盘，也不增加步数。
- 缺失、损坏或版本未知的 LocalStorage 存档必须回退到可玩的新局面。
- 解法数据缺失时显示 unavailable，访问受限时显示 locked；含非法移动的播放进入 invalid 并停止，玩家局面不变。
- 开启 prefers-reduced-motion 后减少动效，棋盘操作仍可用。

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

- [ ] 初始化 Vite React TypeScript 工程，安装 Phaser 与 XML 转换依赖。
- [ ] 创建 React 入口、App 页面壳和全局主题 token。
- [ ] PhaserHost 创建/销毁 Phaser 实例，避免热重载重复画布。
- [ ] 建立 BootScene 和空 PuzzleScene，按窗口尺寸绘制比例正确的 4×5 棋盘框。
- [ ] 添加忽略构建产物和依赖目录的 .gitignore；reference 不加入构建输入。
- [ ] 手动打开开发页，确认页面、画布和窗口缩放正常。

**Deliverable:** 可启动的 Web 游戏空壳，不改动旧项目副本。

### Task 2: 导入并校验关卡数据

**Files:**
- Create: scripts/import-levels.ts
- Create: src/data/levelSchema.ts
- Create: public/data/levels.json
- Create: docs/legacy-level-data.md
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
  name: string;
  difficulty: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  minSteps: number;
  pieces: Piece[];
};
~~~

- [ ] 转换脚本要求显式传入 --input 和 --output；reference XML 只用于开发者手动再生成数据。
- [ ] 定义稳定棋子 ID、位置、宽高和允许移动轴的数据结构。
- [ ] 检查关卡数量、ID 唯一性、targetPieceId 引用有效且尺寸为 2×2、minSteps 为有限正整数、棋子类型、棋盘边界、占格冲突和难度分布；错误报告关卡 ID、字段和原因。
- [ ] 出错时报告关卡 ID、字段和原因；成功后生成有版本号的 JSON。
- [ ] 在 docs/legacy-level-data.md 说明本地 XML 的放置/传入方式和再生成命令；构建只读取已跟踪的 public/data/levels.json。
- [ ] 对照首关、末关和每档边界关卡，人工核对 ID、MinSteps、位置及难度。

**Deliverable:** 可重复生成、内容可审阅并通过结构校验的 406 关数据。

### Task 3: 实现规则、计步、评分与解锁

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

- [ ] 实现棋盘占格、棋子方向、目标位置边界和碰撞判定；多格移动按方向逐格检查中间位置及终点，路径任一格出界或碰撞即拒绝，不能越过阻挡棋子。
- [ ] applyMove 在任何位移与占格计算前校验 distance 是有限正整数；否则返回 null，棋盘状态与步数不变。
- [ ] 其他非法移动返回 null；合法移动返回新状态，不原地改写输入。
- [ ] 一次成功拖动命令计一步；撤销保存命令前的状态。
- [ ] 使用 level.targetPieceId 定位目标定义，校验 2×2 尺寸并实现曹操出口判定；完成浮点评分及 ceil(60%) 解锁计算。
- [ ] 手工核对 1.5 倍/3 倍边界、越界/碰撞、多格移动中途遇阻和 60% 解锁临界关卡数。

**Deliverable:** 可独立使用的规则模块，移动、计步、胜利、评分与解锁行为明确。

### Task 4: 实现 Phaser 棋盘与拖动

**Files:**
- Modify: src/game/scenes/PuzzleScene.ts
- Modify: src/game/PhaserHost.tsx
- Create: src/game/render/PieceView.ts

**Interfaces:**
- PuzzleScene 读取 BoardState 并发送 MoveCommand；GameStore 返回权威的新状态。
- Phaser 只渲染快照，不重复实现碰撞或胜利规则。

- [ ] 根据 Level 与 BoardState 绘制 4×5 网格和不同尺寸棋子。
- [ ] 拖动开始记录棋子和指针，松手将位移换算为合法轴向整数格。
- [ ] 请求 GameStore 判断移动；成功后吸附到新位置，失败后回弹。
- [ ] 显示选中与合法方向提示，加入约 120–180 ms 吸附动效。
- [ ] 用代表关卡手动操作横竖棋子、多格移动、障碍碰撞、越界和通关。

**Deliverable:** 一关可以完整游玩的 Phaser 棋盘。

### Task 5: 加入页面流程与本地进度

**Files:**
- Create: src/ui/HomeScreen.tsx
- Create: src/ui/LevelSelectScreen.tsx
- Create: src/ui/GameHud.tsx
- Create: src/ui/WinDialog.tsx
- Create: src/progression/progress.ts
- Create: src/progression/storage.ts
- Modify: src/app/App.tsx
- Modify: src/app/theme.css

**Interfaces:**
- ProgressStore 读取并保存当前局面、步数、撤销历史、每关最高星级、收藏和设置。

~~~ts
type UserSettings = { soundEnabled: boolean };

type ProgressSnapshot = {
  schemaVersion: 1;
  game: GameSnapshot | null;
  bestStars: Record<number, 1 | 2 | 3>;
  favorites: number[];
  settings: UserSettings;
};

interface ProgressStore {
  load(levels: ReadonlyMap<number, Level>): ProgressSnapshot;
  save(snapshot: ProgressSnapshot): void;
  toggleFavorite(levelId: number): void;
  recordWin(levelId: number, stars: 1 | 2 | 3): void;
  updateSettings(settings: UserSettings): void;
}
~~~
- LevelSelectScreen 通过 ProgressStore 展示锁定状态和解锁进度。

- [ ] 实现继续游戏、难度/关卡选择、收藏、撤销、重开和通关弹层。
- [ ] ProgressStore.load 将 LocalStorage JSON 当作 unknown，使用当前已发布关卡目录校验 schemaVersion、设置、成绩和收藏字段；game.levelId 必须能解析到目录中的 canonical Level。
- [ ] 校验当前 board 与 undoStack 每个棋盘的棋子 ID 集合、整数坐标、棋盘边界和占格；steps 必须为非负整数，undoStack 与步数及当前棋盘组成合法连续历史。任一字段失败就丢弃整个存档，回退到可玩的默认进度，不做部分恢复。
- [ ] GameStore.restore(snapshot, canonicalLevel) 再校验关卡 ID 与棋盘状态；失败返回 false，不装入部分状态，调用方改用默认新局面。
- [ ] 开始新关、撤销和重开时更新完整 GameSnapshot。
- [ ] 订阅已提交状态变化：成功移动、撤销、重开、开始关卡和通关后保存 GameSnapshot；收藏、成绩与设置变化写回同一版本化 ProgressSnapshot。
- [ ] 存档损坏或版本未知时退回可玩的默认进度。
- [ ] 只用更高星级覆盖已有成绩；完成当前档 ceil(60%) 后开放下一档。
- [ ] 手动验证刷新续玩、撤销、重开、收藏、锁定状态和下一关流程。

**Deliverable:** 从选择关卡到通关的完整本地游戏流程。

### Task 6: 加入解法数据接口与播放器

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

- [ ] 编写离线解法生成器，为每关生成一条移动命令序列；复用与游戏相同的 applyMove。
- [ ] 生成时逐步验证合法性和 hasWon 终局；任何关卡失败都报出 ID 并阻止输出完整数据。
- [ ] 解法数据缺失时播放状态为 unavailable，访问策略返回 locked 时播放状态为 locked；回放中发现非法移动时停止并发布 invalid 状态及 message。
- [ ] 实现本地 repository 和首版始终允许访问策略；界面只依赖两个接口。
- [ ] 建立独立 SolutionPlayback，提供自动播放、暂停、前进一步、后退一步和退出。
- [ ] 解法使用独立棋盘快照；玩家局面与撤销历史保持冻结，退出后完全恢复。
- [ ] 手动验证多个难度解法到达通关；途中退出后比较玩家局面和存档未变化。

**Deliverable:** 所有关卡有可播放的有效解法；以后可以替换访问策略接入购买授权。

### Task 7: 完成视觉、键盘与响应式润色

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

按设计说明“首版验收条件”逐项手工核对，并确认 reference/ 未暂存且未被打包进 Web 资源。本计划本身不修改源码、不运行测试或构建、不创建提交。
