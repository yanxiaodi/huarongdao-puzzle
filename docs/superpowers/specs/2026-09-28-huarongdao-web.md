# 华容道 Web 重制版设计说明

状态：已确认；多语言范围于 2026-09-29 补充
日期：2026-09-28（多语言范围增补：2026-09-29）

## 项目目标

将旧 Windows Phone / Silverlight 华容道重做为响应式 Web 游戏。保留经典 4×5 棋盘与 406 关内容，采用现代简洁视觉，支持桌面指针、触屏和基本键盘操作。

## 已确认决定

- 游戏引擎使用 Phaser。
- 采用现代化视觉，保留少量东方质感。
- 保留 7 个难度档和分档解锁。
- 首版包含解法查看与播放；不做购买流程，解法访问策略预留可替换接口。
- 首版支持简体中文（zh-CN）、繁体中文（zh-Hant）和英文（en）。
- 初次访问优先采用保存的语言偏好，其次采用受支持的浏览器语言，最后回退简体中文；切换语言不重载页面、不重置当前棋局。
- 语言偏好属于 UserSettings；关卡 ID、棋盘状态、步数和解法数据保持语言无关。
- reference/HRD 旧项目副本仅作本地参考，继续未跟踪，不纳入提交。

## 旧版规则与数据依据

参考副本位于 reference/HRD。AllLevels.xml 包含关卡、难度和 MinSteps 等数据；旧项目保存局面、步数、成绩和收藏。

- 棋盘 4 列 × 5 行；曹操到达 x=1、y=3 时通关。
- 每个 Level 声明 targetPieceId；胜利判定接收 Level 上下文，按目标棋子的 ID 和 2×2 尺寸检查出口，不依赖隐含硬编码 ID。
- 棋子沿允许的轴向移动，不得越界或重叠。核心 applyMove 必须拒绝非有限数、非正数或非整数 distance；多格移动按方向逐格检查所有中间位置和终点，任一格出界或碰撞即拒绝，不能越过阻挡棋子；非法命令不改变局面，也不计步。Web 版一次成功的连续拖动计一步。
- 难度编号 0–6。旧版当前难度通关数达到 ceil(该档关卡总数 × 60%) 后开放下一档。
- 评分意图：steps / MinSteps ≤ 1.5 得 3 星，≤ 3 得 2 星，否则 1 星。旧代码两个整数相除后再赋给 double，会截断比例；Web 版采用浮点计算并保留阈值。
- 旧关卡数据中没有解法，需要单独生成和校验。
- 实施时再次核对旧版计步边界；本方案明确规定一次成功拖动计一步。

## 首版范围

### 主流程

继续游戏 → 选择难度与关卡 → 拖动解谜 → 撤销/重开/查看解法 → 通关评分 → 下一关。

### 功能清单

- 首页、继续游戏、难度与关卡列表。
- 406 关、锁定状态、解锁进度、最高星级、收藏。
- 拖动棋子、合法移动提示、步数、撤销和重开。
- 通关弹层、星级反馈、进入下一关。
- 解法自动播放、暂停、上一步、下一步和退出。
- 版本化本地存档：当前游戏快照（含步数与撤销历史）、关卡成绩、收藏与设置；每次已提交的玩家状态变更均持久化。
- 桌面指针、触屏拖动、基本键盘操作。
- 全部网页文案支持简体中文、繁体中文和英文，并可在游戏过程中切换语言。
- 响应 prefers-reduced-motion。
- 首版不包含账号、云同步、排行榜、购买流程或支付后端。音乐和 PWA 后续评估。

## 解法访问接口

分开“解法数据读取”和“是否有权查看”。首版读取随站点发布的本地解法数据，采用始终允许访问的本地策略。解法数据缺失时播放状态为 unavailable，访问受限时为 locked，非法移动时为 invalid 并停止。播放器只读地重放独立棋盘状态，不改变玩家局面、撤销历史或存档。后续购买功能替换访问策略并接入服务端授权；支付与购买界面不属于首版。

~~~ts
type SolutionMove = {
  pieceId: string;
  direction: "up" | "down" | "left" | "right";
  distance: number;
};

type Solution = {
  levelId: number;
  moves: SolutionMove[];
};

interface SolutionRepository {
  load(levelId: number): Promise<Solution | null>;
}

type SolutionAccess = "granted" | "locked" | "unavailable";

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

interface SolutionAccessProvider {
  check(levelId: number): Promise<SolutionAccess>;
}
~~~

## 视觉与交互

- 暖白/浅米背景、墨色文字、克制的木质棋盘质感。
- 曹操棋子用朱红强调，其他棋子采用易区分的沉稳配色，星级点缀金色。
- 移动端关卡和步数放在棋盘上方，撤销、重开、解法和菜单放在下方；桌面端棋盘居中，轻量信息与操作放在侧边。
- 选中棋子轻微抬起、阴影增强；拖动时突出合法方向；落子用约 120–180 ms 缓动吸附；通关动效短促且可跳过。
- prefers-reduced-motion 开启时减少位移、粒子和连续动画。
- 先清点旧美术资源，再决定复用、重绘或使用 Phaser 矢量棋子。

## 技术架构

使用 Vite、TypeScript、React、Phaser、i18next 与 react-i18next。React 负责关卡浏览、设置、文字 HUD 和弹层；Phaser 负责棋盘、棋子、游戏内输入和动效。纯 TypeScript 规则与游戏状态是唯一事实来源。React 持有当前语言，DOM 文案直接订阅 i18next；PhaserHost 为未来画布文字提供语言变化通知，切换时不重建 Phaser 实例。

~~~text
React UI -- actions --> GameStore / Rules -- state --> Phaser Scene
                              |-- LocalStorage progress
                              |-- SolutionAccessProvider
                              |-- SolutionRepository
~~~

关卡转换与解法搜索在构建前离线进行；玩家浏览器不运行求解算法。

GameSnapshot 是游戏状态唯一事实来源，使用 levelId 引用当前关卡并包含棋盘、步数和撤销历史；恢复时使用当前已发布关卡目录中的 canonical Level，并再次校验快照。LocalStorage JSON 按 unknown 解析，校验 schemaVersion、所有进度字段、当前棋盘及每个 undoStack 棋盘的棋子 ID、整数坐标、边界和占格，以及步数与撤销历史的一致性；任一项无效就丢弃整个存档并创建可玩的默认局面，不做部分恢复。进度快照还保存收藏、成绩与 UserSettings（包括语言偏好）。任何成功移动、撤销、重开、开始关卡、通关、收藏或设置变更均写入版本化存档。

## 数据迁移

从本地 reference/HRD/HRD/HRD/AllLevels.xml 转为有版本号的 JSON，保留关卡 ID、名称、难度、MinSteps、目标棋子 ID 和棋子初始位置。导入脚本接收显式输入路径；生成的 public/data/levels.json 纳入版本控制，正常构建只读取该 JSON，不要求 reference 文件存在。docs/legacy-level-data.md 记录本地 XML 的提供方式与再生成命令。导入时检查总数、ID 唯一性、targetPieceId 引用及 2×2 尺寸、minSteps 为有限正整数、棋子类型、边界、占格冲突和难度分布；错误报告关卡 ID 与字段，并阻止产物生成。每关生成一条可验证解法；旧 Windows Phone 存档不自动导入。

## 多语言支持

- 支持的语言代码为 `zh-CN`、`zh-Hant` 和 `en`；切换控件使用各语言的本地名称，包含可访问名称和当前选中状态。
- 使用 i18next 与 react-i18next 管理界面翻译资源。文案按首页、关卡、棋局和通用控件分组；插值、数量和复数使用完整消息模板，不拼接半句话。
- 首次启动按已保存偏好、受支持的浏览器语言、`zh-CN` 的顺序选择。`zh-TW`、`zh-HK`、`zh-MO` 和 `zh-Hant` 映射到 `zh-Hant`；其他 `zh-*` 映射到 `zh-CN`；受支持的 `en-*` 映射到 `en`。未知或损坏的语言值回退到 `zh-CN`。
- 玩家切换后保存语言偏好；语言变化立即更新所有 React 文案、页面 `<title>`、描述元数据和 `<html lang>`，不刷新、不丢失棋局。
- Phaser 画布当前只显示棋盘几何图形。画布未来出现本地化文字时，通过 PhaserHost 的语言变化事件更新文字；语言变化不得销毁或重建游戏实例。
- 关卡 ID、棋子 ID、难度、布局、移动和解法保持语言无关。关卡名称及人物显示名在对应内容进入产品时提供本地化文本，并通过稳定 ID 关联。
- 本地语言偏好在进度存档功能接入后归入 `UserSettings.locale`。

## 首版验收条件

1. 406 关按难度显示，解锁状态符合 60% 门槛。
2. 非法移动不能导致越界、重叠或越过阻挡棋子；多格拖动须检查路径上的每个中间位置，仍计一步。
3. 撤销、重开、刷新恢复的棋盘、步数与撤销历史一致；损坏存档必须整体丢弃并回退到可玩的默认局面。
4. 1.5 倍、3 倍评分边界及解锁临界数正确。
5. 每个已发布解法从初始状态合法播放至通关，订阅者可收到步骤和状态变化。
6. 退出解法播放后，玩家原局面和撤销历史不变。
7. 窄屏与桌面布局可用；减少动态效果时核心操作仍可用。
8. 简体中文、繁体中文、英文之间可即时切换；当前页面文案、页面标题和语言元数据同步更新。
9. 手动语言偏好刷新后保留；未知偏好回退到简体中文；切换语言不改变棋盘、步数或撤销历史。
10. 三种语言在窄屏下均可读，导航与语言切换控件不溢出。

## 不属于首版

购买/支付、账号、排行榜、云存档、旧 WP 存档导入。付费解法未来须由服务端确认授权，不能只依赖前端标志。
