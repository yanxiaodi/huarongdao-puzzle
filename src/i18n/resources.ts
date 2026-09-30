import type { AppLocale } from "./types";
import type { PieceRoleId } from "../data/levelSchema";

export interface TranslationResource {
  app: {
    title: string;
    description: string;
  };
  common: {
    close: string;
    cancel: string;
  };
  brand: {
    name: string;
    mark: string;
    subtitle: string;
  };
  navigation: {
    label: string;
    returnHome: string;
    home: string;
    levels: string;
    game: string;
  };
  header: {
    edition: string;
  };
  language: {
    label: string;
  };
  home: {
    eyebrow: string;
    titleFirst: string;
    titleSecond: string;
    descriptionFirst: string;
    descriptionSecond: string;
    boardAction: string;
    continueAction: string;
    startFirstLevel: string;
    levelsAction: string;
    levelsLabel_one: string;
    levelsLabel_other: string;
    difficultyLabel_one: string;
    difficultyLabel_other: string;
    sealKicker: string;
    sealTitle: string;
    sealCaption: string;
  };
  levels: {
    eyebrow: string;
    title: string;
    description: string;
    previewTitle: string;
    previewDescription: string;
    difficultyLabel: string;
    loadError: string;
    tier: string;
    levelCount: string;
    tierUnlocked: string;
    unlockProgress: string;
    showAll: string;
    showFavorites: string;
    levelNumber: string;
    bestStars: string;
    continueBadge: string;
    lockedLevelLabel: string;
    openLevelLabel: string;
    addFavorite: string;
    removeFavorite: string;
    historyButton: string;
    historyShort: string;
    noFavorites: string;
    noLevels: string;
  };
  game: {
    eyebrow: string;
    title: string;
    columns: string;
    rows: string;
    layout: string;
    levelNumber: string;
    exit: string;
    caption: string;
    loading: string;
    loadError: string;
    boardLabel: string;
    noteSymbol: string;
    note: string;
    stepsLabel: string;
    undo: string;
    restart: string;
    confirmRestart: string;
    backToLevels: string;
    pieces: Record<PieceRoleId, string>;
  };
  win: {
    eyebrow: string;
    title: string;
    starsLabel: string;
    steps: string;
    completedAt: string;
    elapsed: string;
    recordSaved: string;
    recordNotSaved: string;
    replay: string;
    nextLevel: string;
    backToLevels: string;
  };
  history: {
    eyebrow: string;
    title: string;
    description: string;
    steps: string;
    elapsed: string;
    elapsedUnknown: string;
    stars: string;
    replay: string;
    delete: string;
    deleteRecord: string;
    empty: string;
    confirmDeleteTitle: string;
    confirmDeleteMessage: string;
  };
  replay: {
    eyebrow: string;
    title: string;
    recordSummary: string;
    exit: string;
    boardLabel: string;
    progress: string;
    controlsLabel: string;
    interval: string;
    stepBack: string;
    stepForward: string;
    play: string;
    playAgain: string;
    pause: string;
    slower: string;
    faster: string;
    invalid: string;
    status: {
      paused: string;
      playing: string;
      completed: string;
      invalid: string;
    };
  };
  storage: {
    quota: string;
    unavailable: string;
    writeFailed: string;
  };
  footer: {
    tagline: string;
    copyright: string;
  };
}

export const TRANSLATIONS: Record<AppLocale, TranslationResource> = {
  "zh-CN": {
    app: {
      title: "华容道 · 一局静心",
      description: "华容道，一款关于耐心、空间与每一步选择的经典益智游戏。",
    },
    common: { close: "关闭", cancel: "取消" },
    brand: { name: "华容道", mark: "华", subtitle: "HUARONGDAO PUZZLE" },
    navigation: { label: "主导航", returnHome: "返回首页", home: "首页", levels: "选关", game: "棋局" },
    header: { edition: "经典益智" },
    language: { label: "选择语言" },
    home: {
      eyebrow: "4 × 5 · 经典棋局",
      titleFirst: "一局静心，",
      titleSecond: "方寸见天地。",
      descriptionFirst: "移开阻挡的棋子，为曹操打开出口。",
      descriptionSecond: "想好每一步，棋路便会慢慢清晰。",
      boardAction: "查看棋盘",
      continueAction: "继续上次棋局",
      startFirstLevel: "开始第 1 关",
      levelsAction: "浏览关卡",
      levelsLabel_one: "<count>{{count}}</count> 局待解",
      levelsLabel_other: "<count>{{count}}</count> 局待解",
      difficultyLabel_one: "<count>{{count}}</count> 个难度档",
      difficultyLabel_other: "<count>{{count}}</count> 个难度档",
      sealKicker: "移步换形",
      sealTitle: "曹",
      sealCaption: "静候出口",
    },
    levels: {
      eyebrow: "关卡图鉴",
      title: "选择一局棋。",
      description: "406 个棋局分为七档难度，完成当前难度后逐步解锁。",
      previewTitle: "关卡目录即将开放",
      previewDescription: "先从棋盘布局开始，关卡数据会接入旧版的 406 局。",
      difficultyLabel: "难度档位",
      loadError: "关卡目录载入失败，请刷新页面后重试。",
      tier: "第 {{number}} 档",
      levelCount: "{{count}} 关",
      tierUnlocked: "本档已解锁，可以选择任意关卡。",
      unlockProgress: "第 {{tier}} 档是尚未满足的前置门槛：已通关 {{completed}} / {{required}} 关（共 {{total}} 关），达到门槛后解锁本档。",
      showAll: "全部关卡",
      showFavorites: "仅看收藏",
      levelNumber: "第 {{number}} 关",
      bestStars: "最佳星级：{{count}}",
      continueBadge: "继续",
      lockedLevelLabel: "第 {{number}} 关：{{name}}，尚未解锁",
      openLevelLabel: "开始第 {{number}} 关：{{name}}",
      addFavorite: "收藏 {{name}}",
      removeFavorite: "取消收藏 {{name}}",
      historyButton: "查看 {{name}} 的 {{count}} 条通关记录",
      historyShort: "记录 {{count}}",
      noFavorites: "还没有收藏的关卡。",
      noLevels: "此难度档没有关卡。",
    },
    game: {
      eyebrow: "第一局",
      title: "让棋路慢慢打开。",
      columns: "4 列",
      rows: "5 行",
      layout: "经典布局",
      levelNumber: "第 {{number}} 局",
      exit: "出口在底部中央",
      caption: "静观局势 · 从容落子",
      loading: "正在载入棋盘",
      loadError: "棋盘载入失败，请刷新页面后重试。",
      boardLabel: "4 列 5 行华容道棋盘画布",
      noteSymbol: "一",
      note: "拖动棋子，松手后会吸附到最近的格子；发光箭头表示可移动方向。",
      stepsLabel: "步数",
      undo: "撤销",
      restart: "重开",
      confirmRestart: "确定要重开这一局吗？当前走法将被清空。",
      backToLevels: "返回选关",
      pieces: {
        "soldier-bowman": "兵",
        "soldier-pikeman": "卒",
        "soldier-spearman": "勇",
        "soldier-halberdier": "士",
        "soldier-bowman-2": "兵2",
        "soldier-pikeman-2": "卒2",
        "soldier-spearman-2": "勇2",
        "soldier-halberdier-2": "士2",
        "soldier-bowman-3": "兵3",
        "soldier-pikeman-3": "卒3",
        "soldier-spearman-3": "勇3",
        "soldier-halberdier-3": "士3",
        "soldier-bowman-4": "兵4",
        "soldier-pikeman-4": "卒4",
        "soldier-spearman-4": "勇4",
        "soldier-halberdier-4": "士4",
        "general-zhao-yun": "赵云",
        "general-huang-zhong": "黄忠",
        "general-ma-chao": "马超",
        "general-zhang-fei": "张飞",
        "general-guan-yu": "关羽",
        "general-wei-yan": "魏延",
        "cao-cao": "曹操",
      },
    },
    win: {
      eyebrow: "本局完成",
      title: "棋路已通。",
      starsLabel: "本次获得 {{count}} 颗星",
      steps: "完成步数",
      completedAt: "通关时间",
      elapsed: "耗时",
      recordSaved: "完整走法已保存，可随时从关卡记录中回放。",
      recordNotSaved: "通关记录未能保存，刷新页面后可能无法找回本次走法。",
      replay: "回放本局",
      nextLevel: "下一关",
      backToLevels: "返回选关",
    },
    history: {
      eyebrow: "通关记录",
      title: "第 {{number}} 关 · {{name}}",
      description: "共 {{count}} 条记录，步数较少的排在前面。",
      steps: "{{count}} 步",
      elapsed: "耗时 {{time}}",
      elapsedUnknown: "耗时未知",
      stars: "{{count}} 颗星",
      replay: "回放",
      delete: "删除",
      deleteRecord: "删除 {{date}} 完成的 {{count}} 步记录",
      empty: "这关还没有通关记录。",
      confirmDeleteTitle: "删除这条回放？",
      confirmDeleteMessage: "删除后无法恢复；关卡最佳星级和解锁进度会保留。",
    },
    replay: {
      eyebrow: "通关回放 · 第 {{number}} 关",
      title: "回放：{{name}}",
      recordSummary: "{{steps}} 步 · 耗时 {{elapsed}} · {{time}} 完成",
      exit: "退出回放",
      boardLabel: "回放棋盘",
      progress: "第 {{current}} / {{total}} 步",
      controlsLabel: "回放控制",
      interval: "每步 {{seconds}} 秒",
      stepBack: "上一步",
      stepForward: "下一步",
      play: "播放",
      playAgain: "从头播放",
      pause: "暂停",
      slower: "慢一点",
      faster: "快一点",
      invalid: "这条回放包含无效走法，已停止。",
      status: {
        paused: "已暂停",
        playing: "正在播放",
        completed: "回放完成",
        invalid: "回放无效",
      },
    },
    storage: {
      quota: "浏览器存储空间已满，本次进度无法保存。请清理浏览器存储后再试。",
      unavailable: "浏览器本地存储不可用，刷新后进度可能丢失。",
      writeFailed: "保存进度失败，刷新后可能无法恢复本次变化。",
    },
    footer: { tagline: "移一步，见新局。", copyright: "HUARONGDAO · 2026" },
  },
  "zh-Hant": {
    app: {
      title: "華容道 · 一局靜心",
      description: "華容道，一款關於耐心、空間與每一步選擇的經典益智遊戲。",
    },
    common: { close: "關閉", cancel: "取消" },
    brand: { name: "華容道", mark: "華", subtitle: "HUARONGDAO PUZZLE" },
    navigation: { label: "主導覽", returnHome: "返回首頁", home: "首頁", levels: "選關", game: "棋局" },
    header: { edition: "經典益智" },
    language: { label: "選擇語言" },
    home: {
      eyebrow: "4 × 5 · 經典棋局",
      titleFirst: "一局靜心，",
      titleSecond: "方寸見天地。",
      descriptionFirst: "移開阻擋的棋子，為曹操打開出口。",
      descriptionSecond: "想好每一步，棋路便會慢慢清晰。",
      boardAction: "查看棋盤",
      continueAction: "繼續上次棋局",
      startFirstLevel: "開始第 1 關",
      levelsAction: "瀏覽關卡",
      levelsLabel_one: "<count>{{count}}</count> 局待解",
      levelsLabel_other: "<count>{{count}}</count> 局待解",
      difficultyLabel_one: "<count>{{count}}</count> 個難度檔",
      difficultyLabel_other: "<count>{{count}}</count> 個難度檔",
      sealKicker: "移步換形",
      sealTitle: "曹",
      sealCaption: "靜候出口",
    },
    levels: {
      eyebrow: "關卡圖鑑",
      title: "選擇一局棋。",
      description: "406 個棋局分為七檔難度，完成當前難度後逐步解鎖。",
      previewTitle: "關卡目錄即將開放",
      previewDescription: "先從棋盤布局開始，關卡資料會接入舊版的 406 局。",
      difficultyLabel: "難度級別",
      loadError: "關卡目錄載入失敗，請重新整理頁面後再試。",
      tier: "第 {{number}} 檔",
      levelCount: "{{count}} 關",
      tierUnlocked: "本檔已解鎖，可以選擇任意關卡。",
      unlockProgress: "第 {{tier}} 檔是尚未滿足的前置門檻：已通關 {{completed}} / {{required}} 關（共 {{total}} 關），達到門檻後解鎖本檔。",
      showAll: "全部關卡",
      showFavorites: "只看收藏",
      levelNumber: "第 {{number}} 關",
      bestStars: "最佳星級：{{count}}",
      continueBadge: "繼續",
      lockedLevelLabel: "第 {{number}} 關：{{name}}，尚未解鎖",
      openLevelLabel: "開始第 {{number}} 關：{{name}}",
      addFavorite: "收藏 {{name}}",
      removeFavorite: "取消收藏 {{name}}",
      historyButton: "查看 {{name}} 的 {{count}} 條通關記錄",
      historyShort: "記錄 {{count}}",
      noFavorites: "尚未收藏任何關卡。",
      noLevels: "此難度檔沒有關卡。",
    },
    game: {
      eyebrow: "第一局",
      title: "讓棋路慢慢打開。",
      columns: "4 欄",
      rows: "5 列",
      layout: "經典布局",
      levelNumber: "第 {{number}} 局",
      exit: "出口在底部中央",
      caption: "靜觀局勢 · 從容落子",
      loading: "正在載入棋盤",
      loadError: "棋盤載入失敗，請重新整理頁面後再試。",
      boardLabel: "4 欄 5 列華容道棋盤畫布",
      noteSymbol: "一",
      note: "拖動棋子，放開後會吸附到最近的格子；發光箭頭表示可移動方向。",
      stepsLabel: "步數",
      undo: "復原",
      restart: "重開",
      confirmRestart: "確定要重開這一局嗎？目前走法將會清除。",
      backToLevels: "返回選關",
      pieces: {
        "soldier-bowman": "兵",
        "soldier-pikeman": "卒",
        "soldier-spearman": "勇",
        "soldier-halberdier": "士",
        "soldier-bowman-2": "兵2",
        "soldier-pikeman-2": "卒2",
        "soldier-spearman-2": "勇2",
        "soldier-halberdier-2": "士2",
        "soldier-bowman-3": "兵3",
        "soldier-pikeman-3": "卒3",
        "soldier-spearman-3": "勇3",
        "soldier-halberdier-3": "士3",
        "soldier-bowman-4": "兵4",
        "soldier-pikeman-4": "卒4",
        "soldier-spearman-4": "勇4",
        "soldier-halberdier-4": "士4",
        "general-zhao-yun": "趙雲",
        "general-huang-zhong": "黃忠",
        "general-ma-chao": "馬超",
        "general-zhang-fei": "張飛",
        "general-guan-yu": "關羽",
        "general-wei-yan": "魏延",
        "cao-cao": "曹操",
      },
    },
    win: {
      eyebrow: "本局完成",
      title: "棋路已通。",
      starsLabel: "本次獲得 {{count}} 顆星",
      steps: "完成步數",
      completedAt: "通關時間",
      elapsed: "耗時",
      recordSaved: "完整走法已保存，可隨時從關卡記錄中回放。",
      recordNotSaved: "通關記錄未能保存，重新整理頁面後可能無法找回本次走法。",
      replay: "回放本局",
      nextLevel: "下一關",
      backToLevels: "返回選關",
    },
    history: {
      eyebrow: "通關記錄",
      title: "第 {{number}} 關 · {{name}}",
      description: "共 {{count}} 條記錄，步數較少的排在前面。",
      steps: "{{count}} 步",
      elapsed: "耗時 {{time}}",
      elapsedUnknown: "耗時未知",
      stars: "{{count}} 顆星",
      replay: "回放",
      delete: "刪除",
      deleteRecord: "刪除 {{date}} 完成的 {{count}} 步記錄",
      empty: "這一關還沒有通關記錄。",
      confirmDeleteTitle: "刪除這條回放？",
      confirmDeleteMessage: "刪除後無法復原；關卡最佳星級和解鎖進度會保留。",
    },
    replay: {
      eyebrow: "通關回放 · 第 {{number}} 關",
      title: "回放：{{name}}",
      recordSummary: "{{steps}} 步 · 耗時 {{elapsed}} · {{time}} 完成",
      exit: "退出回放",
      boardLabel: "回放棋盤",
      progress: "第 {{current}} / {{total}} 步",
      controlsLabel: "回放控制",
      interval: "每步 {{seconds}} 秒",
      stepBack: "上一步",
      stepForward: "下一步",
      play: "播放",
      playAgain: "從頭播放",
      pause: "暫停",
      slower: "慢一點",
      faster: "快一點",
      invalid: "這條回放包含無效走法，已停止。",
      status: {
        paused: "已暫停",
        playing: "正在播放",
        completed: "回放完成",
        invalid: "回放無效",
      },
    },
    storage: {
      quota: "瀏覽器儲存空間已滿，這次進度無法保存。請清理瀏覽器資料後再試。",
      unavailable: "瀏覽器本機儲存空間無法使用，重新整理後進度可能會遺失。",
      writeFailed: "保存進度失敗，重新整理後可能無法還原這次變更。",
    },
    footer: { tagline: "移一步，見新局。", copyright: "HUARONGDAO · 2026" },
  },
  en: {
    app: {
      title: "Huarongdao · A Moment of Calm",
      description: "A classic puzzle about patience, space, and every move.",
    },
    common: { close: "Close", cancel: "Cancel" },
    brand: { name: "Huarongdao", mark: "華", subtitle: "CLASSIC SLIDING PUZZLE" },
    navigation: { label: "Main navigation", returnHome: "Return to home", home: "Home", levels: "Levels", game: "Puzzle" },
    header: { edition: "Classic puzzle" },
    language: { label: "Choose language" },
    home: {
      eyebrow: "4 × 5 · Classic puzzle",
      titleFirst: "A quiet game,",
      titleSecond: "a world in every move.",
      descriptionFirst: "Clear a path to the exit for Cao Cao.",
      descriptionSecond: "Plan each move, and the solution will emerge.",
      boardAction: "View the board",
      continueAction: "Continue last puzzle",
      startFirstLevel: "Start Level 1",
      levelsAction: "Browse levels",
      levelsLabel_one: "<count>{{count}}</count> puzzle to solve",
      levelsLabel_other: "<count>{{count}}</count> puzzles to solve",
      difficultyLabel_one: "<count>{{count}}</count> difficulty tier",
      difficultyLabel_other: "<count>{{count}}</count> difficulty tiers",
      sealKicker: "SHIFT THE PIECES",
      sealTitle: "CAO",
      sealCaption: "EXIT AWAITS",
    },
    levels: {
      eyebrow: "LEVEL INDEX",
      title: "Choose a puzzle.",
      description: "406 puzzles across seven difficulty tiers. Complete a tier to unlock the next.",
      previewTitle: "Level catalogue coming soon",
      previewDescription: "The board is ready; all 406 classic layouts will be connected next.",
      difficultyLabel: "Difficulty tiers",
      loadError: "Could not load the level catalogue. Refresh the page and try again.",
      tier: "Tier {{number}}",
      levelCount: "{{count}} levels",
      tierUnlocked: "This tier is unlocked. Choose any level.",
      unlockProgress: "Tier {{tier}} is the first unmet prerequisite: {{completed}} of {{required}} levels complete ({{total}} total).",
      showAll: "All levels",
      showFavorites: "Favorites only",
      levelNumber: "Level {{number}}",
      bestStars: "Best star rating: {{count}}",
      continueBadge: "Continue",
      lockedLevelLabel: "Level {{number}}: {{name}}, locked",
      openLevelLabel: "Start Level {{number}}: {{name}}",
      addFavorite: "Favorite {{name}}",
      removeFavorite: "Remove {{name}} from favorites",
      historyButton: "Completion history for {{name}} ({{count}} records)",
      historyShort: "Records {{count}}",
      noFavorites: "You have no favorite levels yet.",
      noLevels: "There are no levels in this tier.",
    },
    game: {
      eyebrow: "PUZZLE 001",
      title: "Make room for the next move.",
      columns: "4 columns",
      rows: "5 rows",
      layout: "Classic layout",
      levelNumber: "Puzzle #{{number}}",
      exit: "Exit at bottom center",
      caption: "Read the board · Move with care",
      loading: "Loading board",
      loadError: "Could not load the board. Refresh the page and try again.",
      boardLabel: "4-column by 5-row Huarongdao board canvas",
      noteSymbol: "01",
      note: "Drag a piece and release to snap to the nearest cell; highlighted arrows show legal directions.",
      stepsLabel: "Moves",
      undo: "Undo",
      restart: "Restart",
      confirmRestart: "Restart this puzzle? Its current move sequence will be cleared.",
      backToLevels: "Back to levels",
      pieces: {
        "soldier-bowman": "Bowman",
        "soldier-pikeman": "Pikeman",
        "soldier-spearman": "Spearman",
        "soldier-halberdier": "Halberdier",
        "soldier-bowman-2": "Bowman2",
        "soldier-pikeman-2": "Pikeman2",
        "soldier-spearman-2": "Spearman2",
        "soldier-halberdier-2": "Halberdier2",
        "soldier-bowman-3": "Bowman3",
        "soldier-pikeman-3": "Pikeman3",
        "soldier-spearman-3": "Spearman3",
        "soldier-halberdier-3": "Halberdier3",
        "soldier-bowman-4": "Bowman4",
        "soldier-pikeman-4": "Pikeman4",
        "soldier-spearman-4": "Spearman4",
        "soldier-halberdier-4": "Halberdier4",
        "general-zhao-yun": "Zhao Yun",
        "general-huang-zhong": "Huang Zhong",
        "general-ma-chao": "Ma Chao",
        "general-zhang-fei": "Zhang Fei",
        "general-guan-yu": "Guan Yu",
        "general-wei-yan": "Wei Yan",
        "cao-cao": "Cao Cao",
      },
    },
    win: {
      eyebrow: "PUZZLE COMPLETE",
      title: "The path is clear.",
      starsLabel: "Star rating earned this run: {{count}}",
      steps: "Moves",
      completedAt: "Completed",
      elapsed: "Time",
      recordSaved: "The full move sequence is saved and can be replayed from this level's history.",
      recordNotSaved: "This completion could not be saved. The move sequence may be lost after you leave or refresh.",
      replay: "Replay this run",
      nextLevel: "Next level",
      backToLevels: "Back to levels",
    },
    history: {
      eyebrow: "COMPLETION HISTORY",
      title: "Level {{number}} · {{name}}",
      description: "Completion records: {{count}}. Sorted by fewest moves.",
      steps: "Moves: {{count}}",
      elapsed: "Time {{time}}",
      elapsedUnknown: "Time unknown",
      stars: "Star rating: {{count}}",
      replay: "Replay",
      delete: "Delete",
      deleteRecord: "Delete the {{count}}-move record from {{date}}",
      empty: "There are no completion records for this level yet.",
      confirmDeleteTitle: "Delete this replay?",
      confirmDeleteMessage: "This cannot be undone. The level's best stars and unlock progress will remain.",
    },
    replay: {
      eyebrow: "COMPLETION REPLAY · LEVEL {{number}}",
      title: "Replay: {{name}}",
      recordSummary: "{{steps}} moves · {{elapsed}} elapsed · completed {{time}}",
      exit: "Exit replay",
      boardLabel: "Replay board",
      progress: "Move {{current}} of {{total}}",
      controlsLabel: "Replay controls",
      interval: "{{seconds}} seconds per move",
      stepBack: "Previous move",
      stepForward: "Next move",
      play: "Play",
      playAgain: "Play again",
      pause: "Pause",
      slower: "Slower",
      faster: "Faster",
      invalid: "This replay contains an invalid move and has stopped.",
      status: {
        paused: "Paused",
        playing: "Playing",
        completed: "Replay complete",
        invalid: "Invalid replay",
      },
    },
    storage: {
      quota: "Browser storage is full, so this progress could not be saved. Clear browser data and try again.",
      unavailable: "Browser storage is unavailable. Progress may be lost after a refresh.",
      writeFailed: "Could not save progress. These changes may not survive a refresh.",
    },
    footer: { tagline: "One move at a time.", copyright: "HUARONGDAO · 2026" },
  },
};
