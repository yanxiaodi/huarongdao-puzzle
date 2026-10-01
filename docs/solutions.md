# 关卡解法数据与播放器

本文说明 406 关解法的生成方式、静态数据格式与游戏内播放流程。解法在开发时离线生成，玩家浏览器只加载并播放数据，不会执行搜索。

## 解法数据

`public/data/solutions.json` 是随网站发布的版本化目录，顶层包含 `schemaVersion: 1` 和 `solutions` 数组。每条解法通过 `levelId` 对应关卡，`moves` 按顺序保存移动命令：棋子 ID、方向（`up`、`down`、`left`、`right`）和移动格数。

数据与关卡目录分开保存。解法不得改写 `public/data/levels.json` 中的 `minSteps`；生成的路径合法即可，不保证是最短解。

## 重新生成解法

在仓库根目录执行：

```sh
npm run generate:solutions
```

需要 Node.js 22.6 或更新版本，以使用 Node 内置的 TypeScript stripping。默认输入为 `public/data/levels.json`，输出为 `public/data/solutions.json`。如需指定其他文件，路径相对于仓库根目录：

```sh
node --experimental-strip-types scripts/generate-solutions.ts --input path/to/levels.json --output path/to/solutions.json
```

输入目录必须是 schema 2，并包含 406 个 ID 唯一且符合规则的关卡。生成器使用加权 A* 搜索，并合并同形状棋子的等价局面来减少搜索量。它不寻找最短路径，也不影响游戏评分。

每关生成后，生成器都会用公开的 `applyMove` 逐步重放命令，并用 `hasWon` 检查终局。任何一关无解、产生非法命令或未能通关，都会报告关卡 ID 并停止；只有完整 406 条都通过验证后，才会用临时文件替换输出文件，避免留下不完整目录。

## 游戏加载与播放

| 元件 | 职责 |
| --- | --- |
| `LocalSolutionRepository` | 通过 `BASE_URL` 加载版本化 JSON、检查目录格式并缓存目录；返回解法副本。 |
| `SolutionRepository` | 定义读取解法的接口。 |
| `SolutionAccessProvider` | 定义关卡解法访问策略；目前由 `AlwaysAllowSolutionAccess` 始终允许。 |
| `SolutionPlayback` | 在独立的 `InMemoryGameStore` 上初始化并播放解法，检查每一步及通关状态。 |
| `SolutionScreen` | 显示独立解法页，并以只读 `PhaserHost` 呈现棋盘。 |

玩家打开已解锁关卡后可以直接选择“查看解法”。播放器进入时停在第 0 步并保持暂停，不会自动播放。玩家可以播放、暂停、前进、后退、调整速度或退出。初始速度为每步 1500 毫秒；每次调整 200 毫秒，最快为 200 毫秒。

解法播放器使用独立的棋盘状态；玩家棋局与撤销历史保持不变。游戏计时器会在离开棋局页时暂停，返回棋局页后再恢复。解法棋步不会写入玩家存档或通关记录。

## 播放状态与访问策略

- `paused`、`playing`、`completed` 表示正常播放状态。
- 解法数据不存在或无法加载时为 `unavailable`。
- 访问策略拒绝时为 `locked`；目前首版策略不会拒绝。
- 遇到非法移动，或执行完所有命令后仍未通关时为 `invalid`，并停止播放。

之后如果加入解法解锁或购买流程，替换 `AlwaysAllowSolutionAccess` 的实现即可；`SolutionScreen` 通过 `SolutionAccessProvider` 接口取得结果，无需依赖具体策略。

## 相关文件

- 生成器：`scripts/generate-solutions.ts`
- 解法目录：`public/data/solutions.json`
- 播放器与数据接口：`src/solutions/`
- 播放页与控制项：`src/ui/SolutionScreen.tsx`、`src/ui/SolutionControls.tsx`
