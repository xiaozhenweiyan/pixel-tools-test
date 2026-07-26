/**
 * pixel-rpg.js
 * 像素 RPG 小游戏 / Pixel RPG Mini-Game
 *
 * 功能：
 *   - 瓦片地图（20x15），多个关卡，房间+随机墙
 *   - 玩家角色 16x16 像素，4 方向行走动画
 *   - 接触怪物触发回合制战斗（伤害 = 攻击力 - 防御力，最小 1）
 *   - 击败怪物获得经验，满经验升级（HP/ATK/DEF 提升）
 *   - 宝箱随机奖励（HP 药水 / ATK / DEF / EXP）
 *   - Web Audio API 生成 8-bit BGM 循环 + 音效（移动/攻击/受伤/升级/胜利/开箱/下楼）
 *   - 顶部 UI：HP 条 / 等级 / 经验条 / ATK / DEF / 关卡
 *
 * 用法：
 *   PixelRPG.init(canvas);
 *   PixelRPG.start();
 *   PixelRPG.stop();
 *   PixelRPG.reset();
 *
 * 调色板：与站点 pixel.css 一致（像素深空 Pixel Deep Space）
 */
window.PixelRPG = (function () {
  'use strict';

  // ============================================================
  // 常量 / Constants
  // ============================================================

  // 颜色（地牢风调色板）
  const COLOR = {
    BG:                   '#0a0a14', // 地牢背景（更暗）
    FLOOR:                '#3a3a3a', // 深灰石板地板
    GRASS:                '#228b22', // 草地绿（保留兼容，未使用）
    GRASS_DK:             '#1a6b1a', // 草地暗（保留兼容，未使用）
    WALL:                 '#1a1a1a', // 黑色砖墙主色
    WALL_DK:              '#1f1f33', // 墙壁暗（保留供 UI 使用）
    WALL_LT:              '#3d3d54', // 墙壁亮（保留供 UI 使用）
    WALL_HIGHLIGHT:       '#2a2a2a', // 砖墙高光
    WALL_SHADOW:          '#000000', // 砖墙阴影
    TORCH_HANDLE:         '#8b4513', // 火把木柄棕色
    TORCH_FIRE:           '#ff6600', // 火把橙色火焰
    TORCH_FIRE_HIGHLIGHT: '#ffaa00', // 火把火焰高光
    ROBE:                 '#0a0a0a', // 玩家黑袍
    MASK:                 '#f0f0f0', // 玩家白色面具
    SLIME:                'rgba(124, 252, 0, 0.85)', // 史莱姆半透明绿
    SLIME_HIGHLIGHT:      '#aaff44', // 史莱姆高光
    SLIME_OUTLINE:        '#4a8a00', // 史莱姆暗描边
    CHEST:                '#ffd700', // 宝箱金
    CHEST_DK:             '#8b4513', // 宝箱暗棕
    EXIT:                 '#ffd700', // 出口金（向下走廊箭头）
    PLAYER:               '#ffd700', // 玩家金色（保留兼容，未使用）
    PLAYER_SKIN:          '#ffe4c4', // 玩家肤色（保留兼容，未使用）
    PLAYER_HAIR:          '#8b4513', // 玩家头发（保留兼容，未使用）
    HP_RED:               '#ff4500', // HP 红
    HP_GREEN:             '#228b22', // HP 绿
    EXP_BLUE:             '#1e90ff', // 经验蓝
    PANEL:                '#2d2d44', // UI 面板
    TEXT:                 '#ffd700', // 文字金
    TEXT_DIM:             '#8888aa', // 暗文字
    BLACK:                '#000000',
    WHITE:                '#ffffff'
  };

  // 瓦片类型
  const TILE = {
    FLOOR: 0, // 深灰石板地板（地牢）
    WALL: 1,  // 黑色砖墙
    EXIT: 2   // 向下走廊出口
  };

  // 地图尺寸
  const MAP_W = 20;
  const MAP_H = 15;
  const TILE_PX = 16;           // 逻辑像素
  const SCALE = 2;               // 显示放大倍数
  const PIXEL = TILE_PX * SCALE; // 屏幕每格像素 = 32

  // 画布尺寸
  const UI_HEIGHT = 60;
  const CANVAS_W = MAP_W * PIXEL;            // 640
  const CANVAS_H = MAP_H * PIXEL + UI_HEIGHT; // 480 + 60 = 540

  // 移动动画速度（每秒移动几格）
  const MOVE_SPEED = 8;

  // 怪物种类（基础数值，会随关卡缩放；weight 控制生成权重）
  // id 为内部稳定标识，name 作为兜底，nameKey 指向 i18n 键
  const MONSTER_TYPES = [
    { id: 'slime', name: '史莱姆', nameKey: 'rpg_monster_slime', hp: 8,  atk: 3, def: 0, exp: 5,  color: '#7cfc00', color2: '#4a8a00', weight: 60 },
    { id: 'bat',   name: '蝙蝠',   nameKey: 'rpg_monster_bat',   hp: 6,  atk: 5, def: 0, exp: 7,  color: '#9370db', color2: '#5a3080', weight: 13 },
    { id: 'skeleton', name: '骷髅', nameKey: 'rpg_monster_skeleton', hp: 12, atk: 6, def: 2, exp: 12, color: '#e0e0e0', color2: '#888888', weight: 13 },
    { id: 'goblin', name: '哥布林', nameKey: 'rpg_monster_goblin', hp: 10, atk: 7, def: 1, exp: 10, color: '#8b4513', color2: '#4a2408', weight: 14 }
  ];

  // 物品模板（宝箱掉落 / 装备 / 消耗品）
  // name/desc 作为兜底，nameKey/descKey 指向 i18n 键
  const ITEM_TEMPLATES = [
    { id: 'wooden_sword', name: '木剑', nameEn: 'Wooden Sword', nameKey: 'rpg_item_wooden_sword_name', descKey: 'rpg_item_wooden_sword_desc', type: 'weapon', slot: 'leftHand', atk: 2, color: '#8b4513', desc: '一把简陋的木制短剑', descEn: 'A crude wooden short sword' },
    { id: 'potion_hp_i', name: '恢复药水I', nameEn: 'Potion I', nameKey: 'rpg_item_potion_hp_i_name', descKey: 'rpg_item_potion_hp_i_desc', type: 'consumable', effect: { hp: 20 }, stackable: true, color: '#ff4500', desc: '恢复 20 点生命值', descEn: 'Restores 20 HP' },
    { id: 'leather_helmet', name: '皮盔', nameEn: 'Leather Helmet', nameKey: 'rpg_item_leather_helmet_name', descKey: 'rpg_item_leather_helmet_desc', type: 'armor', slot: 'head', def: 1, color: '#a0522d', desc: '皮革制成的头盔', descEn: 'A helmet made of leather' },
    { id: 'leather_armor', name: '皮甲', nameEn: 'Leather Armor', nameKey: 'rpg_item_leather_armor_name', descKey: 'rpg_item_leather_armor_desc', type: 'armor', slot: 'body', def: 3, color: '#a0522d', desc: '皮革制成的胸甲', descEn: 'Chest armor made of leather' },
    { id: 'leather_leggings', name: '皮护腿', nameEn: 'Leather Leggings', nameKey: 'rpg_item_leather_leggings_name', descKey: 'rpg_item_leather_leggings_desc', type: 'armor', slot: 'legs', def: 2, color: '#a0522d', desc: '皮革制成的护腿', descEn: 'Leggings made of leather' },
    { id: 'leather_boots', name: '皮靴', nameEn: 'Leather Boots', nameKey: 'rpg_item_leather_boots_name', descKey: 'rpg_item_leather_boots_desc', type: 'armor', slot: 'feet', def: 1, color: '#a0522d', desc: '皮革制成的靴子', descEn: 'Boots made of leather' },
    { id: 'exp_gem_i', name: '经验宝石I', nameEn: 'EXP Gem I', nameKey: 'rpg_item_exp_gem_i_name', descKey: 'rpg_item_exp_gem_i_desc', type: 'consumable', effect: { exp: 1 }, stackable: true, instant: true, color: '#1e90ff', desc: '增加 1 点经验', descEn: 'Grants 1 EXP' },
    { id: 'attack_ring', name: '攻击戒指', nameEn: 'Attack Ring', nameKey: 'rpg_item_attack_ring_name', descKey: 'rpg_item_attack_ring_desc', type: 'accessory', slot: 'accessory', atk: 1, color: '#ffd700', desc: '增加 1 点攻击力的饰品', descEn: 'Accessory that boosts ATK by 1' }
  ];
  let itemIdCounter = 1;

  // BGM 旋律（C 大调五声音阶，8 音符循环）
  const BGM_MELODY = [
    { freq: 261.63, dur: 0.24 }, // C4
    { freq: 329.63, dur: 0.24 }, // E4
    { freq: 392.00, dur: 0.24 }, // G4
    { freq: 523.25, dur: 0.24 }, // C5
    { freq: 440.00, dur: 0.24 }, // A4
    { freq: 392.00, dur: 0.24 }, // G4
    { freq: 329.63, dur: 0.24 }, // E4
    { freq: 261.63, dur: 0.24 }  // C4
  ];

  // ============================================================
  // 模块状态 / Module State
  // ============================================================

  let canvas = null;
  let ctx = null;

  const state = {
    // 音频
    audioContext: null,
    masterGain: null,
    noiseBuffer: null,
    bgmPlaying: false,
    bgmNoteIndex: 0,
    bgmNextTime: 0,
    bgmTimer: null,

    // 地图（二维数组，存 TILE 类型）
    map: [],
    exit: { gx: 0, gy: 0 },

    // 玩家
    player: {
      gx: 1, gy: 1,              // 网格坐标
      px: PIXEL, py: PIXEL,      // 屏幕像素坐标（游戏区内，不含 UI 偏移）
      targetGx: 1, targetGy: 1,  // 移动目标
      moving: false,
      moveProgress: 0,           // 0~1
      facing: 'down',            // up/down/left/right
      frame: 0,                  // 行走动画帧 0/1
      pathQueue: [],             // 自动导航路径队列（坐标对象数组，不含起点）
      autoNavigating: false,     // 是否正在自动导航
      hp: 20, maxHp: 20,
      atk: 5, def: 1,
      level: 1, exp: 0, expToNext: 10,
      inventory: [],
      inventoryMax: 16,
      equipment: { leftHand: null, rightHand: null, head: null, body: null, legs: null, feet: null, accessory: null },
      selectedSlot: null,
      attackTarget: null
    },

    // 怪物与宝箱
    monsters: [],
    chests: [],
    torches: [],

    // 游戏状态
    level: 1,                    // 当前关卡
    gameOver: false,
    message: '',
    messageKey: null,
    messageParams: null,
    messageTimer: 0,
    animTime: 0,

    // 循环
    running: false,
    lastTime: 0,
    animationId: null
  };

  // ============================================================
  // 音频系统 / Audio (Web Audio API)
  // ============================================================

  /**
   * 初始化 Web Audio API 上下文（需在用户手势后真正发声）。
   */
  function initAudio() {
    if (state.audioContext) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    state.audioContext = new AudioContext();
    state.masterGain = state.audioContext.createGain();
    state.masterGain.gain.value = 0.5;
    state.masterGain.connect(state.audioContext.destination);
    createNoiseBuffer();
  }

  /**
   * 创建白噪声缓冲（用于攻击音效）。
   */
  function createNoiseBuffer() {
    const ac = state.audioContext;
    if (!ac) return;
    const len = Math.floor(ac.sampleRate * 0.3);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len); // 衰减噪声
    }
    state.noiseBuffer = buf;
  }

  /**
   * 播放 BGM（8 音符旋律循环）。
   */
  function playBGM() {
    if (!state.audioContext) return;
    if (state.bgmPlaying) return;
    state.bgmPlaying = true;
    state.bgmNoteIndex = 0;
    state.bgmNextTime = state.audioContext.currentTime + 0.05;
    scheduleBGM();
  }

  /**
   * 调度 BGM 音符（前瞻调度，避免抖动）。
   */
  function scheduleBGM() {
    if (!state.bgmPlaying || !state.audioContext) return;
    const ac = state.audioContext;
    while (state.bgmNextTime < ac.currentTime + 0.3) {
      const note = BGM_MELODY[state.bgmNoteIndex];
      // 主旋律（方波）
      scheduleBGMNote(note.freq, state.bgmNextTime, note.dur, 'square', 0.06);
      // 低音伴奏（三角波，每两拍一次）
      if (state.bgmNoteIndex % 2 === 0) {
        scheduleBGMNote(note.freq / 2, state.bgmNextTime, note.dur * 2, 'triangle', 0.05);
      }
      state.bgmNextTime += note.dur;
      state.bgmNoteIndex = (state.bgmNoteIndex + 1) % BGM_MELODY.length;
    }
    state.bgmTimer = setTimeout(scheduleBGM, 80);
  }

  /**
   * 安排单个 BGM 音符。
   */
  function scheduleBGMNote(freq, time, dur, type, vol) {
    const ac = state.audioContext;
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(vol, time + 0.02);
    gain.gain.setValueAtTime(vol, time + dur * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.95);
    osc.connect(gain);
    gain.connect(state.masterGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  /**
   * 停止 BGM。
   */
  function stopBGM() {
    state.bgmPlaying = false;
    if (state.bgmTimer) {
      clearTimeout(state.bgmTimer);
      state.bgmTimer = null;
    }
  }

  /**
   * 播放短促音效。
   * @param {string} type move|attack|hurt|levelup|win|chest|stairs
   */
  function playSound(type) {
    if (!state.audioContext) return;
    const ac = state.audioContext;
    const now = ac.currentTime;

    switch (type) {
      case 'move': {
        // 移动：短促低频 blip
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'square';
        osc.frequency.value = 180;
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        osc.connect(gain); gain.connect(state.masterGain);
        osc.start(now); osc.stop(now + 0.06);
        break;
      }
      case 'attack': {
        // 攻击：噪声爆发 + 下降方波
        if (state.noiseBuffer) {
          const noise = ac.createBufferSource();
          noise.buffer = state.noiseBuffer;
          const ng = ac.createGain();
          ng.gain.setValueAtTime(0.18, now);
          ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
          noise.connect(ng); ng.connect(state.masterGain);
          noise.start(now); noise.stop(now + 0.12);
        }
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc.connect(gain); gain.connect(state.masterGain);
        osc.start(now); osc.stop(now + 0.12);
        break;
      }
      case 'hurt': {
        // 受伤：下降锯齿波
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.connect(gain); gain.connect(state.masterGain);
        osc.start(now); osc.stop(now + 0.3);
        break;
      }
      case 'levelup': {
        // 升级：上升琶音 C5 E5 G5 C6
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const t = now + i * 0.08;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
          osc.connect(gain); gain.connect(state.masterGain);
          osc.start(t); osc.stop(t + 0.2);
        });
        break;
      }
      case 'win': {
        // 胜利：和弦 C5 E5 G5
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq) => {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'square';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
          osc.connect(gain); gain.connect(state.masterGain);
          osc.start(now); osc.stop(now + 0.3);
        });
        break;
      }
      case 'chest': {
        // 开宝箱：叮叮叮
        [659.25, 880, 1318.5].forEach((freq, i) => {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const t = now + i * 0.06;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.14, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
          osc.connect(gain); gain.connect(state.masterGain);
          osc.start(t); osc.stop(t + 0.16);
        });
        break;
      }
      case 'stairs': {
        // 下楼：上升滑音
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain); gain.connect(state.masterGain);
        osc.start(now); osc.stop(now + 0.35);
        break;
      }
    }
  }

  // ============================================================
  // 地图生成 / Map Generation
  // ============================================================

  /**
   * 生成指定关卡的地图（地牢迷宫 + 火把 + 出口 + 怪物 + 宝箱）。
   * 使用递归回溯算法挖出完美迷宫通道。
   * @param {number} level 关卡数
   */
  function generateMap(level) {
    // 初始化全墙（地牢砖墙）
    state.map = [];
    state.torches = [];
    for (let y = 0; y < MAP_H; y++) {
      state.map[y] = [];
      for (let x = 0; x < MAP_W; x++) {
        state.map[y][x] = TILE.WALL;
      }
    }

    // 递归回溯算法挖通道（步长 2 保证墙厚 1）
    const stack = [{ x: 1, y: 1 }];
    state.map[1][1] = TILE.FLOOR;
    const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];

    while (stack.length > 0) {
      const cur = stack[stack.length - 1];
      // 找未访问的邻居（仍为 WALL 且坐标在范围内）
      const neighbors = [];
      for (let d = 0; d < dirs.length; d++) {
        const nx = cur.x + dirs[d][0];
        const ny = cur.y + dirs[d][1];
        if (nx > 0 && nx < MAP_W - 1 && ny > 0 && ny < MAP_H - 1 && state.map[ny][nx] === TILE.WALL) {
          neighbors.push({ x: nx, y: ny, dx: dirs[d][0], dy: dirs[d][1] });
        }
      }
      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }
      // 随机选一个邻居，打通中间的墙
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      state.map[cur.y + pick.dy / 2][cur.x + pick.dx / 2] = TILE.FLOOR;
      state.map[pick.y][pick.x] = TILE.FLOOR;
      stack.push({ x: pick.x, y: pick.y });
    }

    // 玩家起点（左上角空地）
    state.player.gx = 1;
    state.player.gy = 1;
    state.player.px = state.player.gx * PIXEL;
    state.player.py = state.player.gy * PIXEL;
    state.player.targetGx = state.player.gx;
    state.player.targetGy = state.player.gy;
    state.player.moving = false;
    state.player.moveProgress = 0;
    state.player.facing = 'down';

    // 出口（右下角，确保是空地后标记为 EXIT 瓦片）
    const ex = MAP_W - 2;
    const ey = MAP_H - 2;
    if (state.map[ey][ex] === TILE.WALL) {
      state.map[ey][ex] = TILE.FLOOR;
      // 若上下左右都是墙（孤立），打通上方连接附近通道
      if (state.map[ey - 1][ex] === TILE.WALL && state.map[ey][ex - 1] === TILE.WALL) {
        state.map[ey - 1][ex] = TILE.FLOOR;
      }
    }
    state.map[ey][ex] = TILE.EXIT;
    state.exit = { gx: ex, gy: ey };

    // 火把：墙的中段以 20% 概率添加（且至少有一个相邻 FLOOR/EXIT）
    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        if (state.map[y][x] === TILE.WALL) {
          const adjacentFloor =
            state.map[y - 1][x] === TILE.FLOOR || state.map[y - 1][x] === TILE.EXIT ||
            state.map[y + 1][x] === TILE.FLOOR || state.map[y + 1][x] === TILE.EXIT ||
            state.map[y][x - 1] === TILE.FLOOR || state.map[y][x - 1] === TILE.EXIT ||
            state.map[y][x + 1] === TILE.FLOOR || state.map[y][x + 1] === TILE.EXIT;
          if (adjacentFloor && Math.random() < 0.20) {
            state.torches.push({ gx: x, gy: y });
          }
        }
      }
    }

    // 怪物
    state.monsters = [];
    const numMonsters = 4 + Math.min(level, 6);
    let attempts = 0;
    while (state.monsters.length < numMonsters && attempts < 300) {
      attempts++;
      const mx = 1 + Math.floor(Math.random() * (MAP_W - 2));
      const my = 1 + Math.floor(Math.random() * (MAP_H - 2));
      if (state.map[my][mx] !== TILE.FLOOR) continue;
      if (mx === state.player.gx && my === state.player.gy) continue;
      if (mx === ex && my === ey) continue;
      // 离玩家至少 4 格曼哈顿距离
      if (Math.abs(mx - state.player.gx) + Math.abs(my - state.player.gy) < 4) continue;
      // 不与已有怪物重叠
      if (state.monsters.some(m => m.gx === mx && m.gy === my)) continue;
      // 加权选择怪物类型（在等级可用范围内）
      const availableCount = Math.min(MONSTER_TYPES.length, 1 + Math.floor(level / 2));
      const available = MONSTER_TYPES.slice(0, availableCount);
      let totalW = 0;
      for (let i = 0; i < available.length; i++) totalW += available[i].weight;
      let r = Math.random() * totalW;
      let typeIdx = 0;
      for (let i = 0; i < available.length; i++) {
        r -= available[i].weight;
        if (r <= 0) { typeIdx = i; break; }
      }
      const type = available[typeIdx];
      const scale = 1 + (level - 1) * 0.3;
      const hp = Math.round(type.hp * scale);
      state.monsters.push({
        gx: mx, gy: my,
        id: type.id,
        type: type.name,
        nameKey: type.nameKey,
        hp: hp, maxHp: hp,
        atk: Math.round(type.atk * scale),
        def: type.def,
        exp: type.exp,
        color: type.color,
        color2: type.color2,
        alive: true
      });
    }

    // 宝箱
    state.chests = [];
    const numChests = 2;
    attempts = 0;
    while (state.chests.length < numChests && attempts < 100) {
      attempts++;
      const cx = 1 + Math.floor(Math.random() * (MAP_W - 2));
      const cy = 1 + Math.floor(Math.random() * (MAP_H - 2));
      if (state.map[cy][cx] !== TILE.FLOOR) continue;
      if (cx === state.player.gx && cy === state.player.gy) continue;
      if (cx === ex && cy === ey) continue;
      if (state.monsters.some(m => m.gx === cx && m.gy === cy)) continue;
      if (state.chests.some(c => c.gx === cx && c.gy === cy)) continue;
      state.chests.push({ gx: cx, gy: cy, opened: false });
    }
  }

  // ============================================================
  // 像素绘制 / Pixel Drawing
  // ============================================================

  /**
   * 绘制单个瓦片（16x16 像素，放大 SCALE 倍显示）。
   * 地牢风：石板地板 / 黑色砖墙 / 向下走廊出口。
   */
  function drawTile(gx, gy, type) {
    const x = gx * PIXEL;
    const y = UI_HEIGHT + gy * PIXEL;
    const s = SCALE;
    if (type === TILE.FLOOR) {
      // 深灰石板地板
      ctx.fillStyle = COLOR.FLOOR;
      ctx.fillRect(x, y, PIXEL, PIXEL);
      // 细微斑点（基于 gx,gy 的伪随机）
      const seed = (gx * 73 + gy * 31) % 7;
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(x + (seed * 3 % 16) * s, y + (seed * 5 % 16) * s, 1 * s, 1 * s);
      ctx.fillRect(x + (seed * 7 % 16) * s, y + (seed * 11 % 16) * s, 1 * s, 1 * s);
      // 石板缝隙（深色边线，下边和右边）
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x, y + PIXEL - 1 * s, PIXEL, 1 * s);
      ctx.fillRect(x + PIXEL - 1 * s, y, 1 * s, PIXEL);
    } else if (type === TILE.WALL) {
      // 黑色砖墙主体
      ctx.fillStyle = COLOR.WALL;
      ctx.fillRect(x, y, PIXEL, PIXEL);
      // 砖块高光（顶部和左侧）
      ctx.fillStyle = COLOR.WALL_HIGHLIGHT;
      ctx.fillRect(x, y, PIXEL, 2 * s);
      ctx.fillRect(x, y, 2 * s, PIXEL);
      // 砖块阴影（底部和右侧）
      ctx.fillStyle = COLOR.WALL_SHADOW;
      ctx.fillRect(x, y + PIXEL - 2 * s, PIXEL, 2 * s);
      ctx.fillRect(x + PIXEL - 2 * s, y, 2 * s, PIXEL);
      // 砖块缝隙（中间横线）
      ctx.fillStyle = COLOR.BLACK;
      ctx.fillRect(x, y + 8 * s, PIXEL, 1 * s);
      // 错位竖线（奇偶行不同位置，模拟砌砖错位）
      if (gy % 2 === 0) {
        ctx.fillRect(x + 8 * s, y, 1 * s, 8 * s);
        ctx.fillRect(x + 4 * s, y + 9 * s, 1 * s, 7 * s);
      } else {
        ctx.fillRect(x + 4 * s, y, 1 * s, 8 * s);
        ctx.fillRect(x + 8 * s, y + 9 * s, 1 * s, 7 * s);
      }
    } else if (type === TILE.EXIT) {
      // 向下走廊出口
      // 先画地板底色
      ctx.fillStyle = COLOR.FLOOR;
      ctx.fillRect(x, y, PIXEL, PIXEL);
      // 黑色走廊入口（向下延伸的暗道）
      ctx.fillStyle = COLOR.BLACK;
      ctx.fillRect(x + 4 * s, y + 2 * s, 8 * s, 12 * s);
      // 拱门轮廓（深灰边框）
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(x + 4 * s, y + 2 * s, 8 * s, 1 * s);  // 顶部
      ctx.fillRect(x + 4 * s, y + 2 * s, 1 * s, 4 * s);  // 左立柱
      ctx.fillRect(x + 11 * s, y + 2 * s, 1 * s, 4 * s); // 右立柱
      // 向下阶梯（3 级，逐渐变窄，模拟透视）
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(x + 5 * s, y + 6 * s, 6 * s, 2 * s);
      ctx.fillStyle = COLOR.BLACK;
      ctx.fillRect(x + 5 * s, y + 8 * s, 6 * s, 1 * s);
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(x + 6 * s, y + 9 * s, 4 * s, 2 * s);
      ctx.fillStyle = COLOR.BLACK;
      ctx.fillRect(x + 6 * s, y + 11 * s, 4 * s, 1 * s);
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(x + 7 * s, y + 12 * s, 2 * s, 2 * s);
      // 底部金色向下箭头（指示下楼）
      ctx.fillStyle = COLOR.EXIT;
      const ax = x + 8 * s;
      const ay = y + 13 * s;
      ctx.fillRect(ax, ay, 1 * s, 2 * s);
      ctx.fillRect(ax - 1 * s, ay + 2 * s, 3 * s, 1 * s);
    }
  }

  /**
   * 绘制玩家（16x16 像素戴面具的黑衣人，4 方向 + 2 帧行走动画）。
   * 整体只有黑+白两色：黑袍 + 黑兜帽 + 白色面具 + 黑色眼洞。
   * @param {number} px 屏幕坐标 x（含 UI 偏移）
   * @param {number} py 屏幕坐标 y（含 UI 偏移）
   * @param {string} facing up/down/left/right
   * @param {number} frame 0 或 1（行走帧）
   */
  function drawPlayer(px, py, facing, frame) {
    const s = SCALE;
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(px + 3 * s, py + 14 * s, 10 * s, 1 * s);

    // 腿偏移（行走动画：两腿前后错开）
    let lLegX = 5, rLegX = 9;
    if (frame === 1) { lLegX = 4; rLegX = 10; }

    // 腿部（黑袍下摆）
    ctx.fillStyle = COLOR.ROBE;
    ctx.fillRect(px + lLegX * s, py + 12 * s, 2 * s, 3 * s);
    ctx.fillRect(px + rLegX * s, py + 12 * s, 2 * s, 3 * s);

    // 黑色长袍主体（覆盖身体）
    ctx.fillStyle = COLOR.ROBE;
    ctx.fillRect(px + 4 * s, py + 7 * s, 8 * s, 6 * s);

    // 黑色兜帽（头部上方）
    ctx.fillRect(px + 5 * s, py + 2 * s, 6 * s, 4 * s);
    // 兜帽尖端（根据朝向有细微差别）
    if (facing === 'down') {
      ctx.fillRect(px + 6 * s, py + 1 * s, 4 * s, 1 * s);
    } else if (facing === 'up') {
      ctx.fillRect(px + 6 * s, py + 1 * s, 4 * s, 1 * s);
    } else if (facing === 'left') {
      ctx.fillRect(px + 4 * s, py + 2 * s, 2 * s, 3 * s);
    } else if (facing === 'right') {
      ctx.fillRect(px + 10 * s, py + 2 * s, 2 * s, 3 * s);
    }

    // 白色面具（覆盖脸部）
    ctx.fillStyle = COLOR.MASK;
    if (facing === 'down') {
      ctx.fillRect(px + 6 * s, py + 5 * s, 4 * s, 3 * s);
      // 黑色眼洞
      ctx.fillStyle = COLOR.BLACK;
      ctx.fillRect(px + 7 * s, py + 6 * s, 1 * s, 1 * s);
      ctx.fillRect(px + 9 * s, py + 6 * s, 1 * s, 1 * s);
    } else if (facing === 'up') {
      // 朝上：背面，面具不显示（兜帽覆盖）
    } else if (facing === 'left') {
      ctx.fillRect(px + 5 * s, py + 5 * s, 3 * s, 3 * s);
      // 黑色眼洞（单只）
      ctx.fillStyle = COLOR.BLACK;
      ctx.fillRect(px + 6 * s, py + 6 * s, 1 * s, 1 * s);
    } else if (facing === 'right') {
      ctx.fillRect(px + 8 * s, py + 5 * s, 3 * s, 3 * s);
      // 黑色眼洞（单只）
      ctx.fillStyle = COLOR.BLACK;
      ctx.fillRect(px + 9 * s, py + 6 * s, 1 * s, 1 * s);
    }
  }

  /**
   * 绘制墙上火把（棕色木柄 + 闪烁的橙色火焰）。
   * 火把位置由 generateMap 写入 state.torches。
   */
  function drawTorches() {
    const s = SCALE;
    if (!state.torches) return;
    for (let i = 0; i < state.torches.length; i++) {
      const t = state.torches[i];
      const x = t.gx * PIXEL;
      const y = UI_HEIGHT + t.gy * PIXEL;

      // 火焰闪烁（基于 animTime + 火把位置相位偏移）
      const flicker = Math.sin(state.animTime * 8 + t.gx * 1.7 + t.gy * 2.3);
      const fireH = 4 + Math.floor(flicker * 1.5 + 1.5); // 4-7（逻辑像素）
      const fireW = 3 + Math.floor(flicker * 0.5 + 0.5); // 3-4

      // 橙色火焰主体（在木柄顶部上方）
      const fireX = x + 8 * s - Math.floor(fireW / 2) * s;
      const fireY = y + 6 * s - fireH * s;
      ctx.fillStyle = COLOR.TORCH_FIRE;
      ctx.fillRect(fireX, fireY, fireW * s, fireH * s);

      // 火焰高光（黄色竖条）
      ctx.fillStyle = COLOR.TORCH_FIRE_HIGHLIGHT;
      ctx.fillRect(x + 8 * s, fireY + 1 * s, 1 * s, (fireH - 2) * s);

      // 棕色木柄（竖条）
      ctx.fillStyle = COLOR.TORCH_HANDLE;
      ctx.fillRect(x + 7 * s, y + 6 * s, 2 * s, 8 * s);
    }
  }

  /**
   * 绘制怪物（16x16 像素，根据类型不同形状，含闲置浮动动画）。
   * 史莱姆分支使用半透明绿色 + 自带描边/眼睛；其他怪物保留原绘制逻辑。
   */
  function drawMonster(m) {
    const x = m.gx * PIXEL;
    const y = UI_HEIGHT + m.gy * PIXEL;
    const s = SCALE;
    // 闲置动画（上下浮动 1 像素）
    const bob = Math.sin(state.animTime * 4 + m.gx + m.gy) > 0 ? 0 : 1 * s;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 4 * s, y + 14 * s, 8 * s, 1 * s);

    if (m.id === 'slime') {
      // 变形动画（scaleY 在 0.85-1.15 间变化）
      const scaleY = 1.0 + Math.sin(state.animTime * 3 + m.gx * 1.3) * 0.15;
      const baseH = 8; // 逻辑像素
      const h = Math.floor(baseH * scaleY);
      const offsetY = Math.floor((baseH - h) / 2);
      const w = 8;
      const sx = x + 4 * s;
      const sy = y + (4 + offsetY) * s + bob;

      // 半透明绿色主体
      ctx.fillStyle = COLOR.SLIME;
      ctx.fillRect(sx, sy, w * s, h * s);

      // 高光
      ctx.fillStyle = COLOR.SLIME_HIGHLIGHT;
      ctx.fillRect(x + 6 * s, y + (5 + offsetY) * s + bob, 3 * s, 2 * s);

      // 暗描边（顶/底/左/右）
      ctx.fillStyle = COLOR.SLIME_OUTLINE;
      ctx.fillRect(sx, sy, w * s, 1 * s);                   // 顶
      ctx.fillRect(sx, sy + (h - 1) * s, w * s, 1 * s);     // 底
      ctx.fillRect(sx, sy, 1 * s, h * s);                   // 左
      ctx.fillRect(sx + (w - 1) * s, sy, 1 * s, h * s);     // 右

      // 眼睛（两只黑色小点）
      ctx.fillStyle = COLOR.BLACK;
      ctx.fillRect(x + 6 * s, y + (7 + offsetY) * s + bob, 1 * s, 1 * s);
      ctx.fillRect(x + 9 * s, y + (7 + offsetY) * s + bob, 1 * s, 1 * s);
    } else {
      ctx.fillStyle = m.color;
      if (m.id === 'bat') {
        // 蝙蝠：身体 + 翅膀
        ctx.fillRect(x + 6 * s, y + (6 + bob) * s, 4 * s, 5 * s);
        ctx.fillRect(x + 2 * s, y + (7 + bob) * s, 4 * s, 3 * s);
        ctx.fillRect(x + 10 * s, y + (7 + bob) * s, 4 * s, 3 * s);
      } else if (m.id === 'skeleton') {
        // 骷髅：头骨 + 下颌
        ctx.fillRect(x + 4 * s, y + (4 + bob) * s, 8 * s, 7 * s);
        ctx.fillRect(x + 5 * s, y + (11 + bob) * s, 6 * s, 3 * s);
      } else {
        // 哥布林：小人
        ctx.fillRect(x + 5 * s, y + (3 + bob) * s, 6 * s, 5 * s);
        ctx.fillRect(x + 4 * s, y + (8 + bob) * s, 8 * s, 5 * s);
      }

      // 暗色描边
      ctx.fillStyle = m.color2;
      ctx.fillRect(x + 3 * s, y + (12 + bob) * s, 10 * s, 1 * s);

      // 眼睛
      ctx.fillStyle = COLOR.BLACK;
      ctx.fillRect(x + 6 * s, y + (8 + bob) * s, 1 * s, 1 * s);
      ctx.fillRect(x + 9 * s, y + (8 + bob) * s, 1 * s, 1 * s);
    }

    // HP 条（受伤时显示）
    if (m.hp < m.maxHp) {
      ctx.fillStyle = COLOR.BG;
      ctx.fillRect(x + 2 * s, y + 1 * s, 12 * s, 2 * s);
      ctx.fillStyle = COLOR.HP_RED;
      ctx.fillRect(x + 2 * s, y + 1 * s, Math.ceil(12 * s * (m.hp / m.maxHp)), 2 * s);
    }
  }

  /**
   * 绘制宝箱（未打开状态）。
   */
  function drawChest(c) {
    if (c.opened) return;
    const x = c.gx * PIXEL;
    const y = UI_HEIGHT + c.gy * PIXEL;
    const s = SCALE;
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 3 * s, y + 13 * s, 10 * s, 1 * s);
    // 箱体
    ctx.fillStyle = COLOR.CHEST_DK;
    ctx.fillRect(x + 3 * s, y + 5 * s, 10 * s, 8 * s);
    // 顶盖
    ctx.fillStyle = COLOR.CHEST;
    ctx.fillRect(x + 3 * s, y + 4 * s, 10 * s, 3 * s);
    // 锁
    ctx.fillStyle = COLOR.BLACK;
    ctx.fillRect(x + 7 * s, y + 8 * s, 2 * s, 2 * s);
    // 横条装饰
    ctx.fillStyle = COLOR.CHEST;
    ctx.fillRect(x + 3 * s, y + 11 * s, 10 * s, 1 * s);
  }

  // ============================================================
  // i18n 显示辅助 / i18n Display Helpers
  // ============================================================

  /**
   * 取怪物显示名：优先 i18n.t(nameKey)，回退到 name。
   */
  function getMonsterDisplayName(monster) {
    if (!monster) return '';
    if (window.i18n && monster.nameKey) return window.i18n.t(monster.nameKey) || monster.name;
    return monster.name || monster.type || '';
  }

  /**
   * 取物品显示名：优先 i18n.t(nameKey)，回退到 name。
   */
  function getItemDisplayName(item) {
    if (!item) return '';
    if (window.i18n && item.nameKey) return window.i18n.t(item.nameKey) || item.name;
    return item.name || '';
  }

  /**
   * 取物品显示描述：优先 i18n.t(descKey)，回退到 desc。
   */
  function getItemDisplayDesc(item) {
    if (!item) return '';
    if (window.i18n && item.descKey) return window.i18n.t(item.descKey) || item.desc;
    return item.desc || '';
  }

  /**
   * 取装备类型显示名。
   */
  function getItemTypeDisplayName(typeKey) {
    var keyMap = {
      weapon: 'rpg_type_weapon',
      armor: 'rpg_type_armor',
      consumable: 'rpg_type_consumable',
      accessory: 'rpg_type_accessory'
    };
    var fallbackMap = {
      weapon: '武器', armor: '防具', consumable: '消耗品', accessory: '饰品'
    };
    var key = keyMap[typeKey];
    if (key && window.i18n) return window.i18n.t(key) || fallbackMap[typeKey] || typeKey;
    return fallbackMap[typeKey] || typeKey;
  }

  // ============================================================
  // 游戏逻辑 / Game Logic
  // ============================================================

  /**
   * 显示消息提示。
   * @param {string} msg 消息内容
   * @param {number} dur 显示时长（秒）
   */
  function showMessage(msg, dur, key, params) {
    state.message = msg;
    state.messageKey = key || null;
    state.messageParams = params || null;
    state.messageTimer = dur || 1.5;
  }

  /**
   * BFS 寻路：从起点到终点的最短路径。
   * - 墙壁(WALL)不可通行；怪物占据格视为不可通行
   * - 出口/宝箱/空地可通行
   * - 终点本身是墙时直接返回 null
   * - 终点不可走（怪物占据）时寻找其相邻 4 格中距起点最近的可走格作为实际终点
   * - 返回路径坐标数组 [{x,y}, ...]（含起点和终点），不可达返回 null
   */
  function findPathBFS(startGx, startGy, endGx, endGy) {
    // 边界检查
    if (startGx < 0 || startGx >= MAP_W || startGy < 0 || startGy >= MAP_H) return null;
    if (endGx < 0 || endGx >= MAP_W || endGy < 0 || endGy >= MAP_H) return null;

    // 判断格子是否可走（FLOOR/EXIT/宝箱格，非 WALL、非怪物占据格）
    function isWalkable(x, y) {
      if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return false;
      if (state.map[y][x] === TILE.WALL) return false;
      for (let i = 0; i < state.monsters.length; i++) {
        const m = state.monsters[i];
        if (m.alive && m.gx === x && m.gy === y) return false;
      }
      return true;
    }

    // 终点为墙，直接不可达
    if (state.map[endGy][endGx] === TILE.WALL) return null;

    // 终点不可走（怪物占据）时，寻找相邻 4 格中距起点最近的可走格作为实际终点
    let actualEndX = endGx, actualEndY = endGy;
    if (!isWalkable(endGx, endGy)) {
      const adjDirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      let best = null;
      let bestDist = Infinity;
      for (let d = 0; d < adjDirs.length; d++) {
        const nx = endGx + adjDirs[d][0];
        const ny = endGy + adjDirs[d][1];
        if (!isWalkable(nx, ny)) continue;
        const dist = Math.abs(nx - startGx) + Math.abs(ny - startGy);
        if (dist < bestDist) {
          bestDist = dist;
          best = { x: nx, y: ny };
        }
      }
      if (!best) return null;
      actualEndX = best.x;
      actualEndY = best.y;
    }

    // BFS 主循环
    const queue = [{ x: startGx, y: startGy }];
    const visited = [];
    for (let y = 0; y < MAP_H; y++) {
      visited[y] = [];
      for (let x = 0; x < MAP_W; x++) visited[y][x] = false;
    }
    visited[startGy][startGx] = true;

    const parent = {};
    const keyOf = function (x, y) { return y * MAP_W + x; };
    const moveDirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    let found = (startGx === actualEndX && startGy === actualEndY);

    while (!found && queue.length > 0) {
      const cur = queue.shift();
      for (let d = 0; d < moveDirs.length; d++) {
        const nx = cur.x + moveDirs[d][0];
        const ny = cur.y + moveDirs[d][1];
        if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
        if (visited[ny][nx]) continue;
        if (!isWalkable(nx, ny)) continue;
        visited[ny][nx] = true;
        parent[keyOf(nx, ny)] = { x: cur.x, y: cur.y };
        if (nx === actualEndX && ny === actualEndY) {
          found = true;
          break;
        }
        queue.push({ x: nx, y: ny });
      }
    }

    if (!found) return null;

    // 回溯路径
    const path = [];
    let cur = { x: actualEndX, y: actualEndY };
    while (cur) {
      path.push({ x: cur.x, y: cur.y });
      cur = parent[keyOf(cur.x, cur.y)];
    }
    path.reverse();
    return path;
  }

  /**
   * 朝向目标格子（根据 dx/dy 绝对值决定主方向）。
   */
  function faceTowards(tx, ty) {
    const dx = tx - state.player.gx;
    const dy = ty - state.player.gy;
    if (Math.abs(dx) > Math.abs(dy)) {
      state.player.facing = dx > 0 ? 'right' : 'left';
    } else {
      state.player.facing = dy > 0 ? 'down' : 'up';
    }
  }

  /**
   * 点击地图导航：计算 BFS 路径并启动自动导航。
   * - 玩家移动中(moving=true)或游戏结束(gameOver)时忽略
   * - 检测目标格是否有 alive 怪物，记录为 attackTarget
   * - 路径不可达或长度 <2 时，若目标是相邻怪物则直接攻击
   * - 路径去掉起点后存入 pathQueue，设置 autoNavigating=true
   */
  function navigateTo(targetGx, targetGy) {
    if (state.player.moving) return;   // 移动中不接收新点击
    if (state.gameOver) return;
    // 检测目标格是否有 alive 怪物
    const targetMonster = state.monsters.find(m => m.alive && m.gx === targetGx && m.gy === targetGy);
    state.player.attackTarget = targetMonster || null;
    const path = findPathBFS(state.player.gx, state.player.gy, targetGx, targetGy);
    if (!path || path.length < 2) {
      // 已在目标相邻格且目标是怪物，直接攻击
      if (targetMonster) {
        const dx = Math.abs(targetMonster.gx - state.player.gx);
        const dy = Math.abs(targetMonster.gy - state.player.gy);
        if (dx + dy === 1) {
          // 朝向怪物并攻击
          faceTowards(targetMonster.gx, targetMonster.gy);
          combatRound(targetMonster);
        }
      }
      return;
    }
    path.shift(); // 去掉起点
    state.player.pathQueue = path;
    state.player.autoNavigating = true;
  }

  /**
   * 尝试移动玩家到相邻格子（含碰撞、宝箱、怪物、出口判定）。
   */
  function tryMove(dx, dy) {
    if (state.player.moving || state.gameOver) return;
    const nx = state.player.gx + dx;
    const ny = state.player.gy + dy;
    if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;
    const tile = state.map[ny][nx];
    if (tile === TILE.WALL) return;
    // 检查宝箱
    const chest = state.chests.find(c => !c.opened && c.gx === nx && c.gy === ny);
    if (chest) {
      openChest(chest);
      return;
    }
    // 检查怪物：触发战斗回合
    const monster = state.monsters.find(m => m.alive && m.gx === nx && m.gy === ny);
    if (monster) {
      combatRound(monster);
      return;
    }
    // 出口：进入下一关
    if (tile === TILE.EXIT) {
      nextLevel();
      return;
    }
    // 普通移动
    state.player.targetGx = nx;
    state.player.targetGy = ny;
    state.player.moving = true;
    state.player.moveProgress = 0;
    playSound('move');
  }

  /**
   * 朝面对方向攻击（空格 / J）。
   */
  function tryAttack() {
    if (state.player.moving || state.gameOver) return;
    let dx = 0, dy = 0;
    if (state.player.facing === 'up') dy = -1;
    else if (state.player.facing === 'down') dy = 1;
    else if (state.player.facing === 'left') dx = -1;
    else if (state.player.facing === 'right') dx = 1;
    const nx = state.player.gx + dx;
    const ny = state.player.gy + dy;
    const monster = state.monsters.find(m => m.alive && m.gx === nx && m.gy === ny);
    if (monster) {
      combatRound(monster);
    }
  }

  /**
   * 一回合战斗：玩家攻击 → 怪物反击（若存活）。
   * 伤害 = max(1, atk - def)
   */
  function combatRound(monster) {
    // 玩家攻击
    const dmgToMonster = Math.max(1, getEffectiveAtk() - monster.def);
    const monsterDisplay = getMonsterDisplayName(monster);
    monster.hp -= dmgToMonster;
    showMessage((window.i18n && window.i18n.t('rpg_msg_deal_damage', { monster: monsterDisplay, dmg: dmgToMonster })) || ('对 ' + monster.type + ' 造成 ' + dmgToMonster + ' 伤害'), 0.9, 'rpg_msg_deal_damage', { monster: monsterDisplay, dmg: dmgToMonster });
    playSound('attack');
    if (monster.hp <= 0) {
      monster.alive = false;
      state.player.exp += monster.exp;
      showMessage((window.i18n && window.i18n.t('rpg_msg_defeat_monster', { monster: monsterDisplay, exp: monster.exp })) || ('击败 ' + monster.type + '! +' + monster.exp + ' EXP'), 1.5, 'rpg_msg_defeat_monster', { monster: monsterDisplay, exp: monster.exp });
      playSound('win');
      checkLevelUp();
      return;
    }
    // 怪物反击
    const dmgToPlayer = Math.max(1, monster.atk - getEffectiveDef());
    state.player.hp -= dmgToPlayer;
    playSound('hurt');
    if (state.player.hp <= 0) {
      state.player.hp = 0;
      state.gameOver = true;
      showMessage((window.i18n && window.i18n.t('rpg_msg_player_defeated')) || '你被击败了... 游戏结束', 3, 'rpg_msg_player_defeated');
      stopBGM();
    } else {
      showMessage((window.i18n && window.i18n.t('rpg_msg_monster_counter', { monster: monsterDisplay, dmg: dmgToPlayer })) || (monster.type + ' 反击 ' + dmgToPlayer + ' 伤害'), 0.8, 'rpg_msg_monster_counter', { monster: monsterDisplay, dmg: dmgToPlayer });
    }
  }

  /**
   * 计算玩家有效攻击力（基础 + 武器加成）。
   */
  function getEffectiveAtk() {
    let atk = state.player.atk;
    const eq = state.player.equipment;
    Object.keys(eq).forEach(function (key) {
      if (eq[key] && eq[key].atk) atk += eq[key].atk;
    });
    return atk;
  }

  /**
   * 计算玩家有效防御力（基础 + 防具加成）。
   */
  function getEffectiveDef() {
    let def = state.player.def;
    const eq = state.player.equipment;
    Object.keys(eq).forEach(function (key) {
      if (eq[key] && eq[key].def) def += eq[key].def;
    });
    return def;
  }

  /**
   * 装备物品：从背包移到装备槽，旧装备退回背包。
   */
  function equipItem(item) {
    if (item.type !== 'weapon' && item.type !== 'armor' && item.type !== 'accessory') return;
    const slot = item.slot;
    const idx = state.player.inventory.indexOf(item);
    if (idx < 0) return;
    state.player.inventory.splice(idx, 1);
    const old = state.player.equipment[slot];
    if (old) {
      if (state.player.inventory.length < state.player.inventoryMax) {
        state.player.inventory.push(old);
      } else {
        state.player.inventory.push(item);
        showMessage((window.i18n && window.i18n.t('rpg_msg_inventory_full_equip')) || '背包已满! 无法更换装备', 2, 'rpg_msg_inventory_full_equip');
        return;
      }
    }
    state.player.equipment[slot] = item;
    var itemDisplay = getItemDisplayName(item);
    showMessage((window.i18n && window.i18n.t('rpg_msg_equip_item', { name: itemDisplay })) || ('装备: ' + item.name), 1.5, 'rpg_msg_equip_item', { name: itemDisplay });
    renderInventory();
    renderEquipment();
    renderItemDetails();
  }

  /**
   * 卸下装备：从装备槽退回背包。
   */
  function unequipItem(slotKey) {
    const item = state.player.equipment[slotKey];
    if (!item) return;
    if (state.player.inventory.length >= state.player.inventoryMax) {
      showMessage((window.i18n && window.i18n.t('rpg_msg_inventory_full_unequip')) || '背包已满! 无法卸下', 2, 'rpg_msg_inventory_full_unequip');
      return;
    }
    state.player.inventory.push(item);
    state.player.equipment[slotKey] = null;
    var itemDisplay = getItemDisplayName(item);
    showMessage((window.i18n && window.i18n.t('rpg_msg_unequip_item', { name: itemDisplay })) || ('卸下: ' + item.name), 1.5, 'rpg_msg_unequip_item', { name: itemDisplay });
    renderInventory();
    renderEquipment();
    renderItemDetails();
  }

  /**
   * 使用消耗品：恢复 HP 或获得经验，消耗后堆叠数-1。
   */
  function useItem(item) {
    if (item.type !== 'consumable') return;
    var itemDisplay = getItemDisplayName(item);
    if (item.effect && item.effect.hp) {
      if (state.player.hp >= state.player.maxHp) {
        showMessage((window.i18n && window.i18n.t('rpg_msg_hp_full')) || 'HP 已满', 1.5, 'rpg_msg_hp_full');
        return;
      }
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + item.effect.hp);
      showMessage((window.i18n && window.i18n.t('rpg_msg_use_hp_item', { name: itemDisplay, hp: item.effect.hp })) || ('使用 ' + item.name + '! +' + item.effect.hp + ' HP'), 1.5, 'rpg_msg_use_hp_item', { name: itemDisplay, hp: item.effect.hp });
    } else if (item.effect && item.effect.exp) {
      state.player.exp += item.effect.exp;
      showMessage((window.i18n && window.i18n.t('rpg_msg_use_exp_item', { name: itemDisplay, exp: item.effect.exp })) || ('使用 ' + item.name + '! +' + item.effect.exp + ' EXP'), 1.5, 'rpg_msg_use_exp_item', { name: itemDisplay, exp: item.effect.exp });
      checkLevelUp();
    }
    if (item.count && item.count > 1) {
      item.count--;
    } else {
      const idx = state.player.inventory.indexOf(item);
      if (idx >= 0) state.player.inventory.splice(idx, 1);
    }
    renderInventory();
    renderItemDetails();
  }

  /**
   * 打开宝箱，获得随机物品（消耗品/装备；经验宝石即时消耗）。
   */
  function openChest(chest) {
    chest.opened = true;
    // 随机选一个物品模板（经验宝石权重降低，装备权重提高）
    const weightedPool = [];
    ITEM_TEMPLATES.forEach(t => {
      const w = t.type === 'consumable' && t.instant ? 1 : (t.type === 'consumable' ? 3 : 2);
      for (let i = 0; i < w; i++) weightedPool.push(t);
    });
    const tpl = weightedPool[Math.floor(Math.random() * weightedPool.length)];

    // 经验宝石即时消耗
    if (tpl.instant && tpl.effect && tpl.effect.exp) {
      state.player.exp += tpl.effect.exp;
      showMessage((window.i18n && window.i18n.t('rpg_msg_chest_exp_gem', { exp: tpl.effect.exp })) || ('宝箱: 经验宝石! +' + tpl.effect.exp + ' EXP'), 2, 'rpg_msg_chest_exp_gem', { exp: tpl.effect.exp });
      checkLevelUp();
      playSound('chest');
      if (typeof renderInventory === 'function') renderInventory();
      if (typeof renderItemDetails === 'function') renderItemDetails();
      return;
    }

    // 背包满检查
    if (state.player.inventory.length >= state.player.inventoryMax) {
      var tplDisplay = getItemDisplayName(tpl);
      showMessage((window.i18n && window.i18n.t('rpg_msg_inventory_full_pickup', { name: tplDisplay })) || ('背包已满! 无法拾取 ' + tpl.name), 2, 'rpg_msg_inventory_full_pickup', { name: tplDisplay });
      playSound('chest');
      return;
    }

    // 生成物品对象
    const item = {
      id: itemIdCounter++,
      templateId: tpl.id,
      name: tpl.name,
      nameEn: tpl.nameEn,
      nameKey: tpl.nameKey,
      descKey: tpl.descKey,
      type: tpl.type,
      color: tpl.color,
      desc: tpl.desc,
      descEn: tpl.descEn
    };
    if (tpl.type === 'consumable') {
      item.effect = tpl.effect;
      item.stackable = tpl.stackable;
      // 堆叠：若已有同名消耗品，数量+1
      const existing = state.player.inventory.find(it => it.name === item.name && it.stackable);
      if (existing) {
        existing.count = (existing.count || 1) + 1;
      } else {
        item.count = 1;
        state.player.inventory.push(item);
      }
    } else {
      item.slot = tpl.slot;
      if (tpl.atk) item.atk = tpl.atk;
      if (tpl.def) item.def = tpl.def;
      state.player.inventory.push(item);
    }

    var newTplDisplay = getItemDisplayName(tpl);
    showMessage((window.i18n && window.i18n.t('rpg_msg_chest_get', { name: newTplDisplay })) || ('宝箱: 获得 ' + tpl.name + '!'), 2, 'rpg_msg_chest_get', { name: newTplDisplay });
    playSound('chest');
    if (typeof renderInventory === 'function') renderInventory();
    if (typeof renderItemDetails === 'function') renderItemDetails();
  }

  /**
   * 检查升级：经验满后提升等级与属性。
   */
  function checkLevelUp() {
    while (state.player.exp >= state.player.expToNext) {
      state.player.exp -= state.player.expToNext;
      state.player.level++;
      state.player.maxHp += 5;
      state.player.hp = state.player.maxHp; // 升级回满 HP
      state.player.atk += 2;
      state.player.def += 1;
      state.player.expToNext = Math.floor(state.player.expToNext * 1.5);
      showMessage((window.i18n && window.i18n.t('rpg_msg_level_up', { level: state.player.level })) || ('升级! 等级 ' + state.player.level + ' (HP/ATK/DEF 提升)'), 2, 'rpg_msg_level_up', { level: state.player.level });
      playSound('levelup');
    }
  }

  /**
   * 进入下一关：生成新地图，少量恢复 HP。
   */
  function nextLevel() {
    state.level++;
    var enterText = window.i18n ? (window.i18n.t('rpg_floor_enter', { n: state.level }) || ('进入第 ' + state.level + ' 层')) : ('进入第 ' + state.level + ' 层');
    showMessage(enterText + '!', 2);
    playSound('stairs');
    generateMap(state.level);
    // 关卡过渡：恢复 5 HP（不超过上限）
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5);
  }

  // ============================================================
  // UI 绘制 / UI Rendering
  // ============================================================

  /**
   * 绘制顶部 UI（HP/EXP 条、等级、属性、关卡）。
   */
  function drawUI() {
    // 面板背景
    ctx.fillStyle = COLOR.PANEL;
    ctx.fillRect(0, 0, CANVAS_W, UI_HEIGHT);
    ctx.fillStyle = COLOR.WALL_LT;
    ctx.fillRect(0, UI_HEIGHT - 2, CANVAS_W, 2);

    ctx.textBaseline = 'middle';

    // 等级
    ctx.fillStyle = COLOR.TEXT;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('LV ' + state.player.level, 10, 14);

    // HP 条
    ctx.fillStyle = COLOR.TEXT;
    ctx.font = '10px monospace';
    ctx.fillText('HP', 10, 38);
    ctx.fillStyle = COLOR.BG;
    ctx.fillRect(28, 32, 120, 12);
    const hpRatio = state.player.maxHp > 0 ? state.player.hp / state.player.maxHp : 0;
    ctx.fillStyle = hpRatio > 0.3 ? COLOR.HP_GREEN : COLOR.HP_RED;
    ctx.fillRect(28, 32, Math.ceil(120 * hpRatio), 12);
    ctx.fillStyle = COLOR.TEXT;
    ctx.fillText(state.player.hp + '/' + state.player.maxHp, 60, 38);

    // 经验条
    ctx.fillStyle = COLOR.TEXT;
    ctx.fillText('EXP', 160, 38);
    ctx.fillStyle = COLOR.BG;
    ctx.fillRect(190, 32, 90, 12);
    ctx.fillStyle = COLOR.EXP_BLUE;
    const expRatio = state.player.expToNext > 0 ? state.player.exp / state.player.expToNext : 0;
    ctx.fillRect(190, 32, Math.ceil(90 * expRatio), 12);
    ctx.fillStyle = COLOR.TEXT;
    ctx.fillText(state.player.exp + '/' + state.player.expToNext, 210, 38);

    // ATK / DEF（显示装备加成，如 ATK 5+3）
    ctx.fillStyle = COLOR.TEXT;
    ctx.font = '11px monospace';
    let atkBonus = 0, defBonus = 0;
    const eq = state.player.equipment;
    Object.keys(eq).forEach(function (key) {
      if (eq[key]) {
        if (eq[key].atk) atkBonus += eq[key].atk;
        if (eq[key].def) defBonus += eq[key].def;
      }
    });
    const atkText = atkBonus > 0 ? ('ATK ' + state.player.atk + '+' + atkBonus) : ('ATK ' + state.player.atk);
    const defText = defBonus > 0 ? ('DEF ' + state.player.def + '+' + defBonus) : ('DEF ' + state.player.def);
    ctx.fillText(atkText, 295, 38);
    ctx.fillText(defText, 350, 38);

    // 关卡
    ctx.fillStyle = COLOR.TEXT;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    var floorText = window.i18n ? (window.i18n.t('rpg_floor_display', { n: state.level }) || ('第 ' + state.level + ' 层')) : ('第 ' + state.level + ' 层');
    ctx.fillText(floorText, CANVAS_W - 10, 14);

    // 背包数量（关卡下方）
    ctx.fillStyle = COLOR.TEXT_DIM;
    ctx.font = '10px monospace';
    var invText = window.i18n ? (window.i18n.t('rpg_ui_inventory_count', { cur: state.player.inventory.length, max: state.player.inventoryMax }) || ('背包 ' + state.player.inventory.length + '/' + state.player.inventoryMax)) : ('背包 ' + state.player.inventory.length + '/' + state.player.inventoryMax);
    ctx.fillText(invText, CANVAS_W - 10, 28);

    // 操作提示
    ctx.fillStyle = COLOR.TEXT_DIM;
    ctx.font = '10px monospace';
    var hintTxt = window.i18n ? (window.i18n.t('rpg_ui_control_hint') || '方向键/WASD 移动 · 空格/J 攻击 · R 重置') : '方向键/WASD 移动 · 空格/J 攻击 · R 重置';
    ctx.fillText(hintTxt, CANVAS_W - 10, 44);

    ctx.textAlign = 'left';
  }

  /**
   * 绘制消息提示（顶部居中）。
   */
  function drawMessage() {
    var displayText = state.message;
    if (state.messageKey && typeof window !== 'undefined' && window.i18n) {
      var translated = window.i18n.t(state.messageKey, state.messageParams || {});
      if (translated && translated !== state.messageKey) {
        displayText = translated;
      }
    }
    if (!displayText) return;
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const x = CANVAS_W / 2;
    const y = UI_HEIGHT + 24;
    const w = ctx.measureText(displayText).width + 20;
    // 背景框
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x - w / 2, y - 12, w, 24);
    ctx.strokeStyle = COLOR.TEXT;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - w / 2, y - 12, w, 24);
    // 文字
    ctx.fillStyle = COLOR.TEXT;
    ctx.fillText(displayText, x, y);
    ctx.textAlign = 'left';
  }

  /**
   * 绘制游戏结束遮罩。
   */
  function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLOR.HP_RED;
    ctx.font = 'bold 32px monospace';
    var gameOverText = window.i18n ? (window.i18n.t('rpg_ui_game_over') || '游戏结束') : '游戏结束';
    ctx.fillText(gameOverText, CANVAS_W / 2, CANVAS_H / 2 - 30);
    ctx.fillStyle = COLOR.TEXT;
    ctx.font = '14px monospace';
    var fellText = window.i18n ? (window.i18n.t('rpg_floor_fell', { n: state.level }) || ('你倒在了第 ' + state.level + ' 层')) : ('你倒在了第 ' + state.level + ' 层');
    ctx.fillText(fellText, CANVAS_W / 2, CANVAS_H / 2 + 10);
    ctx.fillStyle = COLOR.TEXT_DIM;
    var restartText = window.i18n ? (window.i18n.t('rpg_ui_restart_hint') || '按 R 重新开始') : '按 R 重新开始';
    ctx.fillText(restartText, CANVAS_W / 2, CANVAS_H / 2 + 40);
    ctx.textAlign = 'left';
  }

  // ============================================================
  // 主循环 / Game Loop
  // ============================================================

  /**
   * 更新游戏状态（每帧调用）。
   * @param {number} dt 距上一帧的秒数
   */
  function update(dt) {
    state.animTime += dt;
    // 消息计时
    if (state.messageTimer > 0) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) {
        state.message = '';
        state.messageKey = null;
        state.messageParams = null;
      }
    }
    // 玩家移动动画（网格间插值）
    if (state.player.moving) {
      state.player.moveProgress += dt * MOVE_SPEED;
      if (state.player.moveProgress >= 1) {
        state.player.moveProgress = 1;
        state.player.gx = state.player.targetGx;
        state.player.gy = state.player.targetGy;
        state.player.moving = false;
      }
      const t = state.player.moveProgress;
      const fromX = state.player.gx;
      const fromY = state.player.gy;
      state.player.px = (fromX + (state.player.targetGx - fromX) * t) * PIXEL;
      state.player.py = (fromY + (state.player.targetGy - fromY) * t) * PIXEL;
      // 行走动画帧（移动中切换 0/1）
      state.player.frame = Math.floor(state.player.moveProgress * 4) % 2;
    } else {
      state.player.frame = 0;
    }

    // 自动导航
    if (state.player.autoNavigating && !state.player.moving) {
      if (!state.player.pathQueue || state.player.pathQueue.length === 0) {
        state.player.autoNavigating = false;
        // 到达后若有攻击目标且相邻，自动攻击
        if (state.player.attackTarget && state.player.attackTarget.alive) {
          const m = state.player.attackTarget;
          const dx = Math.abs(m.gx - state.player.gx);
          const dy = Math.abs(m.gy - state.player.gy);
          if (dx + dy === 1) {
            faceTowards(m.gx, m.gy);
            combatRound(m);
            if (!m.alive) state.player.attackTarget = null;
          }
        }
      } else {
        const next = state.player.pathQueue[0];
        const dx = next.x - state.player.gx;
        const dy = next.y - state.player.gy;
        // 检查下一格是否有怪物
        const blockingMonster = state.monsters.find(m => m.alive && m.gx === next.x && m.gy === next.y);
        if (blockingMonster) {
          // 怪物挡路：暂停导航，不清空队列，让玩家抉择
          state.player.autoNavigating = false;
          state.player.attackTarget = blockingMonster;
          faceTowards(blockingMonster.gx, blockingMonster.gy);
          var bmDisplay = getMonsterDisplayName(blockingMonster);
          showMessage((window.i18n && window.i18n.t('rpg_msg_blocked_by_monster', { monster: bmDisplay })) || ('前方有 ' + blockingMonster.type + '！攻击(空格)或绕路'), 2, 'rpg_msg_blocked_by_monster', { monster: bmDisplay });
        } else {
          tryMove(dx, dy);
          if (state.player.moving) {
            state.player.pathQueue.shift();
          } else {
            // tryMove 失败但非怪物阻挡（宝箱/出口等），保留队列暂停
            state.player.autoNavigating = false;
          }
        }
      }
    } else if (!state.player.autoNavigating && state.player.attackTarget && !state.player.moving) {
      // 暂停状态下若仍有攻击目标且玩家手动移动了相邻，可选自动攻击
      // 此处保持简单：暂停后需玩家手动操作，不自动恢复
    }
  }

  /**
   * 渲染整个画面。
   */
  function render() {
    // 清屏
    ctx.fillStyle = COLOR.BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 地图
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        drawTile(x, y, state.map[y][x]);
      }
    }

    // 墙上火把（在瓦片之后、宝箱/怪物之前）
    drawTorches();

    // 宝箱
    state.chests.forEach(drawChest);

    // 怪物
    state.monsters.forEach(function (m) { if (m.alive) drawMonster(m); });

    // 玩家（注意 py 加 UI_HEIGHT 偏移）
    drawPlayer(state.player.px, state.player.py + UI_HEIGHT, state.player.facing, state.player.frame);

    // UI 与消息
    drawUI();
    drawMessage();

    // 游戏结束遮罩
    if (state.gameOver) drawGameOver();
  }

  /**
   * 游戏主循环（requestAnimationFrame 回调）。
   */
  function gameLoop(timestamp) {
    if (!state.running) return;
    const dt = Math.min(0.05, (timestamp - state.lastTime) / 1000);
    state.lastTime = timestamp;
    update(dt);
    render();
    state.animationId = requestAnimationFrame(gameLoop);
  }

  // ============================================================
  // 输入 / Input
  // ============================================================

  /**
   * 键盘事件处理：方向键/WASD 移动，空格/J 攻击，R 重置。
   */
  function handleKeyDown(e) {
    if (!canvas) return;
    const key = e.key.toLowerCase();

    // R 键：随时重置并开始
    if (key === 'r') {
      reset();
      if (!state.running) start();
      e.preventDefault();
      return;
    }

    if (!state.running || state.gameOver) return;

    let dx = 0, dy = 0, facing = null;
    if (key === 'arrowup' || key === 'w') { dy = -1; facing = 'up'; }
    else if (key === 'arrowdown' || key === 's') { dy = 1; facing = 'down'; }
    else if (key === 'arrowleft' || key === 'a') { dx = -1; facing = 'left'; }
    else if (key === 'arrowright' || key === 'd') { dx = 1; facing = 'right'; }
    else if (key === ' ' || key === 'j') {
      // 空格 / J：朝面对方向攻击
      tryAttack();
      e.preventDefault();
      return;
    }

    if (facing) {
      // 键盘方向键接管，中断自动导航
      state.player.pathQueue = [];
      state.player.autoNavigating = false;
      state.player.facing = facing;
      tryMove(dx, dy);
      e.preventDefault();
    }
  }

  /**
   * 点击/触屏事件处理：将屏幕坐标转换为网格坐标后启动自动导航。
   * 使用 pointer 事件同时支持鼠标和触屏。
   */
  function onCanvasPointerDown(e) {
    if (!canvas) return;
    e.preventDefault();
    if (!state.running || state.gameOver) return;

    // 屏幕坐标 → canvas 内坐标（考虑 CSS 缩放）
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const localX = (e.clientX - rect.left) * scaleX;
    const localY = (e.clientY - rect.top) * scaleY;

    // canvas 内坐标 → 网格坐标
    const gx = Math.floor(localX / PIXEL);
    const gy = Math.floor((localY - UI_HEIGHT) / PIXEL);

    // 边界检查
    if (gx < 0 || gx >= MAP_W || gy < 0 || gy >= MAP_H) return;

    navigateTo(gx, gy);
  }

  // ============================================================
  // 公共 API / Public API
  // ============================================================

  /**
   * 初始化游戏：绑定 canvas、设置像素渲染、初始化音频、绑定键盘、生成初始地图。
   * @param {HTMLCanvasElement} canvasEl
   */
  function init(canvasEl) {
    canvas = canvasEl;
    if (!canvas) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // CSS 像素化渲染（放大不平滑）
    canvas.style.imageRendering = 'pixelated';
    // 初始化音频（实际发声需用户手势，由 start() 触发 resume）
    initAudio();
    // 绑定键盘
    window.addEventListener('keydown', handleKeyDown);
    // 绑定点击/触屏导航（pointer 同时支持鼠标和触屏）
    canvas.addEventListener('pointerdown', onCanvasPointerDown);
    // 初始化游戏状态并渲染一帧
    reset();
    // 初始化物品栏/装备栏 UI
    if (typeof renderInventory === 'function') renderInventory();
    if (typeof renderEquipment === 'function') renderEquipment();
    if (typeof renderItemDetails === 'function') renderItemDetails();
    // 点击 RPG 侧栏外部时取消选中
    document.addEventListener('click', function (e) {
      const sidePanel = document.querySelector('.rpg-side-panel');
      if (sidePanel && !sidePanel.contains(e.target)) {
        if (state.player.selectedSlot) {
          state.player.selectedSlot = null;
          renderInventory();
          renderEquipment();
          renderItemDetails();
        }
      }
    });
    // Wiki 按钮事件绑定
    const wikiBtn = document.getElementById('btn-rpg-wiki');
    if (wikiBtn) wikiBtn.addEventListener('click', showWiki);
    const wikiCloseBtn = document.getElementById('btn-rpg-wiki-close');
    if (wikiCloseBtn) wikiCloseBtn.addEventListener('click', hideWiki);
  }

  /**
   * 显示 Wiki 文档面板。
   */
  function showWiki() {
    const panel = document.getElementById('rpg-wiki-panel');
    if (panel) {
      panel.classList.remove('hidden');
      // 滚动到顶部
      const content = panel.querySelector('.rpg-wiki-content');
      if (content) content.scrollTop = 0;
    }
  }

  /**
   * 隐藏 Wiki 文档面板。
   */
  function hideWiki() {
    const panel = document.getElementById('rpg-wiki-panel');
    if (panel) panel.classList.add('hidden');
  }

  /**
   * 开始游戏：启动主循环 + BGM（必须在用户手势后调用以激活音频）。
   */
  function start() {
    if (!canvas) return;
    if (state.running) return;
    if (!state.audioContext) initAudio();
    // 恢复 suspended 状态的音频上下文
    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
    state.running = true;
    state.lastTime = performance.now();
    state.animationId = requestAnimationFrame(gameLoop);
    playBGM();
  }

  /**
   * 停止游戏：暂停主循环 + BGM。
   */
  function stop() {
    state.running = false;
    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
      state.animationId = null;
    }
    stopBGM();
  }

  /**
   * 重置游戏到初始状态（第 1 关，等级 1，HP/ATK/DEF 重置）。
   */
  function reset() {
    state.player = {
      gx: 1, gy: 1,
      px: PIXEL, py: PIXEL,
      targetGx: 1, targetGy: 1,
      moving: false, moveProgress: 0,
      facing: 'down', frame: 0,
      pathQueue: [],
      autoNavigating: false,
      hp: 20, maxHp: 20,
      atk: 5, def: 1,
      level: 1, exp: 0, expToNext: 10,
      inventory: [],
      inventoryMax: 16,
      equipment: { leftHand: null, rightHand: null, head: null, body: null, legs: null, feet: null, accessory: null },
      selectedSlot: null,
      attackTarget: null
    };
    state.level = 1;
    state.gameOver = false;
    state.message = (typeof window !== 'undefined' && window.i18n && window.i18n.t('rpg_floor_start')) || '开始地牢冒险! 找到向下走廊进入下一层';
    state.messageKey = 'rpg_floor_start';
    state.messageParams = null;
    state.messageTimer = 3;
    state.animTime = 0;
    generateMap(1);
    if (ctx) render();
    if (typeof renderInventory === 'function') renderInventory();
    if (typeof renderEquipment === 'function') renderEquipment();
    if (typeof renderItemDetails === 'function') renderItemDetails();
  }

  // ============================================================
  // 物品栏/装备栏 DOM 渲染 / Inventory & Equipment DOM Rendering
  // ============================================================

  /**
   * 像素画物品图标绘制（48x48 canvas，每像素 4px = 12x12 网格）。
   */
  function drawItemIcon(canvas, item) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 48, 48);
    const id = (item && item.templateId) || '';
    const P = 4; // 像素大小
    function px(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x * P, y * P, w * P, h * P);
    }
    if (id === 'wooden_sword') {
      // 剑身（纵向，棕色）
      px(5, 1, 2, 8, '#8b4513');
      px(5, 1, 2, 1, '#a0522d'); // 剑尖高光
      // 十字护手
      px(3, 9, 6, 1, '#5a2d0c');
      // 剑柄
      px(5, 10, 2, 2, '#a0522d');
    } else if (id === 'potion_hp_i') {
      // 瓶塞
      px(4, 1, 4, 1, '#8b4513');
      // 瓶颈
      px(5, 2, 2, 1, '#cccccc');
      // 瓶身
      px(3, 3, 6, 6, '#444444'); // 暗色背景
      px(3, 3, 6, 1, '#cccccc'); // 瓶口
      // 红色液体（下半部分）
      px(3, 6, 6, 3, '#ff4500');
      px(3, 6, 6, 1, '#ff6347'); // 液体表面高光
    } else if (id === 'leather_helmet') {
      // 帽顶
      px(3, 2, 6, 1, '#a0522d');
      px(2, 3, 8, 3, '#a0522d');
      // 帽檐
      px(1, 6, 10, 1, '#8b4513');
      px(2, 5, 1, 1, '#a0522d'); // 左侧
      px(9, 5, 1, 1, '#a0522d'); // 右侧
    } else if (id === 'leather_armor') {
      // 胸甲（梯形）
      px(3, 1, 6, 1, '#a0522d'); // 肩部
      px(2, 2, 8, 4, '#a0522d'); // 主体
      px(3, 6, 6, 2, '#8b4513'); // 下摆
      // 肩带
      px(2, 2, 1, 2, '#8b4513');
      px(9, 2, 1, 2, '#8b4513');
    } else if (id === 'leather_leggings') {
      // 两条腿
      px(2, 1, 3, 8, '#a0522d');
      px(7, 1, 3, 8, '#a0522d');
      px(2, 1, 3, 1, '#8b4513'); // 腰带
      px(7, 1, 3, 1, '#8b4513');
    } else if (id === 'leather_boots') {
      // 两只靴子
      px(2, 6, 3, 2, '#a0522d'); // 左靴
      px(1, 8, 4, 1, '#8b4513'); // 左鞋底
      px(7, 6, 3, 2, '#a0522d'); // 右靴
      px(7, 8, 4, 1, '#8b4513'); // 右鞋底
    } else if (id === 'exp_gem_i') {
      // 菱形宝石
      px(5, 1, 2, 1, '#1e90ff');
      px(4, 2, 4, 1, '#1e90ff');
      px(3, 3, 6, 2, '#1e90ff');
      px(4, 5, 4, 1, '#1e90ff');
      px(5, 6, 2, 1, '#1e90ff');
      // 高光
      px(4, 2, 1, 1, '#87ceeb');
      px(4, 3, 1, 1, '#87ceeb');
    } else if (id === 'attack_ring') {
      // 金色环形
      px(3, 3, 6, 1, '#ffd700');
      px(3, 6, 6, 1, '#ffd700');
      px(3, 3, 1, 4, '#ffd700');
      px(8, 3, 1, 4, '#ffd700');
      // 宝石点缀
      px(5, 1, 2, 1, '#ff4500');
      px(5, 2, 2, 1, '#ff6347');
    }
  }

  /**
   * 渲染物品栏 DOM：显示 inventoryMax 个格子，已占用的显示像素画图标/数量。
   * 点击格子选中，再次点击同一格子取消选中，点击其他格子执行交换/移动。
   */
  function renderInventory() {
    const grid = document.getElementById('rpg-inventory');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < state.player.inventoryMax; i++) {
      const slot = document.createElement('div');
      slot.className = 'rpg-slot rpg-inventory-slot';
      slot.setAttribute('data-slot-type', 'inventory');
      slot.setAttribute('data-slot-index', i);
      const item = state.player.inventory[i];
      if (item) {
        slot.classList.add('has-item');
        const iconCanvas = document.createElement('canvas');
        iconCanvas.className = 'slot-icon';
        iconCanvas.width = 48;
        iconCanvas.height = 48;
        slot.appendChild(iconCanvas);
        drawItemIcon(iconCanvas, item);
        if (item.count && item.count > 1) {
          const cnt = document.createElement('span');
          cnt.className = 'count';
          cnt.textContent = item.count;
          slot.appendChild(cnt);
        }
      }
      if (state.player.selectedSlot && state.player.selectedSlot.type === 'inventory' && state.player.selectedSlot.index === i) {
        slot.classList.add('selected');
      }
      slot.addEventListener('click', function (e) {
        e.stopPropagation();
        handleSlotClick('inventory', i);
      });
      grid.appendChild(slot);
    }
  }

  /**
   * 渲染装备栏 DOM：7 个槽位（leftHand/rightHand/head/body/legs/feet/accessory）。
   */
  function renderEquipment() {
    const grid = document.getElementById('rpg-equipment');
    if (!grid) return;
    grid.innerHTML = '';
    const slotKeys = ['leftHand', 'rightHand', 'head', 'body', 'legs', 'feet', 'accessory'];
    const slotI18nKeys = {
      leftHand: 'rpg_slot_leftHand', rightHand: 'rpg_slot_rightHand',
      head: 'rpg_slot_head', body: 'rpg_slot_body',
      legs: 'rpg_slot_legs', feet: 'rpg_slot_feet', accessory: 'rpg_slot_accessory'
    };
    slotKeys.forEach(function (key) {
      const slot = document.createElement('div');
      slot.className = 'rpg-slot rpg-equipment-slot';
      slot.setAttribute('data-slot-type', 'equipment');
      slot.setAttribute('data-slot-key', key);
      const label = document.createElement('span');
      label.className = 'slot-label';
      label.setAttribute('data-i18n', slotI18nKeys[key]);
      label.textContent = window.i18n ? (window.i18n.t(slotI18nKeys[key]) || key) : key;
      slot.appendChild(label);
      const item = state.player.equipment[key];
      if (item) {
        slot.classList.add('has-item');
        const iconCanvas = document.createElement('canvas');
        iconCanvas.className = 'slot-icon';
        iconCanvas.width = 48;
        iconCanvas.height = 48;
        slot.appendChild(iconCanvas);
        drawItemIcon(iconCanvas, item);
      }
      if (state.player.selectedSlot && state.player.selectedSlot.type === 'equipment' && state.player.selectedSlot.key === key) {
        slot.classList.add('selected');
      }
      slot.addEventListener('click', function (e) {
        e.stopPropagation();
        handleSlotClick('equipment', null, key);
      });
      grid.appendChild(slot);
    });
  }

  /**
   * 渲染物品详情面板：显示选中物品的名称/类型/描述/属性，并提供操作按钮。
   */
  function renderItemDetails() {
    const panel = document.getElementById('rpg-item-details');
    if (!panel) return;
    panel.innerHTML = '';
    const sel = state.player.selectedSlot;
    let item = null;
    if (sel) {
      if (sel.type === 'inventory') {
        item = state.player.inventory[sel.index];
      } else if (sel.type === 'equipment') {
        item = state.player.equipment[sel.key];
      }
    }
    if (!item) {
      const hint = document.createElement('p');
      hint.className = 'details-hint';
      hint.setAttribute('data-i18n', 'rpg_details_hint');
      hint.textContent = window.i18n ? (window.i18n.t('rpg_details_hint') || '点击物品查看详情') : '点击物品查看详情';
      panel.appendChild(hint);
      return;
    }
    // 物品名称
    const nameEl = document.createElement('div');
    nameEl.className = 'details-name';
    nameEl.textContent = getItemDisplayName(item);
    nameEl.style.color = item.color || '#fff';
    panel.appendChild(nameEl);
    // 类型
    const typeEl = document.createElement('div');
    typeEl.className = 'details-type';
    typeEl.textContent = getItemTypeDisplayName(item.type);
    panel.appendChild(typeEl);
    // 描述
    var itemDesc = getItemDisplayDesc(item);
    if (itemDesc) {
      const descEl = document.createElement('div');
      descEl.className = 'details-desc';
      descEl.textContent = itemDesc;
      panel.appendChild(descEl);
    }
    // 属性
    const statsEl = document.createElement('div');
    statsEl.className = 'details-stats';
    if (item.atk) {
      const atkSpan = document.createElement('span');
      atkSpan.textContent = 'ATK +' + item.atk;
      atkSpan.style.color = '#ff4500';
      statsEl.appendChild(atkSpan);
    }
    if (item.def) {
      const defSpan = document.createElement('span');
      defSpan.textContent = 'DEF +' + item.def;
      defSpan.style.color = '#1e90ff';
      statsEl.appendChild(defSpan);
    }
    if (item.effect && item.effect.hp) {
      const hpSpan = document.createElement('span');
      hpSpan.textContent = 'HP +' + item.effect.hp;
      hpSpan.style.color = '#ff4500';
      statsEl.appendChild(hpSpan);
    }
    if (item.effect && item.effect.exp) {
      const expSpan = document.createElement('span');
      expSpan.textContent = 'EXP +' + item.effect.exp;
      expSpan.style.color = '#1e90ff';
      statsEl.appendChild(expSpan);
    }
    panel.appendChild(statsEl);
    // 按钮
    const btnRow = document.createElement('div');
    btnRow.className = 'details-buttons';
    if (sel.type === 'inventory') {
      if (item.type === 'consumable') {
        const useBtn = document.createElement('button');
        useBtn.className = 'pixel-btn details-btn';
        useBtn.setAttribute('data-i18n', 'rpg_btn_use');
        useBtn.textContent = window.i18n ? (window.i18n.t('rpg_btn_use') || '使用') : '使用';
        useBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          useItem(item);
          state.player.selectedSlot = null;
          renderInventory();
          renderEquipment();
          renderItemDetails();
        });
        btnRow.appendChild(useBtn);
      } else {
        const equipBtn = document.createElement('button');
        equipBtn.className = 'pixel-btn details-btn';
        equipBtn.setAttribute('data-i18n', 'rpg_btn_equip');
        equipBtn.textContent = window.i18n ? (window.i18n.t('rpg_btn_equip') || '穿戴') : '穿戴';
        equipBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          equipItem(item);
          state.player.selectedSlot = null;
          renderInventory();
          renderEquipment();
          renderItemDetails();
        });
        btnRow.appendChild(equipBtn);
      }
    } else if (sel.type === 'equipment') {
      const unequipBtn = document.createElement('button');
      unequipBtn.className = 'pixel-btn details-btn';
      unequipBtn.setAttribute('data-i18n', 'rpg_btn_unequip');
      unequipBtn.textContent = window.i18n ? (window.i18n.t('rpg_btn_unequip') || '取消佩戴') : '取消佩戴';
      unequipBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        unequipItem(sel.key);
        state.player.selectedSlot = null;
        renderInventory();
        renderEquipment();
        renderItemDetails();
      });
      btnRow.appendChild(unequipBtn);
    }
    panel.appendChild(btnRow);
  }

  /**
   * 处理格子点击交互：选中 / 取消选中 / 交换 / 穿戴 / 卸下。
   */
  function handleSlotClick(type, index, key) {
    const sel = state.player.selectedSlot;
    // 如果没有选中，选中当前格子
    if (!sel) {
      state.player.selectedSlot = (type === 'inventory') ? { type: type, index: index } : { type: type, key: key };
      renderInventory();
      renderEquipment();
      renderItemDetails();
      return;
    }
    // 如果点击的是已选中的格子，取消选中
    if (type === 'inventory' && sel.type === 'inventory' && sel.index === index) {
      state.player.selectedSlot = null;
      renderInventory();
      renderEquipment();
      renderItemDetails();
      return;
    }
    if (type === 'equipment' && sel.type === 'equipment' && sel.key === key) {
      state.player.selectedSlot = null;
      renderInventory();
      renderEquipment();
      renderItemDetails();
      return;
    }
    // 情况1：背包 -> 背包（交换）
    if (type === 'inventory' && sel.type === 'inventory') {
      const a = state.player.inventory[sel.index];
      const b = state.player.inventory[index];
      state.player.inventory[sel.index] = b;
      state.player.inventory[index] = a;
      state.player.selectedSlot = null;
      renderInventory();
      renderItemDetails();
      return;
    }
    // 情况2：背包 -> 装备槽（穿戴）
    if (type === 'equipment' && sel.type === 'inventory') {
      const item = state.player.inventory[sel.index];
      if (!item) {
        state.player.selectedSlot = null;
        renderInventory();
        renderEquipment();
        renderItemDetails();
        return;
      }
      // 检查物品槽位是否匹配（weapon 可放 leftHand 或 rightHand）
      const slotMatch = (item.slot === key) || (item.type === 'weapon' && (key === 'leftHand' || key === 'rightHand') && (item.slot === 'leftHand' || item.slot === 'rightHand'));
      if (!slotMatch) {
        showMessage((window.i18n && window.i18n.t('rpg_msg_cannot_equip_slot')) || '无法装备到此槽位', 1.5, 'rpg_msg_cannot_equip_slot');
        state.player.selectedSlot = null;
        renderInventory();
        renderEquipment();
        renderItemDetails();
        return;
      }
      // 从背包移除
      state.player.inventory.splice(sel.index, 1);
      // 旧装备回到背包原位置
      const old = state.player.equipment[key];
      if (old) {
        state.player.inventory.splice(sel.index, 0, old);
      }
      state.player.equipment[key] = item;
      var slotItemDisplay = getItemDisplayName(item);
      showMessage((window.i18n && window.i18n.t('rpg_msg_equip_item', { name: slotItemDisplay })) || ('装备: ' + item.name), 1.5, 'rpg_msg_equip_item', { name: slotItemDisplay });
      state.player.selectedSlot = null;
      renderInventory();
      renderEquipment();
      renderItemDetails();
      return;
    }
    // 情况3：装备槽 -> 背包（卸下到指定格子）
    if (type === 'inventory' && sel.type === 'equipment') {
      const item = state.player.equipment[sel.key];
      if (!item) {
        state.player.selectedSlot = null;
        renderInventory();
        renderEquipment();
        renderItemDetails();
        return;
      }
      const targetItem = state.player.inventory[index];
      if (targetItem) {
        // 交换：背包物品装备到装备槽，装备槽物品到背包
        const slotMatch = (targetItem.slot === sel.key) || (targetItem.type === 'weapon' && (sel.key === 'leftHand' || sel.key === 'rightHand'));
        if (!slotMatch) {
          showMessage((window.i18n && window.i18n.t('rpg_msg_swap_type_mismatch')) || '无法交换：类型不匹配', 1.5, 'rpg_msg_swap_type_mismatch');
          state.player.selectedSlot = null;
          renderInventory();
          renderEquipment();
          renderItemDetails();
          return;
        }
        state.player.equipment[sel.key] = targetItem;
        state.player.inventory[index] = item;
      } else {
        // 直接卸下到空格子
        state.player.inventory[index] = item;
        state.player.equipment[sel.key] = null;
      }
      state.player.selectedSlot = null;
      renderInventory();
      renderEquipment();
      renderItemDetails();
      return;
    }
    // 情况4：装备槽 -> 装备槽（不支持，取消选中）
    if (type === 'equipment' && sel.type === 'equipment') {
      state.player.selectedSlot = null;
      renderInventory();
      renderEquipment();
      renderItemDetails();
      return;
    }
  }

  return {
    init: init,
    start: start,
    stop: stop,
    reset: reset
  };
})();