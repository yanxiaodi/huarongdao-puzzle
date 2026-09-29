import type { AppLocale } from "./types";

export interface TranslationResource {
  app: {
    title: string;
    description: string;
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
    boardLabel: string;
    noteSymbol: string;
    note: string;
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
    },
    game: {
      eyebrow: "棋盘预览",
      title: "让棋路慢慢打开。",
      columns: "4 列",
      rows: "5 行",
      layout: "经典布局",
      levelNumber: "第 {{number}} 局",
      exit: "出口在底部中央",
      caption: "静观局势 · 从容落子",
      loading: "正在载入棋盘",
      boardLabel: "4 列 5 行华容道棋盘画布",
      noteSymbol: "一",
      note: "棋盘舞台已经就位，接下来将接入关卡、移动规则与解法播放。",
    },
    footer: { tagline: "移一步，见新局。", copyright: "HUARONGDAO · 2026" },
  },
  "zh-Hant": {
    app: {
      title: "華容道 · 一局靜心",
      description: "華容道，一款關於耐心、空間與每一步選擇的經典益智遊戲。",
    },
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
    },
    game: {
      eyebrow: "棋盤預覽",
      title: "讓棋路慢慢打開。",
      columns: "4 欄",
      rows: "5 列",
      layout: "經典布局",
      levelNumber: "第 {{number}} 局",
      exit: "出口在底部中央",
      caption: "靜觀局勢 · 從容落子",
      loading: "正在載入棋盤",
      boardLabel: "4 欄 5 列華容道棋盤畫布",
      noteSymbol: "一",
      note: "棋盤舞台已經就位，接下來將接入關卡、移動規則與解法播放。",
    },
    footer: { tagline: "移一步，見新局。", copyright: "HUARONGDAO · 2026" },
  },
  en: {
    app: {
      title: "Huarongdao · A Moment of Calm",
      description: "A classic puzzle about patience, space, and every move.",
    },
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
    },
    game: {
      eyebrow: "BOARD PREVIEW",
      title: "Make room for the next move.",
      columns: "4 columns",
      rows: "5 rows",
      layout: "Classic layout",
      levelNumber: "Puzzle #{{number}}",
      exit: "Exit at bottom center",
      caption: "Read the board · Move with care",
      loading: "Loading board",
      boardLabel: "4-column by 5-row Huarongdao board canvas",
      noteSymbol: "01",
      note: "The board stage is ready. Levels, movement rules, and solution playback come next.",
    },
    footer: { tagline: "One move at a time.", copyright: "HUARONGDAO · 2026" },
  },
};