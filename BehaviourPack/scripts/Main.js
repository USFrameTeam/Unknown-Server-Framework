import { ItemStack, world, system } from "@minecraft/server";
import * as mc from "@minecraft/server";
import * as t from "./text.js";
import { btnBar, infoBar, arrayEditor } from "./ui.js";
import { ui_icon, usf_config, data_format, pictures } from "./data.js";

var config = {};
var dictionary = {};
var fixed_texts = {
  ZN: {},
  ZW: {}
};
var vars = {};

//获取3个维度
var overworld;
var end;
var nether;
var dimensions;
system.run(() => {
  overworld = world.getDimension("minecraft:overworld");
  nether = world.getDimension("minecraft:nether");
  end = world.getDimension("minecraft:the_end");

  //给予三个维度名字
  overworld.name = get_text("overworld.name");
  end.name = get_text("end.name");
  nether.name = get_text("nether.name");
  dimensions = [overworld, nether, end];
});

const version_code = "0.7.10S";
const version_text = `欢迎使用无名氏服务器框架\n插件版本:${version_code}\n作者：EarthDLL(USFrameTeam)，感谢所有社区贡献者的贡献`;

//命名空间
const namespace = "usfV2:";

var has_owner = false;
var last_id = Date.now();
var reset_boards = [];
var cache = {
  time: 0,
};
var limit = {};
var events = {};
var score_config = {};
var tag_groups = [];
var tran_info = {
  weather: "",
};
var lock_config = [];
var ops = [];
var command_set = [];
var reloaded = false;
var item_count = 0;
var id_names = {};
var lands = {
  min: [],
  max: [],
  ids: []
};
var logs = [];
var log_config = {
  able: false,
  time: Date.now(),
  server: true
};
var ids = [];
var chests = [];
var global_goods = [];
var groups = [];
var group_mess = {};
var id_player = {};
var public_pos = [];
var share_pos = [];
var world_pos = [];
var sign = {};
var chest = {};
var white_words = [];
var log_info = {
  "bb": {},
  "pb": {}
};

//注册事件与任务
world.afterEvents.entityHurt.subscribe(afterEntityHurt);
world.afterEvents.itemUse.subscribe(afteritemUse);
world.afterEvents.entityDie.subscribe(afterEntityDie);
world.beforeEvents.entityRemove.subscribe(beforeEntityRemove);
world.afterEvents.playerDimensionChange.subscribe(afterPlayerDimensionChange);
world.afterEvents.entityHitEntity.subscribe(afterEntityHitEntity);
world.beforeEvents.explosion.subscribe(beforeExplosion);
world.beforeEvents.chatSend.subscribe(beforeChatSend);
world.afterEvents.playerGameModeChange.subscribe(afterPlayerGameModeChange);
world.beforeEvents.playerLeave.subscribe(beforePlayerLeave);
world.afterEvents.playerInteractWithBlock.subscribe(afterPlayerInteractWithBlock);
world.afterEvents.playerSpawn.subscribe(playerSpawn);
world.beforeEvents.playerInteractWithBlock.subscribe(beforePlayerInteractWithBlock);
world.beforeEvents.playerInteractWithEntity.subscribe(beforePlayerInteractWithEntity);
world.afterEvents.playerPlaceBlock.subscribe(afterBlockPlace);
world.beforeEvents.playerPlaceBlock.subscribe(beforeBlockPlace);
world.beforeEvents.itemUse.subscribe(beforeItemUse);
world.afterEvents.playerBreakBlock.subscribe(afterBlockBreak);
world.beforeEvents.playerBreakBlock.subscribe(beforeBlockBreak);
world.afterEvents.entitySpawn.subscribe(afterEntitySpawn);
world.afterEvents.worldLoad.subscribe(worldInitializeEvent);
world.afterEvents.weatherChange.subscribe(afterWeatherChanged);
world.afterEvents.gameRuleChange.subscribe(afterGameRuleChange);
system.afterEvents.scriptEventReceive.subscribe(scriptEventReceive, {
  "namespaces": ["usf"]
});

import("@minecraft/server-net").then((http) => {
  push_text("log.enable", "当前日志功能可用！请开启日志服务器！");
  log(get_text("log.enable"), [], "tip", 1);
  log_config.able = true;

  const createRequest = () => {
    const request = new http.HttpRequest(config.log.address);
    request.timeout = 10;
    request.method = "Get";
    return request;
  };

  const processBatchedLogs = () => {
    if (!log_config.server) {
      if (Date.now() - log_config.time > config.log.down * 1000) {
        log_config.server = true;
      } else {
        return;
      }
    }

    if (logs.length === 0) return;

    const BATCH_SIZE = 10;

    for (let i = 0; i < logs.length; i += BATCH_SIZE) {
      const batch = logs.slice(i, i + BATCH_SIZE);

      try {
        const request = createRequest();
        request.addHeader("usf", to_json(batch));

        http.http.request(request)
          .then((response) => {
            if (response.body !== "usf") {
              log_config.server = false;
              log_config.time = Date.now();
            }
          })
          .catch(() => { });
      } catch (e) { }
    }

    logs = [];
  };

  const INTERVAL_TICKS = 20;
  system.runInterval(processBatchedLogs, INTERVAL_TICKS);
}).catch(() => { });

var chat_board = {};

system.chat_board = system.runInterval(() => {
  if (!config.chat_board.able) {
    return;
  }

  const board = world.scoreboard.getObjective("chat") ||
    world.scoreboard.addObjective("chat", "聊天计分板");

  chat_board = {};

  const players = world.getAllPlayers();

  for (const player of players) {
    const score = String(get_score(board, player));

    if (!chat_board[score]) {
      chat_board[score] = [];
    } else {
      chat_board[score] = to_array(chat_board[score]);
    }

    chat_board[score].push(player);
  }
}, 20);

system.tag_groups = system.runInterval(() => {
  const players = world.getAllPlayers();

  for (const player of players) {
    if (player.hasTag("reload_lock_item")) {
      player.removeTag("reload_lock_item");
      reset_lock_item(player);
    }

    const isSleeping = player.isSleeping;
    player.last_sleep = to_bool(player.last_sleep, false);
    if (isSleeping && !player.last_sleep) {
      emitEvent(player, "sleep");
    }
    player.last_sleep = isSleeping;

    if (config.mini.land_tag && is_string(player.in_land)) {
      const playerInLand = player.in_land;
      const isInLand = playerInLand !== "";

      const tags = player.getTags();
      for (const t of tags) {
        if (t.includes("land.") && (!t.includes(playerInLand) || !isInLand)) {
          player.removeTag(t);
        }
      }

      if (isInLand) {
        player.addTag("land." + playerInLand);
      }
    }

    const currentTagLength = player.getTags().length;
    if (to_number(player.tag_length, 0) !== currentTagLength) {
      player.tag_length = currentTagLength;

      for (const tagGroup of tag_groups) {
        const tagOptions = tagGroup.split(";");

        const hasCurrentTag = un(player.current_tag);
        if (hasCurrentTag && !player.hasTag(player.current_tag)) {
          player.current_tag = undefined;
        }

        let nextTag = "";
        for (const tag of tagOptions) {
          if (player.hasTag(tag) && tag !== player.current_tag) {
            nextTag = tag;
            break;
          }
        }

        if (!un(player.current_tag)) {
          if (nextTag !== "") {
            player.removeTag(player.current_tag);
            player.addTag(nextTag);
            player.current_tag = nextTag;
          }
        } else {
          if (nextTag === "") {
            const defaultTag = tagOptions[0];
            player.current_tag = defaultTag;
            player.addTag(defaultTag);
          } else {
            player.current_tag = nextTag;
          }
        }
      }
    }
  }
}, 8);

// tran_text的全局内容更新(每2s)
var system_ids = system_ids || {};
system_ids.tran = system.runInterval(() => {
  try {
    const playerNames = [];
    const unsleepingPlayers = [];
    const players = world.getAllPlayers();

    const playerCount = players.length;

    for (const player of players) {
      const playerName = player.name;
      playerNames.push(playerName);

      if (!player.isSleeping) {
        unsleepingPlayers.push(playerName);
      }
    }

    tran_info.list = playerNames.join(',');
    tran_info.unsleep = unsleepingPlayers.join(',');

    tran_info.alltime = `${Math.round(system.currentTick / 20)}s`;
    tran_info.worldspawn = pos_string(world.getDefaultSpawnLocation());
    tran_info.count = String(playerCount);
    tran_info.items = String(item_count);

    const d = get_date_object_China_time();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const date = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');

    tran_info.date = `${d.getFullYear()}.${month}.${date}`;
    tran_info.time = `${hours}:${minutes}:${seconds}`;

    try {
      const scoreboards = {};

      for (const boardConfig of reset_boards) {
        const boardName = boardConfig[0];
        const defaultScore = boardConfig[1];

        if (!scoreboards[boardName]) {
          scoreboards[boardName] = world.scoreboard.getObjective(boardName);
        }

        const board = scoreboards[boardName];

        if (board) {
          for (const player of players) {
            if (player.scoreboardIdentity) {
              try {
                const score = board.getScore(player);
                if (score === undefined) {
                  board.setScore(player, defaultScore);
                }
              } catch (err) {
                try {
                  board.setScore(player, defaultScore);
                } catch (innerErr) { }
              }
            }
          }
        }
      }
    } catch (err) { }
  } catch (err) { }
}, 40);

system_ids.board = system.runInterval(() => {
  if (!config.copy_boards || config.copy_boards === "") {
    return;
  }

  const players = world.getAllPlayers();
  const boardIds = config.copy_boards.split(";");

  for (const id of boardIds) {
    const sourceBoard = world.scoreboard.getObjective(id);

    if (sourceBoard) {
      const targetBoardId = id + "_";

      let targetBoard = world.scoreboard.getObjective(targetBoardId);
      if (!targetBoard) {
        targetBoard = world.scoreboard.addObjective(targetBoardId, sourceBoard.displayName);
      }

      try {
        overworld.runCommand(`scoreboard players reset * ${targetBoardId}`);
      } catch (err) { }

      for (const player of players) {
        try {
          if (sourceBoard.hasParticipant(player)) {
            const score = sourceBoard.getScore(player);
            targetBoard.setScore(player, score);
          }
        } catch (err) { }
      }
    }
  }
}, 10);

system_ids.particle = system.runInterval(() => {
  const players = world.getAllPlayers();

  for (const player of players) {
    if (get_op_level(player) > 0) {
      const handItem = get_player_hand_item(player);

      if (handItem && handItem.typeId === "minecraft:wooden_axe") {
        const chosenBlocks = to_array(player.chosen_blocks);
        if (chosenBlocks && chosenBlocks.length > 0) {
          for (const block of chosenBlocks) {
            if (block) {
              show_range(block, block, block.dimension);
            }
          }
        }
        setActionBar(player, "§e[小木斧]潜行下单击方块打开操作面板");
      }
    }

    const playerLanding = player.landing;
    if (playerLanding && playerLanding.mode === 1) {
      setActionBar(player, get_text("action.land"));

      const landingPoints = playerLanding.points;
      if (is_array(landingPoints) && landingPoints.length === 2 &&
        landingPoints[0] && landingPoints[1] &&
        landingPoints[0].location && landingPoints[1].location) {
        show_range(landingPoints[0].location, landingPoints[1].location, player.dimension);
      }
    }
  }
}, 35);

system_ids.lo = system.runInterval(() => {
  if (!config.log.able || !array_has(config.log.allow, "lo")) {
    return;
  }

  const players = world.getAllPlayers();

  if (players.length === 0) {
    return;
  }

  for (const player of players) {
    try {
      const playerPos = get_block_pos_di(player);
      const playerPath = get_player_path(player);

      server_log(0, `Location:${playerPos}`, playerPath);
    } catch (err) { }
  }
}, 20 * 60);

system_ids.tag = system.runInterval(() => {
  const PREFIX = "usf.";
  const PREFIX_LENGTH = PREFIX.length;

  const players = world.getAllPlayers();

  for (const player of players) {
    const tags = player.getTags();
    const tagsToRemove = [];

    for (const tag of tags) {
      if (!tag.startsWith(PREFIX)) continue;

      const colonIndex = tag.indexOf(":");
      if (colonIndex === -1) continue;

      const typeWithText = tag.slice(PREFIX_LENGTH);
      const type = typeWithText.slice(0, colonIndex - PREFIX_LENGTH);
      const text = typeWithText.slice(colonIndex - PREFIX_LENGTH + 1);

      switch (type) {
        case "tag":
          set_chat_tag(player, (text === "Reset") ? "" : text);
          break;
      }

      tagsToRemove.push(tag);
    }

    for (const tagToRemove of tagsToRemove) {
      player.removeTag(tagToRemove);
    }
  }
}, 5 * 20);

var follow_index = 0;
system_ids.follow = system.runInterval(() => {
  follow_index = (follow_index + 1) % 15;
  const shouldTeleport = follow_index === 0;

  const players = world.getAllPlayers();
  for (const player of players) {
    if (!is_object(player.follow)) continue;

    const targetPlayer = player.follow.player;

    if (!player.follow.player.isValid) {
      reset_player_follow(player);
      return;
    }

    player.addEffect("night_vision", 600);

    const targetDimension = targetPlayer.dimension;
    const cameraEaseOptions = { easeTime: 0.2 };

    switch (player.follow.type) {
      case 0:
        const headLoc = targetPlayer.getHeadLocation();
        const viewDir = targetPlayer.getViewDirection();
        const cameraLoc = {
          x: headLoc.x - viewDir.x * 3,
          y: headLoc.y + 4,
          z: headLoc.z - viewDir.z * 3
        };

        if (shouldTeleport) {
          tp_entity(player, targetDimension, cameraLoc.x, -10000, cameraLoc.z);
        }

        player.camera.setCamera("usf:example_player_effects", {
          location: cameraLoc,
          facingEntity: targetPlayer,
          easeOptions: cameraEaseOptions
        });
        break;

      case 1:
        const playerLoc = player.location;
        const cameraLoc2 = {
          x: playerLoc.x,
          y: playerLoc.y - (-10000),
          z: playerLoc.z
        };

        if (shouldTeleport && player.dimension.id !== targetDimension.id) {
          const targetLoc = targetPlayer.location;
          tp_entity(
            player,
            targetDimension,
            targetLoc.x,
            -10000 + targetLoc.y,
            targetLoc.z
          );
        }

        player.camera.setCamera("usf:example_player_effects", {
          location: cameraLoc2,
          rotation: player.getRotation(),
          easeOptions: cameraEaseOptions
        });
        break;
    }
  }
}, 5);

system_ids.second = system.runInterval(() => {
  const players = world.getAllPlayers();
  for (const player of players) {
    player.block_places = 0;
  }

  if (config.other.online !== "") {
    const ids = config.other.online.split(";").filter(id => id !== "");

    for (const id of ids) {
      try {
        const ob = world.scoreboard.getObjective(id);
        if (!un(ob)) {
          const backupId = id + "_";
          const nob = world.scoreboard.getObjective(backupId) ||
            world.scoreboard.addObjective(backupId, ob.displayName);

          overworld.runCommand(`scoreboard players reset * "${backupId}"`);

          const participants = ob.getParticipants();
          for (const p of participants) {
            try {
              const entity = p.getEntity();
              if (!un(entity)) {
                nob.setScore(p, ob.getScore(p));
              }
            } catch { }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  const batQuery = {
    type: "bat",
    tags: ["Float"]
  };

  const getData = get_data;
  const toObject = to_object;
  const parseJson = parse_json;
  const isString = is_string;
  const tpEntity = tp_entity;
  const getDimension = get_di;

  for (const dimension of dimensions) {
    const bats = dimension.getEntities(batQuery);

    for (const bat of bats) {
      bat.nameTag = tran_text(null, getData("text", bat));

      const locationData = getData("lo", bat);
      if (locationData) {
        const location = toObject(parseJson(locationData));

        if (isString(location.di)) {
          tpEntity(
            bat,
            getDimension(location.di),
            location.x,
            location.y,
            location.z
          );
        }
      }
    }
  }
}, 20);

var ids = [];
system_ids.timer = system.runInterval(() => {
  if (!config.timer) return;

  try {
    const board = world.scoreboard.getObjective(config.timer);
    if (un(board)) return;

    const participants = board.getParticipants();

    const idSet = new Set(ids);

    for (const participant of participants) {
      const participantId = participant.id;
      const score = get_score(board, participant);

      if (idSet.has(participantId)) {
        if (score >= 1) {
          board.setScore(participant, score + 1);
        } else if (score !== -2) {
          ids = ids.filter(id => id !== participantId);
          board.setScore(participant, -1);
        }
      } else {
        if (score >= 0) {
          board.setScore(participant, score - 1);
        } else if (score === -2) {
          ids.push(participantId);
          board.setScore(participant, 1);
        }
      }
    }
  } catch (err) { }
}, 20);

system_ids.land_test = system.runInterval(() => {
  const players = world.getAllPlayers();

  for (const player of players) {
    const playerDimension = player.dimension;
    const playerLocation = player.location;

    const land = get_land_by_pos(playerDimension, playerLocation);
    const landName = land.name;
    const landId = land.id;
    const isInLand = is_string(landName);
    const playerInLand = player.in_land;
    const isPublicLand = is_bool(land.public);

    let selectedItem;
    try {
      selectedItem = player.slots.getItem(player.selectedSlotIndex);
    } catch (e) { return; }
    const itemTypeId = !un(selectedItem) ? selectedItem.typeId : "";

    if (isInLand) {
      if (playerInLand !== landId) {
        server_log(0, 'In Land :' + String(landName) + `(${get_name_by_id(land.creater)})`, get_player_path(player));
        player.in_land = landId;
      }

      let text = "";

      if (array_has(config.cd_items, itemTypeId) && !isPublicLand) {
        if (config.other.other_mod_support && player.getGameMode() === "survival") {
          player.setGameMode("Adventure");
        }
        text = `§e领地名称:${landName}\n领地主:${(isPublicLand ? "公共领地" : get_name_by_id(land.creater))}\n领地ID:${landId}`;
      } else {
        const memberLevel = land_member_level(player, land);

        if (memberLevel >= 1) {
          if (config.other.other_mod_support && player.getGameMode() === "adventure") {
            player.setGameMode("Survival");
          }
          text += get_text(`land.${memberLevel}`);
        } else {
          if (config.other.other_mod_support) {
            player.setGameMode("Adventure");
          }
          text += get_text("land.0");
        }

        text += config.land.show.replaceAll("/name", (isPublicLand ? "公共领地" : get_name_by_id(land.creater)));

        if (land.wel !== "") {
          text += "\n§r" + land.wel;
        } else if (isPublicLand) {
          text = "";
        }
      }

      if (text !== "" && Date.now() - to_number(player.last_warn, 0) > 1500) {
        setActionBar(player, text);
      }
    }
    else if (playerInLand !== "") {
      player.in_land = "";
      if (config.other.other_mod_support && player.getGameMode() === "adventure") {
        player.setGameMode("Survival");
      }
      setActionBar(player, ` `);
    }
  }
}, 5);

system_ids.name = system.runInterval(() => {
  const players = world.getAllPlayers();
  for (const player of players) {
    change_player_name(player);
  }
}, 40);

system_ids.chest_log = system.runInterval(() => {
  const signPositions = Object.keys(sign);
  for (const pos of signPositions) {
    const signData = sign[pos];
    const block = signData.block;
    let record = false;

    try {
      if (block.typeId === signData.id) {
        const entities = block.dimension.getEntities({
          location: block.location,
          maxDistance: 6,
          type: "player"
        });
        const noPlayersNearby = !is_array(entities) || entities.length === 0;

        if (noPlayersNearby) {
          record = true;
        }

        const com = block.getComponent("minecraft:sign");
        signData.now = [com.getText("Front"), com.getText("Back")];
      } else {
        record = true;
      }
    } catch (err) {
      record = true;
    }

    if (record) {
      for (let i = 0; i < signData.now.length; i++) {
        if (signData.before[i] !== signData.now[i]) {
          server_log(0,
            `Sign Change${pos}:\nFrom:${signData.before[i]}\nTo:${signData.now[i]}`,
            "Sign"
          );
        }
      }
      delete sign[pos];
    }
  }

  const chestPositions = Object.keys(chest);
  for (const pos of chestPositions) {
    const chestData = chest[pos];
    const block = chestData.block;
    let shouldClose = false;

    try {
      if (block.typeId !== chestData.typeId) {
        shouldClose = true;
      } else {
        const entities = block.dimension.getEntities({
          location: block.location,
          maxDistance: 6,
          type: "player"
        });
        const noPlayersNearby = !is_array(entities) || entities.length === 0;

        if (noPlayersNearby) {
          const items = chestData.items;
          const newItems = {};
          const com = block.getComponent("minecraft:inventory").container;

          for (let i = 0; i < com.size; i++) {
            const item = com.getItem(i);
            if (!un(item)) {
              const itemId = no_minecraft(item.typeId);
              newItems[itemId] = (newItems[itemId] || 0) + item.amount;
            }
          }

          let text = `${no_minecraft(block.typeId)}${pos} Close:\nPlayers:`;
          text += chestData.players.join(",");
          text += "\nChanges:";

          const keys = [...new Set([...Object.keys(items), ...Object.keys(newItems)])];
          for (const k of keys) {
            const oldAmount = items[k] || 0;
            const newAmount = newItems[k] || 0;
            const diff = newAmount - oldAmount;
            text += `${k}(${diff});`;
          }

          server_log(0, text, "Chest");
          delete chest[pos];
        }
      }
    } catch (err) {
      shouldClose = true;
    }

    if (shouldClose) {
      let text = `${no_minecraft(block.typeId)}${pos} Close : No Data\nPlayers:`;
      text += chestData.players.join(",");
      server_log(0, text, "Chest");
      delete chest[pos];
    }
  }
}, 1 * 20);

system_ids.long_log = system.runInterval(() => {
  if (config.log.able === false || log_config.able === false) {
    log_info = {
      bb: {},
      pb: {}
    }
    return;
  }

  const processLogs = (logType, actionPrefix) => {
    const logs = log_info[logType];
    const playerNames = Object.keys(logs);

    for (let i = 0; i < playerNames.length; i++) {
      const name = playerNames[i];
      const blockIds = Object.keys(logs[name]);

      const playerPath = get_player_path({ name: name });

      for (let j = 0; j < blockIds.length; j++) {
        const id = blockIds[j];
        const blocks = logs[name][id];

        const blockCount = blocks.length;

        const posArray = [actionPrefix, id, "*", String(blockCount)];

        for (let k = 0; k < blockCount; k++) {
          posArray.push(blocks[k]);
        }

        const text = posArray.join("");

        server_log(0, text, playerPath);
      }
    }
  };

  processLogs("bb", "Break ");
  processLogs("pb", "Place ");

  log_info = {
    bb: {},
    pb: {}
  };
}, 30 * 20);

system.group_mess = system.runInterval(() => {
  const groupIds = Object.keys(group_mess);

  if (groupIds.length === 0) {
    return;
  }

  for (let i = 0; i < groupIds.length; i++) {
    const g_id = groupIds[i];
    const g = get_group(g_id);

    if (is_group(g)) {
      const currentMessages = group_mess[g_id];
      const currentLength = currentMessages.length;

      if (currentLength > 0) {
        const newLength = g.message.length + currentLength;

        if (newLength <= 50) {
          g.message = g.message.concat(currentMessages);
        } else {
          const keepOriginal = Math.max(0, 50 - currentLength);

          if (keepOriginal > 0) {
            g.message = g.message.slice(0, keepOriginal).concat(
              currentMessages.slice(0, 50 - keepOriginal)
            );
          } else {
            g.message = currentMessages.slice(0, 50);
          }
        }

        save_group(g);
      }
    }
  }
  group_mess = {};
}, 20 * 30);

system_ids.time = system.runInterval(() => {
  if (!config.time.able) {
    return;
  }

  let time, time_show;
  const timeType = config.time.type;
  const shouldShowTime = config.time.show;

  if (un(world.scoreboard.getObjective("time"))) {
    world.scoreboard.addObjective("time", "时间");
  }
  time = world.scoreboard.getObjective("time");

  if (un(world.scoreboard.getObjective("time_show"))) {
    const displayName = timeType === 0 ? "游戏时间/秒" : "游戏时间/分钟";
    world.scoreboard.addObjective("time_show", displayName);
  }
  time_show = world.scoreboard.getObjective("time_show");

  const allPlayers = world.getAllPlayers();
  const validPlayers = [];

  for (let i = 0; i < allPlayers.length; i++) {
    const player = allPlayers[i];
    if (!un(player.scoreboardIdentity)) {
      validPlayers.push(player);
    }
  }

  if (timeType === 0) {
    for (let i = 0; i < validPlayers.length; i++) {
      time.addScore(validPlayers[i], 1);
    }
  } else if (timeType === 1) {
    cache.time = (cache.time || 0) + 1;
    if (cache.time % 60 === 0) {
      for (let i = 0; i < validPlayers.length; i++) {
        time.addScore(validPlayers[i], 1);
      }
    }
  }

  if (shouldShowTime) {
    world.scoreboard.setObjectiveAtDisplaySlot("List", {
      objective: time_show,
    });

    const participants = time_show.getParticipants();
    for (let i = 0; i < participants.length; i++) {
      time_show.removeParticipant(participants[i]);
    }

    for (let i = 0; i < validPlayers.length; i++) {
      const player = validPlayers[i];
      const currentScore = to_number(time.getScore(player), 0);
      time_show.setScore(player, currentScore);
    }
  }
}, 20);

function afterGameRuleChange(event) {
  if (!config.rule.able) {
    return;
  }

  const rules = to_object(parse_json(config.rule.data));

  if (un(rules[event.rule]) || rules[event.rule] === event.value) {
    return;
  }

  const ruleHandlers = {
    "commandBlocksEnabled": () => world.gameRules.commandBlocksEnabled = rules[event.rule],
    "doImmediateRespawn": () => world.gameRules.doImmediateRespawn = rules[event.rule],
    "keepInventory": () => world.gameRules.keepInventory = rules[event.rule],
    "mobGriefing": () => world.gameRules.mobGriefing = rules[event.rule],
    "pvp": () => world.gameRules.pvp = rules[event.rule],
    "showCoordinates": () => world.gameRules.showCoordinates = rules[event.rule],
    "tntExplodes": () => world.gameRules.tntExplodes = rules[event.rule],
    "doMobSpawning": () => world.gameRules.doMobSpawning = rules[event.rule]
  };

  if (ruleHandlers[event.rule]) {
    ruleHandlers[event.rule]();
  }
}

function push_text(id, text1, text2) {
  fixed_texts.ZN[id] = text1;
  if (typeof text2 === 'string') {
    fixed_texts.ZW[id] = text2;
  }
  return id;
}

function get_di(id) {
  return world.getDimension(id);
}

function log(text, replacer = [], hint = "", mode = 0) {
  const hintMap = {
    "tip": "§6[提示]§r",
    "info": "§f[信息]§r",
    "error": "§c[错误]§r",
    "warn": "§e[警告]§r",
    "lead": "§7[指引]§r"
  };

  text = format(to_string(text), replacer);

  const hintText = hintMap[hint] || hint;

  const finalText = "§3[USFLog]§r" + hintText + text;

  if (mode !== 1) {
    const opPlayers = world.getAllPlayers().filter(p => get_op_level(p) > 0);
    if (opPlayers.length > 0) {
      chat(finalText, opPlayers, false);
    }
  }

  if (mode !== 0) {
    console.warn(clear_colour(finalText));
  }
}

function get_ban_list() {
  const banData = get_data("ban");
  if (!banData) return [];

  try {
    const parsed = parse_json(banData);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function score_event(player, id, data, count = 1, type = 0) {
  const cmdType = type === 0 ? "add" : "set";
  const countStr = String(count);

  const playerTags = player.getTags ? player.getTags() : [];
  const hasTags = new Set(playerTags);

  for (const tag of Object.keys(score_config)) {
    if (tag === "" || hasTags.has(tag)) {
      const scorePages = score_config[tag];
      if (!scorePages || !scorePages.length) continue;

      const commands = [];
      for (const page of scorePages) {
        if (page.type === id && (page.data === data || page.data === "")) {
          commands.push(`scoreboard players ${cmdType} @s ${page.board} ${countStr}`);
        }
      }

      if (commands.length === 1) {
        entity_command(player, commands[0]);
      } else if (commands.length > 1) {
        for (const cmd of commands) {
          entity_command(player, cmd);
        }
      }
    }
  }
}

function entity_command(entity, command) {
  if (!entity) return;

  try {
    entity.runCommand(command);
  } catch (err) { }
}

function kick(player, reason = "", force = false) {
  if (!force && get_op_level(player) > 0) return;

  if (!player || !player.name) return;

  overworld.runCommand(`kick "${player.name}" ${reason}`);
}

function get_player_path(player) {
  if (!player || !player.name) return "Players/unknown";

  return "Players/" + player.name;
}

function chat(mess, targets = null, tran = true) {
  const players = is_array(targets) ? targets : world.getAllPlayers();

  if (!tran) {
    for (const p of players) {
      if (p && typeof p.sendMessage === 'function') {
        p.sendMessage(mess);
      }
    }
    return;
  }

  for (const p of players) {
    if (p && typeof p.sendMessage === 'function') {
      const new_mess = tran_text(p, mess);
      p.sendMessage(new_mess);
    }
  }
}

function get_owners() {
  const ownersData = get_data("owners");
  const os = ownersData ? to_array(parse_json(ownersData), []) : [];
  has_owner = os.length > 0;
  return os;
}

function player_add_group(player, id) {
  if (!player || !id) return;

  const groupsData = get_data("groups", player);
  const group_ids = groupsData ? to_array(parse_json(groupsData), []) : [];

  if (!group_ids.includes(id)) {
    group_ids.push(id);
    save_data("groups", to_json(group_ids), player);
  }
}

function is_owner(player) {
  if (!player) return false;

  const id = is_object(player) ? get_id(player) : player;

  return get_owners().includes(id);
}

function get_text(id) {
  if (!id) return "";

  const isZW = config.language === 1;

  let text = isZW ? fixed_texts.ZW[id] : dictionary[id];

  if (text === undefined) {
    text = fixed_texts.ZN[id];
  }

  if (text === undefined) {
    return t.get_text(id, to_number(config.language), 0);
  }

  return text;
}

function get_land(id) {
  const data = get_data(`land.${id}`);

  if (!data || data === "") {
    return {};
  }

  try {
    return parse_json(data);
  } catch (e) {
    return {};
  }
}

function save_player_lands(player) {
  if (!player || !player.lands) return;

  save_data("lands", to_json(player.lands), player);
}

function is_between(count, c1, c2) {
  if (c1 === c2) {
    return count === c1;
  }

  const min = Math.min(c1, c2);
  const max = Math.max(c1, c2);

  return count >= min && count <= max;
}

function get_op_level(player) {
  if (!player) return 0;

  if (is_owner(player)) {
    return 2;
  }

  if (is_op(player)) {
    return 1;
  }

  return 0;
}

function is_op(player) {
  if (!player) return false;

  const id = is_object(player) ? get_id(player) : player;

  return ops.includes(id);
}

function tp_entity(entity, di, x, y, z, show = false, keep = false, back = false) {
  if (!entity) return;

  const shouldLog = is_player(entity) && array_has(config.log.allow, "tp");
  const playerPath = shouldLog ? get_player_path(entity) : null;

  system.run(() => {
    if (show && is_player(entity)) {
      show_title(entity, "正在传送...");
    }

    if (back && entity) {
      entity.back_pos = [
        entity.dimension,
        entity.location.x,
        entity.location.y,
        entity.location.z
      ];
    }

    const location = { x, y, z };
    const options = {
      dimension: di,
      keepVelocity: keep
    };

    entity.teleport(location, options);
  });

  if (shouldLog) {
    const blockPos = get_block_pos_di({
      dimension: di,
      location: { x, y, z }
    });
    server_log(0, `TP:${blockPos}`, playerPath);
  }
}

function no_minecraft(text) {
  if (!text) return text;

  return text.replaceAll("minecraft:", "mc:");
}

function show_title(player, text) {
  if (!player || !player.onScreenDisplay) return;

  try {
    player.onScreenDisplay.setTitle(tran_text(player, text));
  } catch (err) { }
}

function is_player(player) {
  if (!player || typeof player !== 'object') {
    return false;
  }

  return player.typeId === "minecraft:player";
}

function save_player_info(player) {
  if (!player || !player.info) return;

  save_data("info", to_json(player.info), player);
}

function get_string_length(str, charset) {
  if (!str || str.length === 0) return 0;

  let total = 0;

  const len = str.length;

  for (let i = 0; i < len; i++) {
    const charCode = str.charCodeAt(i);

    if (charCode <= 0x007f) {
      total += 1;
    } else if (charCode <= 0x07ff) {
      total += 2;
    } else if (charCode <= 0xffff) {
      total += 3;
    } else {
      total += 4;
    }
  }

  return total;
}

function get_name_by_id(id) {
  if (!id) return "离线玩家";

  return id_names[id] !== undefined ? id_names[id] : "离线玩家";
}

function object_override(object, format) {
  if (!object || !format || typeof format !== 'object') return;

  const formatKeys = Object.keys(format);

  for (const cf of formatKeys) {
    const formatValue = format[cf];
    const isFormatNull = formatValue === null;
    const isFormatObject = typeof formatValue === 'object' && !isFormatNull;
    const isFormatArray = Array.isArray(formatValue);

    if (un(object[cf])) {
      if (isFormatNull) {
        object[cf] = null;
      } else if (isFormatArray) {
        object[cf] = [...formatValue];
      } else if (isFormatObject) {
        object[cf] = {};
        object_override(object[cf], formatValue);
      } else {
        object[cf] = formatValue;
      }
    }
    else if (typeof object[cf] === 'object' && !Array.isArray(object[cf]) &&
      object[cf] !== null && isFormatObject) {
      object_override(object[cf], formatValue);
    }
  }
}

function save_config() {
  save_data("config", to_json(config));
}

function get_board_ids() {
  return to_array(parse_json(get_data("board_ids")), [])
}

function get_boards() {
  const boards = {};
  const ids = get_board_ids();

  for (const id of ids) {
    const data = get_data(id);
    if (data) {
      boards[id] = to_object(parse_json(data));
    }
  }
  return boards;
}

function is_group(v) {
  return v && typeof v === 'object' && Object.keys(v).length > 0;
}

function get_group(id) {
  return to_object(parse_json(get_data("group" + id)), {})
}

function save_group(g) {
  save_data("group" + g.id, to_json(g))
  if (!array_has(groups, g.id)) {
    groups.push(g.id)
    save_groups()
  }
}

function save_groups() {
  save_data("group_ids", to_json(groups))
}

function get_random_group_id() {
  const min = 100000;
  const max = 999999;
  let id;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    id = Math.floor(Math.random() * (max - min + 1)) + min;
    attempts++;
    if (attempts > maxAttempts) break;
  } while (is_group(get_group(id)));

  return id;
}

function get_random_land_id() {
  const min = 100000;
  const max = 999999;
  let id;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    id = Math.floor(Math.random() * (max - min + 1)) + min;
    attempts++;
    if (attempts > maxAttempts) break;
  } while (array_has(lands.ids, id));

  return id;
}

const _playerGroupsCache = {};

function get_player_groups(player) {
  const playerId = get_id(player);

  const groupIdsData = get_data("groups", player);
  const groupIds = groupIdsData ? to_array(parse_json(groupIdsData), []) : [];

  const validGroups = [];
  const validGroupIds = [];

  for (const id of groupIds) {
    let g;

    if (typeof get_group === 'function') {
      g = get_group(id);
    } else {
      const groupData = get_data("group" + id);
      g = groupData ? parse_json(groupData) : {};
    }

    if (is_group(g) && (g.creater === playerId || array_has(g.member, playerId))) {
      validGroups.push(g);
      validGroupIds.push(g.id);
    }
  }

  if (validGroupIds.length !== groupIds.length || !arraysEqual(validGroupIds, groupIds)) {
    save_data("groups", to_json(validGroupIds), player);
  }

  _playerGroupsCache[playerId] = validGroups;

  return validGroups;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function reload_all() {
  if (Date.now() - parse_number(get_data("reset")) <= 30000) {
    save_data("owners", "");
    log("最高管理员已被重置!", [], "warn", 2);
  }

  if (un(world.scoreboard.getObjective("usf_data"))) {
    world.scoreboard.addObjective("usf_data", "USF数据");
  }

  dictionary = to_object(parse_json(get_data("dictionary")), {});

  groups = to_array(parse_json(get_data("group_ids")), []);

  public_pos = get_public_pos();
  world_pos = to_array(parse_json(get_data("world_pos")), []);

  lock_config = to_array(parse_json(get_data("lock_items")));

  get_owners();

  reset_boards = to_array(parse_json(get_data("reset_boards")), []);

  lands.min = to_array(parse_json(get_data("lands_min")), []);
  lands.max = to_array(parse_json(get_data("lands_max")), []);
  lands.ids = to_array(parse_json(get_data("lands_ids")), []);

  config = parse_json(get_data("config"));
  object_override(config, usf_config);

  ids = to_array(parse_json(get_data("ids")), []);
  id_names = to_object(parse_json(get_data("id_names")), {});
  ops = to_array(parse_json(get_data("op")), []);
  chests = to_array(parse_json(get_data("chests")), []);
  global_goods = to_array(parse_json(get_data("global_goods")), []);
  tag_groups = to_array(parse_json(get_data("tag_groups")));
  events = to_object(parse_json(get_data("events")));
  command_set = to_array(parse_json(get_data("command_set")));
  score_config = to_object(parse_json(get_data("score_config2")));
  limit = to_object(parse_json(get_data("limit")));

  if (config.timer !== "") {
    overworld.runCommand(`scoreboard players reset * ${config.timer}`);
  }

  white_words = to_array(parse_json(get_data("white_words")), []);
}

function save_generic(key, data) {
  save_data(key, to_json(data));
}

function save_score_config() {
  save_generic("score_config2", score_config);
}

function save_limit() {
  save_generic("limit", limit);
}

function save_events() {
  save_generic("events", events);
}

function save_command_set() {
  save_generic("command_set", command_set);
}

function save_tag_groups() {
  save_generic("tag_groups", tag_groups);
  for (const p of world.getAllPlayers()) {
    p.current_tag = undefined;
  }
}

function save_global_goods() {
  save_generic("global_goods", global_goods);
}

function save_reset_boards() {
  save_generic("reset_boards", reset_boards);
}

function save_lock_config() {
  save_generic("lock_items", lock_config);
}

function setActionBar(player, text, tran = false) {
  const content = tran ? tran_text(player, text) : text;

  try {
    player.onScreenDisplay.setActionBar(content);
  } catch (err) {
  system.run(()=>{
    player.runCommand(`titleraw @s actionbar {"rawtext": [{"text":"${content}"}]}`);
    })
  }
}

function clear_data(id) {
  world.setDynamicProperty(namespace + id);
}

function save_data(id, content, en = null) {
  const target = en === null ? world : en;
  target.setDynamicProperty(namespace + id, content);
}

function get_data(id, en = null) {
  const target = en === null ? world : en;
  const data = target.getDynamicProperty(namespace + id);

  return typeof data === 'string' ? data : "";
}

function get_id(player) {
  if (typeof player.usf_id !== 'string') {
    const id = get_data("id", player);

    if (id === "") {
      if (Date.now() !== last_id) {
        const newId = String(last_id);
        save_data("id", newId, player);
        last_id++;
        player.usf_id = newId;
      }
    } else {
      player.usf_id = id;
    }
  }

  return player.usf_id;
}

function get_block_pos(block) {
  const { x, y, z } = block.location;
  return `(${Math.round(x)},${Math.round(y)},${Math.round(z)})`;
}

function get_block_pos_di(block) {
  const dimensionId = block.dimension.id;

  let prefix = "0:";
  if (dimensionId === "minecraft:nether") {
    prefix = "1:";
  } else if (dimensionId === "minecraft:the_end") {
    prefix = "2:";
  }

  const { x, y, z } = block.location;
  return `(${prefix}${Math.round(x)},${Math.round(y)},${Math.round(z)})`;
}

function get_di_num(di) {
  const dimensionId = di.id;

  if (dimensionId === "minecraft:nether") {
    return "1";
  } else if (dimensionId === "minecraft:the_end") {
    return "2";
  }

  return "0";
}

function get_player_by_id(id) {
  return id_player[id] === undefined ? null : id_player[id];
}

function change_player_name(player) {
  const infoName = to_string(player.info.name);

  if (infoName !== "") {
    player.nameTag = tran_text(player, infoName);
    return;
  }

  if (config.name.able) {
    player.nameTag = tran_text(player, config.name.format);
  }
}

function reset_player_data(player) {
  const playerId = get_id(player);
  const banList = get_ban_list();

  if (banList.includes(String(playerId)) || banList.includes(player.name)) {
    kick(player, "你已被封禁！");
    return;
  }

  const inventoryComponent = player.getComponent("minecraft:inventory");
  const healthComponent = player.getComponent("minecraft:health");

  const playerInfo = parse_json(get_data("info", player));
  const playerLandsData = to_array(parse_json(get_data("lands", player)));
  const storeRecord = parse_json(get_data("store_record", player));

  player.info = playerInfo;
  player.slots = inventoryComponent.container;
  player.lands = [];
  player.store_record = to_object(storeRecord);
  player.health = healthComponent;
  player.last_tp = 0;
  player.landing = {
    points: [],
    mode: 0,
  };
  player.pos = get_player_pos(player);
  player.talk = {
    mode: 0,
    id: ""
  };

  const landsIds = lands.ids;
  player.lands = playerLandsData.filter(id => landsIds.includes(id));

  save_player_lands(player);

  id_player[playerId] = player;

  if (config.tip.able) {
    chat(get_data("tip"), [player], true);
  }

  emitEvent(player, "join");

  if (config.mini.clear_tag) {
    const playerTags = player.getTags();
    for (let i = 0; i < playerTags.length; i++) {
      const tag = playerTags[i];
      if (tag.charAt(0) === '_') {
        player.removeTag(tag);
      }
    }
  }

  change_player_name(player);
  return;
}

function emitEvent(player, type) {
  const eventsList = events[type];
  if (Array.isArray(eventsList)) {
    for (let i = 0; i < eventsList.length; i++) {
      const e = eventsList[i];
      if (e.tag === "" || player.hasTag(e.tag)) {
        run_text_commands(player, e.commands);
      }
    }
  }
}

function run_text_commands(player, text) {
  const commands = to_array(parse_json(text));
  for (let i = 0; i < commands.length; i++) {
    try {
      player.runCommand(commands[i]);
    } catch (err) { }
  }
}

function get_chat_tag(player) {
  const data = get_data("chat_tag", player);
  if (data === "") {
    return config.chat.tag === "" ? player.dimension.name : config.chat.tag;
  }
  return data + "§r";
}

function set_chat_tag(p, tag) {
  save_data("chat_tag", tag === "Reset" ? "" : tag, p);
}

function save_store_record(player) {
  save_data("store_record", to_json(player.store_record), player);
}

function get_player_personal_pos(player) {
  return to_array(parse_json(get_data("pos", player)), []);
}

function get_public_pos() {
  return to_array(parse_json(get_data("public_pos")), []);
}

function save_public_pos() {
  const validPositions = public_pos.filter(p => typeof p.name === 'string');
  save_data("public_pos", to_json(validPositions));
  public_pos = validPositions;
}

function save_world_pos() {
  const validPositions = world_pos.filter(p => typeof p.name === 'string');
  save_data("world_pos", to_json(validPositions));
  world_pos = validPositions;
}

function get_mode(player) {
  const gameMode = player.getGameMode();

  const modeMappings = {
    "Creative": 1,
    "Adventure": 2,
    "Spectator": 3
  };

  return modeMappings[gameMode] || 0;
}

function mode(player, mode) {
  const gameModes = ["Survival", "Creative", "Adventure", "Spectator"];
  const gameMode = gameModes[mode];

  if (gameMode) {
    player.setGameMode(gameMode);
  }
}

//事件

function get_chat_players() {
  return world.getAllPlayers().filter(p => p.info.block === false);
}

function afterEntityDie(event) {
  const entity = event.deadEntity;
  const source = event.damageSource;
  const cause = source.cause;
  const hurt_entity = source.damagingEntity;

  if (entity.typeId === "minecraft:bat" && entity.hasTag("Float")) {
    const bat = entity.dimension.spawnEntity("minecraft:bat", entity.location, {
    spawnEvent : "usf:text"
    }
    );

    const entityData = {
      "lo": get_data("lo", entity),
      "name": get_data("name", entity),
      "text": get_data("text", entity)
    };

    for (const key in entityData) {
      save_data(key, entityData[key], bat);
    }

    if (!bat.hasTag("Float")) {
      bat.addTag("Float");
    }
  }

  if (is_player(entity)) {
    const location = {
      x: entity.location.x,
      y: entity.location.y,
      z: entity.location.z,
      di: entity.dimension
    };
    entity.last_die = location;

    let text = `Killed ${get_block_pos_di(entity)}`;

    if (hurt_entity && !un(hurt_entity)) {
      if (is_player(hurt_entity)) {
        text += ` By ${hurt_entity.name}`;
      }
    }

    text += `(Cause:${cause})`;

    const logConfig = config.log.allow;
    if (logConfig.includes("die")) {
      server_log(0, text, get_player_path(entity));
    }

    emitEvent(entity, "die");
    score_event(entity, "die", "");
  }

  if (hurt_entity && !un(hurt_entity) && is_player(hurt_entity)) {
    emitEvent(hurt_entity, "kill");
    score_event(hurt_entity, "kill", entity.typeId);

    if (entity.matches({
      families: ["monster"]
    })) {
      score_event(hurt_entity, "kill_monster", entity.typeId);
    }

    const logConfig = config.log.allow;
    if (logConfig.includes("kill")) {
      let text = "Kill ";
      text += is_player(entity) ? entity.name : no_minecraft(entity.typeId);
      text += get_block_pos_di(hurt_entity);

      server_log(0, text, get_player_path(hurt_entity));
    }
  }
}

function beforeExplosion(event) {
  const entity = event.source;
  let blocks = event.getImpactedBlocks();

  if (entity && !un(entity) && config.game.creeper && entity.typeId === "minecraft:creeper") {
    event.setImpactedBlocks([]);
    return;
  }

  if (config.land.able) {
    const filteredBlocks = [];
    const impactedBlocks = blocks;

    for (let i = 0; i < impactedBlocks.length; i++) {
      const b = impactedBlocks[i];
      const blockCenter = b.center();
      const l = get_land_by_pos(b.dimension, blockCenter);

      if (!is_string(l.name)) {
        filteredBlocks.push(b);
      }
    }

    blocks = filteredBlocks;
  }

  event.setImpactedBlocks(blocks);
}

function reset_lock_item(player) {
  try {
    const playerSlots = player.slots;
    const slotsSize = playerSlots.size;

    for (let i = 0; i < slotsSize; i++) {
      const item = playerSlots.getItem(i);

      if (item) {
        const lore = item.getLore();

        if (lore.length === 1 && lore[0] === "usf:Lock") {
          playerSlots.setItem(i);
        }
      }
    }

    for (let j = 0; j < lock_config.length; j++) {
      try {
        const items = lock_config[j];
        const slotIndex = items[0];
        const item = playerSlots.getItem(slotIndex);

        if (!un(item)) {
          continue;
        }

        const tag = items.length > 3 ? items[3] : "";
        if (tag !== "" && !player.hasTag(tag)) {
          continue;
        }

        const newItem = new mc.ItemStack(items[1], items[2]);
        newItem.setLore(["usf:Lock"]);
        newItem.lockMode = "slot";
        newItem.keepOnDeath = true;

        playerSlots.setItem(slotIndex, newItem);
      } catch (err) { }
    }
  } catch (err) { }
}

function run_command(player, com) {
  com = com.slice(1) + " ";

  const commands = parseCommandArgs(com);

  if (commands.length < 1) {
    return;
  }

  const cmdName = commands[0];

  if (!array_has(config.commands, cmdName) && cmdName !== "usf") {
    return;
  }

  const commandHandlers = {
    "unland": () => {
      player.landing.mode = 0;
      player.landing.points = [];
      chat("§e[领地系统]已取消创建领地！", [player]);
    },

    "land": () => {
      if (player.landing.points.length === 2) {
        createLandBar(player);
      } else {
        show_title(player, get_text("land.two"));
      }
    },

    "unsleep": () => {
      chat(get_text("unsleep") + `${tran_info.unsleep}`, [player]);
    },

    "home": () => {
      const homes = player.pos.filter(pos => pos.home);

      if (homes.length === 0) {
        chat(get_text("home.none"), [player]);
        return;
      }

      if (homes.length === 1) {
        to_pos(player, homes[0]);
        chat(get_text("home.back"), [player]);
      } else {
        const ui = new btnBar();
        ui.title = get_text("home.select");
        ui.body = get_text("home.select2");
        ui.busy = null;

        ui.btns = homes.map(pos => ({
          text: `[${get_di(pos.di).name}]${pos.name}`,
          icon: pictures[pos.icon],
          op: { "pos": pos },
          func: (op) => {
            to_pos(player, op.pos);
            chat(get_text("home.back"), [player]);
          }
        }));

        ui.show(player);
      }
    },

    "cd": () => {
      cdBar(player);
    },

    "die": () => {
      player.kill();
    },

    "back": () => {
      const die = player.last_die;
      if (!un(die)) {
        tp_entity(player, die.di, die.x, die.y, die.z, true);
      }
    },

    "usf": () => {
      chat(version_text, [player]);
    },

    "op": () => {
      opBar(player);
    },

    "tpr": () => {
      const now = Date.now();
      const canTeleport = config.tp.random_range > 0 &&
        now - player.last_tp > config.tp.down * 1000 &&
        (player.dimension.id !== "minecraft:the_end" || config.tp.random_end === true);

      if (canTeleport) {
        random_tp(player, now);
      } else {
        chat("§e[传送系统]当前无法进行传送！", [player]);
      }
    },

    "tpaccept": () => {
      acceptTPA(player);
    }
  };

  const handler = commandHandlers[cmdName];
  if (handler) {
    handler();
  }
}

function parseCommandArgs(commandStr) {
  const commands = [];
  let isInQuotes = false;
  let lastIndex = 0;
  const length = commandStr.length;

  for (let i = 0; i < length; i++) {
    const char = commandStr.charAt(i);

    if (char === '"') {
      isInQuotes = !isInQuotes;
    }

    if (char === ' ' && !isInQuotes) {
      const part = commandStr.slice(lastIndex, i).replace(/"/g, "");
      if (part) {
        commands.push(part);
      }
      lastIndex = i + 1;
    }
  }

  return commands;
}

function acceptTPA(player) {
  if (un(player.tpa)) {
    chat(get_text("tp.fail"), [player]);
    return;
  }

  const tpaRequest = player.tpa;
  const currentTime = Date.now();
  const goal = tpaRequest.goal;

  if (currentTime < tpaRequest.time) {
    const playerDimension = player.dimension;
    const goalDimension = goal.dimension;
    const playerLocation = player.location;
    const goalLocation = goal.location;

    if (tpaRequest.mode === 1) {
      tp_entity(player, goalDimension, goalLocation.x, goalLocation.y, goalLocation.z, true, false, true);
    } else {
      tp_entity(goal, playerDimension, playerLocation.x, playerLocation.y, playerLocation.z, true, false, true);
    }

    chat("§e[传送系统]正在进行玩家传送", [player, goal]);
  } else {
    chat(get_text("tp.fail"), [player]);
  }
}

function afterEntityHitEntity(event) {
  const hitter = event.damagingEntity;

  if (!is_player(hitter)) {
    return;
  }

  const hitEntity = event.hitEntity;

  if (hitEntity.typeId === "minecraft:npc") {
    const data = get_data("data", hitEntity);

    if (data !== "") {
      event.cancel = true;

      system.run(() => {
        const configData = to_object(parse_json(data));
        showConfigBar(hitter, configData);
      });
    }
  }
}

function chatBoardBar(player, block, creater) {
  if (!config.other.chat_board) {
    chat(get_text("board.diable"), [player]);
    return;
  }

  const container = block.getComponent("minecraft:inventory").container;
  const item = container.getItem(0);

  const content = to_array(parse_json(get_data("content", item)));
  const isOwner = get_id(player) === creater;

  const ui = new btnBar();
  ui.body = content;
  ui.title = get_text("board");

  ui.btns = [{
    text: get_text("board.go"),
    icon: ui_icon.edit,
    func: () => {
      const ui2 = new infoBar();
      ui2.title = get_text("board.new");
      ui2.input("text", get_text("board.content"), get_text("input"), "");

      ui2.cancel = () => {
        chatBoardBar(player, block, creater);
      };

      ui2.show(player, (r) => {
        let text = config.chat.format;
        text = tran_text(player, text)
          .replaceAll("/sender", player.name)
          .replaceAll("/text", r.text);

        content.push(text);
        if (content.length > 100) {
          content.shift();
        }

        const contentJson = to_json(content);
        save_data("content", contentJson, item);
        container.setItem(0, item);

        chatBoardBar(player, block, creater);
      });
    }
  }];

  if (isOwner) {
    ui.btns.push({
      text: get_text("board.clear"),
      icon: ui_icon.rubbish,
      func: () => {
        const emptyContent = [];
        save_data("content", to_json(emptyContent), item);
        container.setItem(0, item);
        chatBoardBar(player, block, creater);
      }
    });
  }

  ui.show(player);
}

// 先这样吧，后面的以后再优化

function beforePlayerInteractWithEntity(event) {
  var player = event.player
  var entity = event.target
  var item = event.itemStack

  if (config.land.able) {
    var land = get_land_by_pos(player.dimension, entity.location)
    if (is_string(land.name)) {
      if (land_member_level(player, land) === 0 && !array_has(to_array(land.other_per), "ie")) {
        event.cancel = true
        land_unable_tip(player)
      }
      if ((land_member_level(player, land) === 1 || land_member_level(player, land) === 2) && !array_has(to_array(land.mem_per), "ie")) {
        event.cancel = true
        land_unable_tip(player)
      }
    }
  }

  if (entity.typeId === "minecraft:npc") {
    var item = get_player_hand_item(player)
    if (!un(item) && item.typeId === "usf:config_file") {
      if (get_op_level(player) > 0) {
        if (!player.isSneaking) {
          save_data("data", get_data("data", item), entity)
          chat("§e[策略文件]界面已绑定到此NPC！", [player])
        } else {
          save_data("data", "", entity)
          chat("§e[策略文件]该NPC已取消绑定页面！", [player])
        }
        event.cancel = true
      }
    } else {
      var data = get_data("data", entity)
      if (data !== "") {
        system.run(() => {
          showConfigBar(player, to_object(parse_json(data)))
        })
        event.cancel = true
      }
    }
  }
}

function land_unable_tip(player) {
  system.run(() => {
    setActionBar(player, "§e你无权在领地内操作")
  })
  player.last_warn = Date.now()
}

function beforePlayerInteractWithBlock(event) {
  var player = event.player
  var block = event.block
  var item = event.itemStack
  if (is_player(player)) {
    if (!un(item)) {
    } else {
      if (player.landing.mode === 1) {
        var can = false
        if (player.landing.points.length === 0) {
          can = true
        } else {
          if (get_block_pos(block) !== get_block_pos(player.landing.points[player.landing.points.length - 1])) {
            can = true
          }
        }
        if (can) {
          system.run(() => { show_title(player, get_text("point.get")) });
          player.landing.points.push({
            location: block.location,
            x: block.x,
            y: block.y,
            z: block.z,
            typeId: block.typeId
          })
          if (player.landing.points.length > 2) {
            player.landing.points.shift()
          }
        }
      }
    }
  };
  for (var t in limit) {
    if (player.hasTag(t)) {
      if (limit[t].ib) {
        if (array_has(limit[t].blocks, block.typeId)) {
          event.cancel = true
          return
        }
      }
      break
    }
  }

  if (config.land.able && !array_has(data_format.allow_blocks, block.typeId)) {
    var land = get_land_by_pos(player.dimension, block.center())
    if (is_string(land.name)) {
      if (land_member_level(player, land) === 0 && !array_has(to_array(land.other_per), "ib")) {
        event.cancel = true
        land_unable_tip(player)
      }
      if ((land_member_level(player, land) === 1 || land_member_level(player, land) === 2) && !array_has(to_array(land.mem_per), "ib")) {
        event.cancel = true
        land_unable_tip(player)
      }
    }
  }

  if (to_number(player.last_in, 0) + 20 < system.currentTick) {
    player.last_in = system.currentTick

    if (block.typeId === "minecraft:lectern") {
      var com = block.getComponent("minecraft:inventory").container
      var b_item = com.getItem(0)
      if (!un(item) && un(b_item)) {
        if (item.typeId === "minecraft:enchanted_book") {
          event.cancel = true
          system.run(() => {
            if (un(com.getItem(0))) {
              player.slots.setItem(player.selectedSlotIndex)
              save_data("creater", get_id(player), item)
              com.setItem(0, item)
            }
          })
          return
        }
      }

      if (!un(b_item)) {
        if (b_item.typeId === "minecraft:enchanted_book") {
          event.cancel = true
          system.run(() => {
            chatBoardBar(player, block, get_data("creater", b_item))
          })
        }
      }
    }

    if (to_string(player.limiting) !== "") {
      if (!array_has(limit[player.limiting].blocks, block.typeId)) {
        limit[player.limiting].blocks.push(block.typeId)
        chat(`§e[管理系统]已录入：${block.typeId}`)
        save_limit()
      }
    }

    if (!un(item)) {
      if (item.typeId === "minecraft:wooden_axe") {
        if (get_op_level(player) > 0) {
          if (player.isSneaking === false) {
            player.chosen_blocks = to_array(player.chosen_blocks)
            player.chosen_blocks.push(block)
            if (player.chosen_blocks.length > 2) {
              player.chosen_blocks = player.chosen_blocks.slice(1, 3)
            }
            setActionBar(player, "§e[小木斧]成功选定方块")

          } else {
            system.run(() => {
              axeBar(player)
            })

          }
        }
      }
    }

    if (!un(item)) {
      if (array_has(config.cd_items, item.typeId)) {
        event.cancel = true
        system.run(() => {
          cdBar(player)
        })
        return
      }
    }

    if (typeof (item) === "object") {
      if (item.typeId === "usf:op") {
        if (get_op_level(player) >= 1) {
          system.run(() => {
            opBar(player)
          })
        }
      }
    }

    if (!un(item)) {
      if (array_has(Object.keys(config.config_item), item.typeId)) {
        event.cancel = true
        system.run(() => {
          if (is_string(config.config_item[item.typeId].chest)) {
            get_store_item(config.config_item[item.typeId].chest, config.config_item[item.typeId].item, (item2) => {
              if (!un(item2)) {
                var data = to_object(parse_json(get_data("data", item2)))
                if (is_string(data.title)) {
                  showConfigBar(player, data, "")
                }
              }
            })
          }
        })
        return
      }
    }

    var slot = get_player_offhand_slot(player)
    if (!un(slot)) {
      if (slot.hasItem()) {
        if (slot.typeId === "usf:config_file") {
          event.cancel = true
          system.run(() => {
            if (player.isSneaking === true) {
              useConfigFileBar(player, block)
            } else {
              editConfigFileBar(player)
            }
          })
          return
        }
      }
    }

    var d = get_data(get_block_pos_id(block))
    if (d !== "") {
      d = to_object(parse_json(d))
      if (is_string(d.chest)) {
        get_store_item(d.chest, d.slot, (item) => {
          if (!un(item)) {
            var data = to_object(parse_json(get_data("data", item)))
            if (is_string(data.title)) {
              system.run(() => {
                showConfigBar(player, data, "")
              })
            }
          }
        })
        return
      }
    } else {
      try {
        var buttom = block.dimension.getBlock({
          x: block.x,
          y: block.y - 1,
          z: block.z
        })
        var com = buttom.getComponent("minecraft:inventory")
        if (!un(com)) {
          var i = com.container.getItem(0)
          if (!un(i)) {
            if (i.typeId === "usf:config_file") {
              var data = to_object(parse_json(get_data("data", i)))
              if (is_string(data.title)) {
                system.run(() => {
                  showConfigBar(player, data, "")
                })
              }
              return
            }
          }
        }
      } catch (err) { }
    }

    if (block.hasTag("text_sign") && config.game.sign) {
      if (Date.now() - to_number(player.last_edit_sign) < 800) {

      } else {
        player.last_edit_sign = Date.now()
        setActionBar(player, get_text("sign.tip"))
        event.cancel = true
      }
    }
  }
}

function axeFillBar(player) {
  var modes = ["", "replace", "outline"]
  var add = ""
  var blocks = player.chosen_blocks

  var ui = new infoBar()
  ui.title = "小木斧"
  ui.options("type", "填充模式", ["全填", "替换", "填充外围"], 0)
  ui.input("re", "替换的方块ID(仅替换时填)", "输入ID", "minecraft:")
  ui.options("id", "填充的方块", ["接下来放置的方块", "空气"], 0)
  ui.show(player, (r) => {
    if (r.type === 1){
      player.dimension.runCommand(`fill ${blocks[0].x} ${blocks[0].y} ${blocks[0].z} ${blocks[1].x} ${blocks[1].y} ${blocks[1].z} ` + r.re + " ")
      chat("§e[小木斧]执行中...", [player])
      }
    else {
      if (r.id === 1) {
        player.dimension.runCommand(`fill ${blocks[0].x} ${blocks[0].y} ${blocks[0].z} ${blocks[1].x} ${blocks[1].y} ${blocks[1].z} air ` + modes[r.type] + " " + add)
        chat("§e[小木斧]执行中...", [player])
      } 
      else {
         player.axe_filling = (`fill ${blocks[0].x} ${blocks[0].y} ${blocks[0].z} ${blocks[1].x} ${blocks[1].y} ${blocks[1].z} {{{{}}}} ` + modes[r.type] + " " + add)
       }
     }
  })
}

function axeStrBar(player) {
  var ui = new infoBar()
  ui.title = "导出为结构"
  ui.input("id", "结构ID", "输入ID", "structure")
  ui.toggle("mode", "保存模式[临时|永久]", false)
  ui.toggle("block", "包含方块", true)
  ui.toggle("entity", "包含实体", true)
  ui.show(player, (r) => {
    world.structureManager.createFromWorld(r.id, player.dimension, player.chosen_blocks[0], player.chosen_blocks[1], {
      includeBlocks: r.block,
      includeEntities: r.entity,
      saveMode: (r.mode) ? "World" : "Memory"
    })
  })
}

function axeBar(player) {
  if (to_array(player.chosen_blocks).length !== 2) {
    setActionBar(player, "§e[小木斧]请选择两个点后继续")
    return
  }
  var ui = new btnBar()
  ui.title = "小木斧"
  ui.body = "小木斧操作面板"
  ui.btns = [{
    text: "填充选区内方块",
    icon: ui_icon.brush,
    func: () => {
      axeFillBar(player)
    }
  },
  {
    text: "生成为结构",
    icon: ui_icon.compass,
    func: () => {
      axeStrBar(player)
    }
  }
  ]

  ui.show(player)
}

function useConfigFileBar(player, block) {
  var item = get_player_offhand_item(player)
  if (un(item)) {
    return
  }

  var data = get_data(get_block_pos_id(block))
  var ui = new btnBar()
  ui.title = "绑定策略文件"
  ui.body = data === "" ? "目前该方块未绑定策略文件！" : "§e该方块已绑定策略文件！"
  if (data === "") {
    ui.btns = [{
      text: "绑定现在的策略文件",
      icon: ui_icon.go,
      func: () => {
        set_store_item(item, (chest, slot) => {
          save_data(get_block_pos_id(block), to_json({
            chest: chest,
            slot: slot
          }))
        })
      }
    }]
  } else {
    ui.btns = [{
      text: "覆盖现在的策略文件",
      icon: ui_icon.brush,
      func: () => {
        set_store_item(item, (chest, slot) => {
          save_data(get_block_pos_id(block), to_json({
            chest: chest,
            slot: slot
          }))
        })
      }
    }, {
      text: "解绑现在的策略文件",
      icon: ui_icon.back,
      func: () => {
        save_data(get_block_pos_id(block), "")
      }
    }]
  }
  ui.show(player)
}

function get_block_pos_id(block) {
  return `${block.dimension.id}.${block.x}.${block.y}.${block.z}`
}

function beforeItemUse(event) {
  var item = event.itemStack
  var player = event.source

  if (item.typeId === "minecraft:fire_charge") {
    if (config.game.fb) {
      system.run(() => {
        if (player.getGameMode() !== "creative") {
          var slot = player.slots.getSlot(player.selectedSlotIndex)
          if (slot.amount === 1) {
            slot.setItem()
          } else {
            slot.amount = slot.amount - 1
          }
        }

        var lo = player.getHeadLocation()
        lo.x += player.getViewDirection().x
        lo.z += player.getViewDirection().z
        var ball = player.dimension.spawnEntity("minecraft:small_fireball", lo)
        ball.is_throw = player
        ball.getComponent("minecraft:projectile").shoot(player.getViewDirection(), {
          uncertainty: false
        })
      })
    }
  }
}

function afterPlayerGameModeChange(event) {
  server_log(0, `GameMode changed:${event.toGameMode}`, get_player_path(event.player))

  if (!config.game.lock) {
    return
  }
  var player = event.player
  if (get_op_level(player) === 0) {
    if (event.toGameMode !== "survival") {
      set_mode(player, 0)
    }
  }
}

function say_stop_talk(player) {
  chat(format("talk.stop", [String(Math.round(get_left_time(player) / 1000))]), [player])
}

function beforeChatSend(event) {
  var sender = event.sender
  var message = event.message
  var format = config.chat.format

  if (message[0] === "+") {
    event.cancel = true
    system.run(() => {
      run_command(sender, message)
    })
    return
  }

  if (config.chat.disable === true) {
    return
  }
  for (var w of white_words) {
    if (message.includes(w)) {
      return
    }
  }

  if (message.length > config.chat.length) {
    message = message.slice(0, config.chat.length)
    message += "..."
  }
  if (config.chat.clear) {
    message = clear_colour(message)
  }
  format = tran_text(sender, format)
  format = format.replaceAll("/sender", sender.name)
  format = format.replaceAll("/text", message)

  event.cancel = true

  if (get_left_time(sender) > 0) {
    say_stop_talk(sender)
    return
  }
  var t = get_chat_players()
  switch (sender.talk.mode) {
    case 0:
      break
    case 1:
      try {
        t = [sender.talk.goal, sender]
        format = "[§e私聊§r]" + format
      } catch (e) {
        sender.talk.mode = 0
        t = []
        chat(get_text("talk.public"), [sender])
      }
      break
    case 2:
      var g = get_group(sender.talk.goal)
      if (is_group(g)) {
        t = []
        for (var p of g.member) {
          t.push(get_player_by_id(p))
        }
        t.push(get_player_by_id(g.creater))
        array_clear(t, null)

        if (is_array(group_mess[g.id])) {
          group_mess[g.id].push(format.slice(0, 60))
        } else {
          group_mess[g.id] = [format.slice(0, 60)]
        }

        format = `[§e${g.name}§r]` + format

      } else {
        t = []
        chat(get_text("talk.public.group"), [sender])
      }
      break
  }

  if (config.chat_board.able) {
    var board = world.scoreboard.getObjective("chat")
    if (!un(board)) {
      t = to_array(chat_board[String(get_score(board, sender))])
    }
  }

  chat(format, t, false)
  system.run(() => {
    emitEvent(sender, "chat")
  })
  if (array_has(config.log.allow, "chat")) {
    server_log(0, format, "Chat")
  }
  if (array_has(config.log.allow, "chat_")) {
    server_log(1, format)
  }

}

function afterEntitySpawn(event) {
  var entity = event.entity
  if (!is_player(entity)) {
    if (array_has(config.ban_entity, entity.typeId)) {
      entity.remove()
    }
  }
  if (entity.typeId === "minecraft:item") {
    item_count += 1

    var com = entity.getComponent("minecraft:item")
    if (!un(com)) {
      if (array_has(config.ban_item, com.itemStack.typeId)) {
        entity.remove()
      }
    }
  }

}

function beforeBlockPlace(event) {
  var player = event.player
  var block = event.block
  var per = event.permutationBeingPlaced

  if (to_string(player.axe_filling) !== "") {
    event.cancel = true
    system.run(() => {
      player.dimension.runCommand(player.axe_filling.replaceAll("{{{{}}}}", event.permutationToPlace.type.id))
      player.axe_filling = ""
      chat("§e[小木斧]执行中...", [player])
    })
  }

  for (var t in limit) {
    if (player.hasTag(t)) {
      if (limit[t].pb) {
        if (array_has(limit[t].blocks, per.type.id)) {
          event.cancel = true
          return
        }
      }
      break
    }
  }

  if (config.land.able) {
    var land = get_land_by_pos(player.dimension, block.center())
    if (is_string(land.name)) {
      if (land_member_level(player, land) === 0 && !array_has(to_array(land.other_per), "pb")) {
        event.cancel = true
        land_unable_tip(player)
      }
      if ((land_member_level(player, land) === 1 || land_member_level(player, land) === 2) && !array_has(to_array(land.mem_per), "pb")) {
        event.cancel = true
        land_unable_tip(player)
      }
    }
  }
}

function afterBlockPlace(event) {
  var player = event.player
  var block = event.block
  var id = no_minecraft(block.typeId)

  emitEvent(player, "pb")
  if (to_string(player.limiting) !== "") {
    chat(`§e[管理系统]已退出录入！`, [player])
  }
  player.limiting = ""
  score_event(player, "pb", block.typeId)
  player.block_places = to_number(player.block_places) + 1
  if (array_has(config.log.allow, "pb")) {
    log_info.pb[player.name] = to_object(log_info.pb[player.name])
    log_info.pb[player.name][id] = to_array(log_info.pb[player.name][id])

    log_info.pb[player.name][id].push(get_block_pos_di(block))
  }

  if (block.hasTag("text_sign") && array_has(config.log.allow, "sign") && config.log.able && sign[get_block_pos_di] == undefined) {
    var com = block.getComponent("minecraft:sign")
    sign[get_block_pos_di(block)] = {
      block: block,
      id: block.typeId,
      player: player.name,
      before: [com.getText("Front"), com.getText("Back")],
      now: [com.getText("Front"), com.getText("Back")]
    }
    server_log(0, "Edit Sign" + get_block_pos_di(block), get_player_path(player))
  }
}

function beforeBlockBreak(event) {
  var player = event.player
  var block = event.block

  for (var t in limit) {
    if (player.hasTag(t)) {
      if (limit[t].bb) {
        if (array_has(limit[t].blocks, block.typeId)) {
          event.cancel = true
          return
        }
      }
      break
    }
  }

  if (config.land.able) {
    var land = get_land_by_pos(player.dimension, block.center())
    if (is_string(land.name)) {
      if (land_member_level(player, land) === 0 && !array_has(to_array(land.other_per), "bb")) {
        event.cancel = true
        land_unable_tip(player)
      }
      if ((land_member_level(player, land) === 1 || land_member_level(player, land) === 2) && !array_has(to_array(land.mem_per), "bb")) {
        event.cancel = true
        land_unable_tip(player)
      }
    }
  }
}

function afterBlockBreak(event) {
  var player = event.player
  var block = event.block
  var broken = event.brokenBlockPermutation
  var id = no_minecraft(broken.type.id)
  score_event(player, "bb", broken.type.id)
  emitEvent(player, "bb")

  if (array_has(config.log.allow, "bb")) {
    log_info.bb[player.name] = to_object(log_info.bb[player.name])
    log_info.bb[player.name][id] = to_array(log_info.bb[player.name][id])

    log_info.bb[player.name][id].push(get_block_pos_di(block))
  }

}

function is_same_day(d1, d2) {
  return (d1.setHours(0, 0, 0, 0) == d2.setHours(0, 0, 0, 0))
}

function playerSpawn(event) {
  var player = event.player
  var is_login = false

  if (event.initialSpawn === true) {
    player.runCommand("scoreboard players set @s usf_data 1")
    player.info = parse_json(get_data("info", player))
    if (un(player.info.last_time)) {
      is_login = true
    } else {
      var d1 = new Date(player.info.last_time)
      var d2 = new Date()
      if (is_same_day(d1, d2) === false) {
        player.info.score = {}
        is_login = true

      }
    }

    if (is_object(player.info.follow)) {
      reset_player_follow(player)
    }
    player.info.last_time = Date.now()
    player.info.join_times = to_number(player.info.join_times, 0) + 1

    object_override(player.info, data_format.info)
    save_player_info(player)

    reset_player_data(player)

    array_clear(ids, get_id(player))
    ids.push(get_id(player))
    try {
      if (ids.length > 200) {
        delete id_names[ids.shift()]
      }
    } catch (err) { }
    id_names[get_id(player)] = player.name
    save_data("id_names", to_json(id_names))
    save_data("ids", to_json(ids))

    if (get_owners().length === 0) {
      chat(get_text("tip.init"), [player], false)
    }
    show_board(player, null, false)
    //show_tips(player)

    if (config.game.r_in > 0) {
      player.addEffect("resistance", config.game.r_in * 20, {
        amplifier: 4,
        showParticles: false
      })
    }
    if (array_has(config.log.allow, "jl")) {
      server_log(0, `Join At ${get_block_pos_di(player)}`, get_player_path(player))
    }

  } else {
    if (config.game.r_rs > 0) {
      player.addEffect("resistance", config.game.r_rs * 20, {
        amplifier: 4,
        showParticles: false
      })
    }
  }

  reset_lock_item(player)
  score_event(player, "health", "", Math.round(get_health(player)), 1)

  if (array_has(config.log.allow, "info")) {
    server_log(2, {
      name: player.name,
      last_join_game_time: Date.now(),
      spawn_point: dimension_pos_to_text(player.getSpawnPoint()),
      tags: player.getTags(),
      usfID: get_id(player),
    }, player.name)
  }
}

function dimension_pos_to_text(pos) {
  if (un(pos)) {
    return "none"
  }
  return `[${no_minecraft(pos.dimension.id)}](${Math.round(pos.x)},${Math.round(pos.y)},${Math.round(pos.z)})`
}

function afteritemUse(event) {
  var item = event.itemStack
  var player = event.source

  var event = get_item_event(item)
  if (!un(event)) {
    if (event[0] === "runner") {
      var index = to_number(parseInt(event[1]), 1)
      if (command_set.length >= index) {
        run_text_commands(player, command_set[index - 1])
        var slot = player.slots.getSlot(player.selectedSlotIndex)
        if (slot.hasItem()) {
          if (slot.amount === 1) {
            slot.setItem()
          } else {
            slot.amount -= 1
          }
        }
      }
    }
    if (event[0] === "tp") {
      var block = player.getBlockFromViewDirection({
        includePassableBlocks: false,
        maxDistance: 48
      })
      if (!un(block)) {
        block = block.block
        try {
          if (is_object(block.above())) {
            if (block.above().typeId === "minecraft:air") {
              tp_entity(player, block.dimension, block.center().x, block.y + 1, block.center().z, false)
              var slot = player.slots.getSlot(player.selectedSlotIndex)
              if (slot.hasItem()) {
                if (slot.amount === 1) {
                  slot.setItem()
                } else {
                  slot.amount = slot.amount - 1
                }
              }
            }
          }
        } catch (err) { }
      }
    }
  }
}

function beforeEntityRemove(event) {
  var entity = event.removedEntity
  if (entity.typeId === "minecraft:item") {
    item_count -= 1
  }

  if (entity.typeId === "minecraft:small_fireball") {
    if (is_object(entity.is_throw)) {
      var di = entity.dimension
      var lo = entity.location
      var source = entity.is_throw
      system.run(() => {
        di.createExplosion(lo, 1, {
          breaksBlocks: true,
          causesFire: true,
          source: source
        })
      })
    }
  }
}

function worldInitializeEvent() {
  log("——USF加载中——", [], "info", 2)
  try {
    var time = Date.now()

    reload_all()

    for (var cf of world.getAllPlayers()) {
      reset_player_data(cf)
    }

    reloaded = true
    time = Date.now() - time
    log(`——USF加载成功——时间:[0]ms`, [time], "info", 2)
  } catch (err) {
    log(`——USF加载失败！——\n§c[Error:§r[0]§c]`, [err], "error", 2)
  } finally {
    log(`——USF加载结束——`, [], "info", 2)
  }
}

function afterWeatherChanged(event) {
  var weaText = "Wearther."
  if (event.raining) {
    weaText += "Rain"
    if (event.lightning) {
      weaText += ".Thunder"
    }
  } else {
    if (event.lightning) {
      weaText += "Thunder"
    } else {
      weaText += "Clear"
    }
  }
  tran_info.weather = weaText
}

function afterPlayerDimensionChange(event) {
  var player = event.player
  var to = event.toDimension
  var from = event.fromDimension

  emitEvent(player, "di")
  score_event(player, "di", to.id)

  if (array_has(config.log.allow, "di")) {
    server_log(0, `Dimension Change:${from.name} to ${to.name}`, get_player_path(player))
  }
  if (config.game.r_di > 0) {
    player.addEffect("resistance", config.game.r_di * 20, {
      amplifier: 4,
      showParticles: false
    })
  }
  player.landing.points = []
}

function get_health(entity) {
  return entity.getComponent("minecraft:health").currentValue
}

function afterEntityHurt(event) {
  var hurt = event.hurtEntity
  var hurter = event.damageSource.damagingEntity
  var damage = event.damage

  if (is_player(hurt)) {
    score_event(hurt, "health", "", Math.round(get_health(hurt)), 1)
    score_event(hurt, "hurt", "", Math.round(damage))
    score_event(hurt, "hurt_time", "", 1)
  }

  if (typeof (hurter) === "object") {
    if (hurter.typeId == "minecraft:player") {
      if (is_player(hurter)) {
        score_event(hurter, "damage", hurt.typeId, Math.ceil(damage))
      }

      var event = get_item_event(get_player_hand_item(hurter))
      if (!un(event)) {
        if (event[0] === "knock") {
          var level = to_number(parseInt(event[1]), 1)
          if (level > 10) {
            level = 10
          }
          var view = hurter.getViewDirection()
          hurt.applyKnockback(view.x, view.z, 0.5 * (level + 1), 0.05 * (level + 1))
        }
      }

      emitEvent(hurter, "attack")

      if (hurt.hasComponent("minecraft:health")) {
        var max = hurt.getComponent("minecraft:health").effectiveMax
        var now = hurt.getComponent("minecraft:health").currentValue
        if (config.hurt.able && now >= 0) {
          var text = ""
          var level = now / max * 100
          level = (level <= 100) ? level : 100
          switch (config.hurt.type) {
            case 0:
              text += "§a"
              for (var cf = 0; cf < Math.ceil(level / 5); cf++) {
                text += "||"
              }
              text += "§f"
              for (var cf = 0; cf < 20 - Math.ceil(level / 5); cf++) {
                text += "||"
              }
              text += "  " + String(Math.round(now)) + "/" + String(Math.round(max))
              break
            case 1:
              if (now <= 20) {
                for (var cf = 0; cf < Math.ceil(now / 2); cf++) {
                  text += ""
                }
              } else {
                text = " × " + String(Math.ceil(now / 2))
              }
              break
          }
          try {
            setActionBar(hurter, text)
          } catch (err) { }
        }
      }
    }
  }
}

function get_player_hand_item(player) {
  return player.slots.getItem(player.selectedSlotIndex)
}

//因为懒得改策略文件的逻辑了，offhand其实是主手
function get_player_offhand_item(player) {
  return player.slots.getItem(player.selectedSlotIndex)
}

function get_player_offhand_slot(player) {
  var slot = player.slots.getSlot(player.selectedSlotIndex)
  if (un(slot)) {
    return undefined
  }
  return slot
}

function land_member_level(player, land) {
  if (is_bool(land.public)) {
    if (get_op_level(player) > 0) {
      return 3
    }
  }
  if (player.info.manager === true && get_op_level(player) > 0) {
    return 4
  }
  if (land.creater === get_id(player)) {
    return 3
  }
  if (array_has(land.member, player.name)) {
    return 2
  }
  for (var g of get_player_groups(player)) {
    if (array_has(land.group, String(g.id))) {
      return 1
    }
  }
  return 0
}

function report_warn(type, op) {
  if (config.hacker.kick) {
    kick(op.player, "游戏中作弊")
  }

  var reports = get_reports()
  var text = "未知日志"
  switch (type) {
    case "chest":
      text = `反作弊:${op.player.name}疑似使用"自动开箱"`
      break
    case "text":
      text = op.text
      break
  }

  reports.push(text)
  save_data("reports", to_json(reports))
}

function get_reports() {
  return to_array(parse_json(get_data("reports")))
}

function afterPlayerInteractWithBlock(event) {
  var item = event.itemStack
  var block = event.block
  var player = event.player
  if (block.hasTag("text_sign")) {
    if (array_has(config.log.allow, "sign") && config.log.able && sign[get_block_pos_di(block)] == undefined) {
      var com = block.getComponent("minecraft:sign")
      sign[get_block_pos_di(block)] = {
        block: block,
        id: block.typeId,
        player: player.name,
        before: [com.getText("Front"), com.getText("Back")],
        now: [com.getText("Front"), com.getText("Back")]
      }
      server_log(0, "Edit Sign" + get_block_pos_di(block), get_player_path(player))
    }
  }

  if (array_has(config.log.allow, "ib") && !un(item)) {
    var text = `Interact Block ${get_block_pos_di(block)};Item : ${item.typeId}`
    server_log(0, text, get_player_path(player))
  }

  var com = block.getComponent("minecraft:inventory")
  if (!un(com)) {
    com = com.container
    var items = {}
    for (var i = 0; i < com.size; i++) {
      var item = com.getItem(i)
      if (!un(item)) {
        items[no_minecraft(item.typeId)] = to_number(items[no_minecraft(item.typeId)]) + item.amount
      }
    }

    if (array_has(config.hacker.allow, "chest")) {
      var count = com.emptySlotsCount
      var items_o = []
      for (var i = 0; i < com.size; i++) {
        items_o.push(com.getItem(i))
      }
      system.runTimeout(() => {
        if (com.emptySlotsCount - count >= 5) {
          report_warn("chest", {
            player: player,
            block: block
          })
          if (config.hacker.back) {
            for (var i = 0; i < items_o.length; i++) {
              com.setItem(i, items_o[i])
            }

            var ids = Object.keys(items)
            var p_com = player.getComponent("minecraft:inventory").container
            for (var i = 0; i < p_com.size; i++) {
              var item = p_com.getItem(i)
              if (!un(item)) {
                if (array_has(ids, no_minecraft(item.typeId))) {
                  p_com.setItem(i)
                }
              }
            }
          }
        }
      }, 8)

    }

    if (config.log.able && log_config.able && array_has(config.log.allow, "chest")) {
      chest[get_block_pos_di(block)] = to_object(chest[get_block_pos_di(block)], {
        "block": block,
        "players": [],
        "items": items,
        "typeId": block.typeId
      })
      if (array_has(chest[get_block_pos_di(block)].players, player.name) === false) {
        chest[get_block_pos_di(block)].players.push(player.name)
      }

      server_log(0, `Open ${no_minecraft(block.typeId)}${get_block_pos_di(block)}`, get_player_path(player))
    }
  }
}

function beforePlayerLeave(event) {
  var player = event.player
  delete id_player[get_id(player)]
  var name = player.name
  var spawn_pos = player.getSpawnPoint()
  var tags = player.getTags()
  var pos = player.location
  pos.dimension = player.dimension

  save_player_info(player)

  system.run(() => {
    if (array_has(config.log.allow, "jl")) {
      server_log(0, "Leave", get_player_path({
        name: name
      }))
    }
    if (array_has(config.log.allow, "info")) {
      server_log(2, {
        name: name,
        last_leave_game_time: Date.now(),
        spawn_point: dimension_pos_to_text(spawn_pos),
        tags: tags,
        leave_pos: dimension_pos_to_text(pos)
      }, name)
    }
  })
}

function scriptEventReceive(event) {
  const id = event.id.slice("usf:".length)
  var message = event.message + " "
  var messages = message.split(" ")
  if (message.indexOf("**") !== -1) {
    messages = (message.slice(0, message.indexOf("**"))).split(" ")
    messages.push(message.slice(message.indexOf("**") + 2))
  }
  array_clear(messages, "")
  var type = event.sourceType
  //Server NPCDialogue Entity Block
  var block = event.sourceBlock
  var entity = event.sourceEntity
  var entity_player = false
  if (type === "Entity") {
    entity_player = is_player(entity)
  }

  switch (id) {
    case "job":
      var loc = {
        dimension: overworld,
        x: 0,
        y: 0,
        z: 0
      }
      if (type === "Block") {
        loc = block
      }
      if (type === "Entity") {
        loc.x = entity.location.x
        loc.y = entity.location.y
        loc.z = entity.location.
          loc.dimension = entity.dimension
      }
      run_job(type, loc, messages)
    case "command":
      run_special_command(entity, messages)
      break
    case "reset":
      log("重置命令已发出，请于30秒内运行/reload命令即可重置owner")
      save_data("reset", String(Date.now()))
      break
    case "get_owner":
      if (type === "Entity" && entity_player) {
        if (!has_owner) {
          save_data("owners", to_json([get_id(entity)]))
          get_owners()
        } else {
          log("已存在owner，请在Server使用命令，或从其他owner处获取。")
        }

      }
      if (type === "Server") {
        var owners = get_owners()
        for (var p of world.getAllPlayers()) {
          if (!array_has(owners, get_id(p))) {
            owners.push(get_id(p))
          }
        }
        save_data("owners", to_json(owners))
        log("已给予全部在线玩家Owners", [], "warn", 1)
      }
      break

  }
}

function run_job(type, loc, words) {
  if (words.length == 0) {
    return
  }
  if (un(data_format.job_format[words[0]])) {
    return
  }
  if (data_format.job_format[words[0]].length > words.length) {
    return
  }

  var things = []
  for (var i = 0; i < data_format.job_format[words[0]].length; i++) {
    switch (data_format.job_format[words[0]][i]) {
      case 0:
        things.push(to_string(words[i + 1]))
        break
      case 1:
        things.push(to_number(parseInt(words[i + 1])))
        break
      case 2:
        things.push(to_number(parseFloat(words[i + 1])))
        break
    }
  }
}

function run_special_command(player, words) {
  if (words.length == 0) {
    return
  }
  if (un(data_format.command_format[words[0]])) {
    return
  }
  if (data_format.command_format[words[0]].length > words.length) {
    return
  }

  var things = []
  for (var i = 0; i < data_format.command_format[words[0]].length; i++) {
    switch (data_format.command_format[words[0]][i]) {
      case 0:
        things.push(to_string(words[i + 1]))
        break
      case 1:
        things.push(to_number(parseInt(words[i + 1])))
        break
      case 2:
        things.push(to_number(parseFloat(words[i + 1])))
        break
    }
  }
  switch (words[0]) {
    case "back":
      if (!un(player.last_die)) {
        var die = player.last_die
        tp_entity(player, die.di, die.x, die.y, die.z, false)
      }
      break
    case "commandblock":
      try {
        var block = player.dimension.getBlock({
          x: things[0],
          y: things[1],
          z: things[2]
        })
        block = block.above()
        block.setType("minecraft:redstone_block")
        system.runTimeout(() => {
          block.setType("minecraft:air")
        }, 2)
      } catch (err) { }
      break
    case "tpa":
      tpPlayerBar(player)
      break
    case "code":
      if (things[0] !== "") {
        run_code(player, things[0])
      }
      break
    case "open":
      open_page(player, things[0])
      break
    case "hotbar":
      if (array_has([1, 2, 3, 4, 5, 6, 7, 8, 9], things[0])) {
        player.selectedSlotIndex = things[0] - 1
      }
      break
    case "name":
      switch (things[0]) {
        case "set":
          player.nameTag = tran_text(player, things[1])
          break
        case "format":
          player.info.name = (things[1] === "Reset") ? "" : things[1];
          break
      }
      break
    case "knock":
      player.applyKnockback(things[0], things[1], things[2], things[3])
      break
    case "health":
      switch (things[0]) {
        case "set":
          player.getComponent("minecraft:health").setCurrentValue(things[1])
          break
        case "add":
          var com = player.getComponent("minecraft:health")
          com.setCurrentValue(com.currentValue + things[1])
      }
      break
    case "tag":
      set_chat_tag(player, things[0])
      break
    case "fire":
      player.setOnFire(things[0])
      break
    case "show":
      things[2] = tran_text(0, things[2])
      switch (things[0]) {
        case "chat":
          overworld.runCommand(`tellraw ${things[1].replace("@@", "@")} {"rawtext":[{"text":"${things[2].replaceAll('"', '\\\"')}"}]}`)
          //chat(things[1],[player],true)
          break
        case "actionbar":
          overworld.runCommand(`titleraw ${things[1].replace("@@", "@")} actionbar {"rawtext":[{"text":"${things[2].replaceAll('"', '\\\"')}"}]}`)
          //setActionBar(player,things[1],true)
          break
      }
      break
    case "ui":
      var d = get_data("minecraft:overworld." + things[0])
      if (d !== "") {
        d = to_object(parse_json(d))
        if (is_string(d.chest)) {
          get_store_item(d.chest, d.slot, (item) => {
            if (!un(item)) {
              var data = to_object(parse_json(get_data("data", item)))
              if (is_string(data.title)) {
                system.run(() => {
                  showConfigBar(player, data, "")
                })
              }
            }
          })
          return
        }
      }
      break
    case "var":
      switch (things[0]) {
        case "set":
          vars[things[1]] = things[2]
          break
        case "player":
          if (is_player(player)) {
            vars[things[2]] = player.name
          }
          break
        case "copy":
          var ob = world.scoreboard.getObjective(things[2])
          if (!un(ob)) {
            vars[things[1]] = String(get_score(ob, player))
          }
          break
      }
      break
    case "test":
      var score = 0
      switch (things[2]) {
        case "player":
          score = world.getAllPlayers().length
          break
        case "tag":
          score = world.getPlayers({
            tags: [things[3]]
          }).length
          break
        case "score":
          var ob = world.scoreboard.getObjective(things[3])
          if (!un(ob)) {
            score = get_score(ob, player)
          }
          break
      }
      if (score >= things[0] && score <= things[1]) {
        player.runCommand(things[4])
      }
      break
    case "get":
      var ob = world.scoreboard.getObjective(things[0])
      if (!un(ob)) {
        switch (things[1]) {
          case "player":
            ob.setScore(player, world.getAllPlayers().length)
            break
          case "tag":
            ob.setScore(player, world.getPlayers({
              tags: [things[2]]
            }).length)
            break
        }
      }
      break
  }
}

//界面

function groupLookBar(player, g, op = false) {
  var ui = new btnBar()
  ui.title = format("group.init", [g.name])

  var text = [
    get_text("group.name") + g.name,
    get_text("group.id") + g.id,
    "————————————",
    get_text("group.announcement"),
    g.board,
    "————————————",
    get_text("group.owner") + get_name_by_id(g.creater),
    get_text("group.member")
  ]
  for (var p of g.member) {
    text.push(get_name_by_id(p))
  }

  if (op) {
    text.push("§e管理员编辑模式")
  }

  ui.body = text

  ui.btns.push({
    text: get_text("group.his"),
    icon: ui_icon.key_board,
    func: () => {
      var ui = new btnBar()
      ui.body = g.message
      ui.title = `${g.name} - ${get_text("group.his")}`
      ui.btns = [{
        text: get_text("back"),
        icon: ui_icon.back,
        func: () => {
          groupLookBar(player, get_group(g.id))
        }
      }]
      ui.show(player)
    }
  })

  if (g.creater === get_id(player) || op === true) {
    ui.btns.push({
      text: "编辑信息",
      icon: ui_icon.edit,
      func: () => {
        editGroupBar(player, g)
      }
    })
    ui.btns.push({
      text: "添加成员",
      icon: ui_icon.add,
      func: () => {
        var ps = []
        for (var p of world.getAllPlayers()) {
          if (!is_group_has(g, p)) {
            ps.push(p)
          }
        }
        choosePlayer(player, ps, (players) => {
          if (players.length === 0) {
            tip(player, "无玩家可选择或未选择玩家！", () => {
              groupLookBar(player, g)
            })
          } else {
            for (var p of players) {
              add_invite(p, g.id)
            }
            tip(player, `已向${players.length}位玩家发送邀请！`, () => {
              groupLookBar(player, g)
            })
          }
        })
      }
    })
    if (g.member.length > 0) {
      ui.btns.push({
        text: "删除成员",
        icon: ui_icon.stop,
        func: () => {
          var ui = new infoBar()
          ui.title = "删除成员"
          for (var id of g.member) {
            ui.toggle(id, get_name_by_id(id), false)
          }
          ui.show(player, (r) => {
            for (var k of Object.keys(r)) {
              if (r[k] === true) {
                array_clear(g.member, k)
              }
            }
            save_group(g)
            groupLookBar(player, get_group(g.id))
          })
        }
      })
    }
    if (g.in.length > 0) {
      ui.btns.push({
        text: "加群申请",
        icon: ui_icon.compass,
        func: () => {
          var ui = new infoBar()
          ui.title = "申请列表"
          for (var i of g.in) {
            ui.toggle(i, get_name_by_id(i) + "[拒绝 | 同意]", false)
          }
          ui.show(player, (r) => {
            for (var k of Object.keys(r)) {
              if (r[k] === true) {
                g.member.push(k)
              }
            }
            g.in = []
            save_group(g)
            groupLookBar(player, get_group(g.id))
          })
        }
      })
    }
    ui.btns.push({
      text: "解散群组",
      icon: ui_icon.delete,
      func: () => {
        confirm(player, "确认解散群组？你将和所有群员失去联系！", (r) => {
          if (r) {
            save_data("group" + g.id, "")
            array_clear(groups, g.id)
            save_groups()
            groupsBar(player)
          } else {
            groupLookBar(player, get_group(g.id))
          }
        })
      }
    })
  } else {
    ui.btns.push({
      text: "退出群组",
      icon: ui_icon.delete,
      func: () => {
        confirm(player, "确认退出群组？你将和所有群员失去联系！", (r) => {
          if (r) {
            array_clear(g.member, get_id(player))
            save_group(g)
            groupsBar(player)
          } else {
            groupLookBar(player, get_group(g.id))
          }
        })
      }
    })
  }
  ui.show(player)
}

function confirm(player, text, back = function () { }) {
  var ui = new btnBar()
  ui.title = "确认"
  ui.body = text
  ui.btns = [{
    text: "确认",
    icon: ui_icon.ok,
    func: () => {
      back(true)
    }
  }, {
    text: "取消",
    icon: ui_icon.delete,
    func: () => {
      back(false)
    }
  }]
  ui.cancel = () => {
    back(false)
  }
  ui.show(player)
}

function add_invite(player, id) {
  var invites = to_array(parse_json(get_data("invites", player)), [])
  if (!array_has(invites, id)) {
    invites.push(id)
    chat("[群组]你收到一条群组邀请！请前往查看！", [player])
  }
  save_data("invites", to_json(invites), player)
}

//该函数返回的是选择的things的index
function chooseBar(player, things = [], back = function () { }) {
  if (things.length <= 0) {
    back([])
    return
  }
  var ui = new infoBar()
  ui.title = "选择器"
  for (var t = 0; t < things.length; t++) {
    ui.toggle("things", things[t], false)
  }

  ui.show(player, (r) => {
    if (!is_array(r.things)) {
      r.things = [r.things]
    }
    var result = []
    for (var i = 0; i < r.things.length; i++) {
      if (r.things[i]) {
        result.push(i)
      }
    }
    back(result)
  })
}

function choosePlayer(player, ps, back = function () { }) {
  if (ps.length <= 0) {
    back([])
    return
  }
  var ui = new infoBar()
  ui.title = "玩家选择器"
  for (var p of ps) {
    ui.toggle("players", p.name, false)
  }

  ui.show(player, (r) => {
    if (!is_array(r.players)) {
      r.players = [r.players]
    }
    var pps = []
    for (var i = 0; i < r.players.length; i++) {
      if (r.players[i]) {
        pps.push(ps[i])
      }
    }
    back(pps)
  })
}

function editGroupBar(player, g) {
  var new_g = false
  if (!is_group(g)) {
    new_g = true
    g = {
      creater: "",
      member: [],
      message: [],
      name: "",
      board: "",
      pos: [],
      in: [],
      id: get_random_group_id()
    }
  }

  var ui = new infoBar()
  ui.title = "编辑群组"
  ui.input("name", "群名", "输入群名", g.name)
  ui.input("board", "公告", "输入公告", g.board)

  ui.show(player, (r) => {
    g.name = r.name
    g.board = r.board
    g.creater = get_id(player)
    if (new_g) {
      player_add_group(player, g.id)
    }
    save_group(g)
    groupLookBar(player, get_group(g.id))
  })
}

function get_land_by_pos(di, pos) {
  var dis = Math.sqrt(Math.pow(Math.abs(pos.x), 2) + Math.pow(Math.abs(pos.z), 2))
  var ix = two_find_min(lands.min, dis)
  if (ix === -1) {
    return {}
  }
  for (var i = ix; i >= 0; i--) {
    if (lands.max[i] < dis) {
      return {}
    }
    var land = get_land(lands.ids[i])
    if (is_string(land.name)) {
      if (di.id === land.di) {
        if (is_between(pos.y, land.from.y, land.to.y) && is_between(pos.x, land.from.x, land.to.x) && is_between(pos.z, land.from.z, land.to.z)) {
          return land
        }
      }
    }
  }
  return {}
}

function is_group_has(g, player) {
  if (g.creater === get_id(player) || array_has(g.member, get_id(player))) {
    return true
  }
  return false
}

function addGroupBar(player) {
  var ui = new infoBar()
  ui.busy = () => {
    groupsBar(player)
  }
  ui.title = "加入群组"
  ui.input("id", "加入的群ID", "输入群ID", "")
  ui.show(player, (r) => {
    var g = get_group(r.id)
    if (is_group(g)) {
      if (is_group_has(g, player)) {
        tip(player, "你已经在该群组内！", () => {
          groupsBar(player)
        })
      } else {
        g.in.push(get_id(player))
        save_group(g)

        var my_invites = to_array(parse_json(get_data("my_in", player)), [])
        if (!array_has(my_invites, g.id)) {
          my_invites.push(g.id)
        }
        save_data("my_in", to_json(my_invites), player)

        tip(player, "已发送请求!", () => {
          groupsBar(player)
        })
      }
    } else {
      tip(player, "该群组不存在！", () => {
        groupsBar(player)
      })
    }
  })
}

function myInvitationBar(player) {
  var invites = to_array(parse_json(get_data("invites", player)), [])
  var used = 0

  var ui = new infoBar()
  ui.title = "邀请请求"
  for (var i of invites) {
    var g = get_group(i)
    if (is_group(g) && !is_group_has(g, player)) {
      ui.toggle(i, `${get_group(i).name}(群主:${get_name_by_id(g.creater)})\n[拒绝 | 同意]`)
      used += 1
    }
  }
  if (used === 0) {
    tip(player, "当前无请求！", () => {
      groupsBar(player)
    })
    return
  }
  ui.show(player, (r) => {
    for (var id of Object.keys(r)) {
      if (r[id]) {
        var g = get_group(id)
        group_add_member(g, player)
      }
    }
    save_data("invites", "", player)
    groupsBar(player)
  })
}

function group_add_member(g, player) {
  if (!is_group_has(g, player)) {
    g.member.push(get_id(player))
    player_add_group(player, g.id)
    save_group(g)
  }
}

function groupsBar(player) {
  var my_invites = to_array(parse_json(get_data("my_in", player)), [])
  var group_ids = to_array(parse_json(get_data("groups", player)), [])

  for (var i of my_invites) {
    var g = get_group(i)
    if (is_group(g) && !array_has(group_ids, i)) {
      if (is_group_has(g, player)) {
        player_add_group(player, i)
        array_clear(my_invites, i)
      }
    }
  }
  save_data("my_in", to_json(invites))

  var invites = to_array(parse_json(get_data("invites", player)), [])
  var groups = get_player_groups(player)

  var creater_groups = []

  var ui = new btnBar()
  ui.title = "我的群组"
  ui.body = "管理你的群组"
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i]
    ui.btns.push({
      text: `${g.name}\n群主:${get_name_by_id(g.creater)}`,
      op: {
        g: groups[i]
      },
      func: (op) => {
        groupLookBar(player, op.g)
      }
    })
    if (g.creater === get_id(player)) {
      creater_groups.push(g)
    }
  }

  if (creater_groups.length < config.groups.max || get_op_level(player) > 0) {
    ui.btns.push({
      text: "新建群组",
      icon: ui_icon.add,
      func: () => {
        editGroupBar(player, {})
      }
    })
  }

  ui.btns.push({
    text: "加入群组",
    icon: ui_icon.more,
    func: () => {
      addGroupBar(player)
    }
  })
  ui.btns.push({
    text: `群组邀请(${invites.length})`,
    icon: ui_icon.share,
    func: () => {
      myInvitationBar(player)
    }
  })

  ui.show(player)
}

function setChatBar(player) {
  var texts = ["公共聊天"]
  var ops = [null]
  for (var p of world.getAllPlayers()) {
    ops.push(p)
    texts.push(`私聊-${p.name}`)
  }
  for (var g of get_player_groups(player)) {
    ops.push(String(g.id))
    texts.push(`群聊-${g.name}`)
  }
  var ui = new infoBar()
  ui.title = "聊天设置"
  ui.options("goal", "聊天对象", texts, 0)

  ui.show(player, (r) => {
    if (r.goal === 0) {
      player.talk.mode = 0
    } else {
      if (is_string(ops[r.goal])) {
        player.talk.mode = 2
        player.talk.goal = ops[r.goal]
      } else {
        player.talk.mode = 1
        player.talk.goal = ops[r.goal]
      }
    }
  })
}

function is_public_editable(player) {
  if (get_op_level(player) > 0) {
    return true
  }
  return false
}

function to_pos(player, pos) {
  if (Date.now() - player.last_tp < config.tp.down * 1000) {
    tip(player, "传送功能冷却中...请稍后尝试！", "")
    return
  }
  tp_entity(player, get_di(pos.di), pos.x, pos.y, pos.z, true, false, true)
  player.last_tp = Date.now()
  emitEvent(player, "pos")
}

function get_pos_name(pos) {
  return `[${get_di(pos.di).name}]${pos.name}`
}

function editPosBar(player, pos, save = function () { }, back = function () { }) {
  var ui = new infoBar()
  var poss = [null, null]
  var texts = ["保持位置", "当前位置"]
  ui.cancel = () => {
    back()
  }

  if (Object.keys(pos).length === 0) {
    object_override(pos, {
      "owner": get_id(player),
      "di": player.dimension.id,
      "x": player.location.x,
      "y": player.location.y,
      "z": player.location.z,
      "name": "",
      "icon": null,
      "home": false,
    })
    texts = ["当前位置", "当前位置"]
    ui.cancel = () => {
      pos.name = undefined
      save()
      back()
    }
  }

  for (var p of get_player_personal_pos()) {
    poss.push(p)
    texts.push(get_pos_name(p))
  }

  ui.title = "编辑传送点"
  ui.input("name", "传送点名称", "输入名称", pos.name)
  add_pictures_choice(ui, "选择传送点图标", pos.icon)
  ui.options("lo", "位置", texts, 0)
  ui.toggle("home", "设为Home(仅个人传送点有效)", pos.home)

  ui.show(player, (r) => {
    pos.name = r.name
    pos.icon = r.icon
    pos.home = r.home
    switch (r.lo) {
      case 0:

        break
      case 1:
        pos.x = player.location.x
        pos.y = player.location.y
        pos.z = player.location.z
        pos.di = player.dimension.id
        break
      default:
        pos.x = poss[r.lo].x
        pos.y = poss[r.lo].y
        pos.z = poss[r.lo].z
        break
    }

    save()
    var ui2 = new btnBar()
    viewPosBar(player, pos, true, ui2, save, back)
  })
}

function pos_to_text(pos) {
  return `(${Math.round(pos.x)},${Math.round(pos.y)},${Math.round(pos.z)})`
}

function viewPosBar(player, pos, editable, ui = new btnBar(), save = function () { }, back = function () { }) {

  ui.title = `传送点 - ${pos.name}`
  ui.cancel = () => {
    back()
  }
  ui.body = [
    "传送点:" + pos.name,
    `创建者:${get_name_by_id(pos.owner)}`,
    `维度:${get_di(pos.di).name}`,
    `坐标:${pos_to_text(pos)}`
  ]

  ui.btns = [{
    text: "传送",
    icon: ui_icon.go,
    func: () => {
      to_pos(player, pos)
    }
  }]

  if (config.tp.share) {
    ui.btns.push({
      text: "分享",
      icon: ui_icon.share,
      func: () => {
        sharePosBar(player, pos)
      }
    })
  }
  if (editable) {
    ui.btns = ui.btns.concat([{
      text: "编辑",
      icon: ui_icon.edit,
      func: () => {
        editPosBar(player, pos, save, back)
      }
    },
    {
      text: "删除",
      icon: ui_icon.delete,
      func: () => {
        delete pos.name
        save()
        back()
      }
    }
    ])
  }
  ui.show(player)
}

function save_player_pos(player) {
  for (var pos of player.pos) {
    if (un(pos.name)) {
      player.pos.splice(player.pos.indexOf(pos), 1)
    }
  }
  save_data("pos", to_json(player.pos), player)
}

function get_player_pos(player) {
  return to_array(parse_json(get_data("pos", player)))
}

function get_score(ob, player) {
  var s = 0
  try {
    s = ob.getScore(player)
  } catch (err) { }
  return to_number(s)
}

function tranBar(player) {
  var board = config.tran.board
  board = board.split(";")

  var obs = []
  for (var id of board) {
    var ob = world.scoreboard.getObjective(id)
    if (!un(ob)) {
      obs.push(ob)
    }
  }

  if (obs.length === 0) {
    chat("§e[转账机]当前无可转账项目", [player])
    return
  }

  var obs_name = []
  for (var i = 0; i < obs.length; i++) {
    obs_name.push(obs[i].displayName + " - 剩余:" + String(get_score(obs[i], player)))
  }

  var players = world.getAllPlayers()
  var ps_name = []
  for (var i = 0; i < players.length; i++) {
    ps_name.push(players[i].name)
  }

  var ui = new infoBar()
  ui.title = "转账机"
  ui.options("id", "转账项目", obs_name, 0)
  ui.input("money", `输入整数数额(手续费:${config.tran.free}％)`, "款数", "")
  ui.options("p", "玩家", ps_name, 0)
  ui.show(player, (r) => {
    var count = to_number(parseInt(r.money))
    if (count > 0) {
      var text = [
        `余额:${get_score(obs[r.id], player)}`,
        `你将转账给:${players[r.p].name}`,
        `数目:${String(count)}`,
        `实付:${Math.ceil(count * (1 + config.tran.free / 100))}`,
        "确认转账？"
      ]
      confirm(player, text, (r2) => {
        if (r2 === true) {
          if (get_score(obs[r.id], player) - count * (1 + config.tran.free / 100) >= 0) {
            players[r.p].runCommand(`scoreboard players add @s ${obs[r.id].id} ${String(count)}`)
            player.runCommand(`scoreboard players remove @s ${obs[r.id].id} ${String(Math.ceil(count * (1 + config.tran.free / 100)))}`)
            chat("§e[转账机]转账成功！", [player])
            chat("§e[转账机]您收到一笔转账！金额：" + String(count), [players[r.p]])
          } else {
            chat("§e[转账机]余额不足！", [player])
          }
        } else {
          tranBar(player)
        }
      })
    } else {
      chat("§e[转账机]无法识别您输入的款数！", [player])
    }
  })
}

function groupPosBar(player) {
  var ui = new btnBar()
  ui.title = "群组公共点"
  ui.body = "管理所有群组的传送点"
  ui.cancel = () => {
    posBar(player)
  }

  var groups = get_player_groups(player)
  if (groups.length === 0) {
    tip(player, "您未加入任何群组！", () => {
      posBar(player)
    })
    return
  }
  for (var group of groups) {
    for (var pos of group.pos) {
      ui.btns.push({
        text: `[${group.name}]\n[${get_di(pos.di).name}]${pos.name}`,
        icon: pictures[pos.icon],
        op: {
          "pos": pos,
          "group": group
        },
        func: (op) => {
          var ui2 = new btnBar()
          ui2.cancel = () => {
            groupPosBar(player)
          }
          viewPosBar(player, op.pos, true, ui2, () => {
            for (var p of op.group.pos) {
              if (un(p.name)) {
                op.group.pos.splice(op.group.pos.indexOf(p), 1)
              }
            }
            save_group(op.group)
          }, () => {
            groupPosBar(player)
          })
        }
      })
    }
  }
  ui.btns.push({
    text: "添加传送点",
    icon: ui_icon.add,
    func: () => {
      var groups = get_player_groups(player)
      var can_groups = []
      for (var group of groups) {
        if (group.pos.length < 30) {
          can_groups.push(group)
        }
      }

      if (can_groups.length === 0) {
        tip(player, "当前无队伍可添加传送点！", () => {
          groupPosBar(player)
        })
      } else {
        var group_names = []
        for (var i = 0; i < can_groups.length; i++) {
          group_names.push(can_groups[i].name)
        }
        var ui = new infoBar()
        ui.title = "选择队伍"
        ui.cancel = () => {
          groupPosBar(player)
        }
        ui.options("index", "选择队伍", group_names, 0)
        ui.show(player, (r) => {
          var id = can_groups[r.index].id
          var group = get_group(id)
          group.pos.push({})
          editPosBar(player, group.pos[group.pos.length - 1], () => {
            for (var p of group.pos) {
              if (un(p.name)) {
                group.pos.splice(group.pos.indexOf(p), 1)
              }
            }
            save_group(group)
          }, () => {
            groupPosBar(player)
          })
        })
      }
    }
  })

  ui.show(player)
}

function worldPosBar(player) {
  var ui = new btnBar()
  ui.title = "世界公共点"
  ui.body = "管理世界的传送点"
  for (var pos of world_pos) {
    ui.btns.push({
      text: `[${get_di(pos.di).name}]${pos.name}`,
      icon: pictures[pos.icon],
      op: {
        "pos": pos
      },
      func: (op) => {
        var ui2 = new btnBar()
        ui2.cancel = () => {
          worldPosBar(player)
        }
        viewPosBar(player, op.pos, (get_id(player) === op.pos.owner || get_op_level(player) > 0), ui2, () => {
          save_world_pos()
        }, () => {
          worldPosBar(player)
        })
      }
    })
  }
  if (world_pos.length < 100) {
    ui.btns.push({
      text: "添加传送点",
      icon: ui_icon.add,
      func: () => {
        world_pos.push({})
        editPosBar(player, (world_pos[world_pos.length - 1]), () => {
          save_world_pos()
        }, () => {
          worldPosBar(player)
        })
      }
    })
  }

  ui.show(player)
}

function personalPosBar(player, goal) {
  var ui = new btnBar()
  ui.title = "个人传送点"
  ui.body = "管理您的传送点"
  for (var pos of goal.pos) {
    ui.btns.push({
      text: `[${get_di(pos.di).name}]${pos.name}`,
      icon: pictures[pos.icon],
      op: {
        "pos": pos
      },
      func: (op) => {
        var ui2 = new btnBar()
        ui2.cancel = () => {
          personalPosBar(player, goal)
        }
        viewPosBar(player, op.pos, true, ui2, () => {
          save_player_pos(goal)
        }, () => {
          personalPosBar(player, goal)
        })
      }
    })
  }
  if (goal.pos.length < config.tp.per_count) {
    ui.btns.push({
      text: "添加传送点",
      icon: ui_icon.add,
      func: () => {
        goal.pos.push({})
        editPosBar(player, (goal.pos[goal.pos.length - 1]), () => {
          save_player_pos(goal)
        }, () => {
          personalPosBar(player, goal)
        })
      }
    })
  }
  if (get_op_level(player) > 0) {
    ui.btns.push({
      text: "管理玩家个人点",
      icon: ui_icon.edit,
      func: () => {
        choosePlayer(player, world.getAllPlayers(), (ps) => {
          if (ps.length > 0) {
            personalPosBar(player, ps[0])
          } else {
            personalPosBar(player, goal)
          }
        })
      }
    })
  }

  ui.show(player)
}

function sharePosBar(player, pos) {
  var ui = new infoBar()
  ui.title = "分享坐标点"
  ui.range("time", "分享时间/秒", 10, 600, 10, 300)
  ui.options("p", "分享玩家", ["所有玩家", "部分玩家"], 0)
  ui.show(player, (r) => {
    var p = {
      ...pos
    }
    p.time = Date.now() + r.time * 1000
    switch (r.p) {
      case 0:
        var list = []
        for (var pl of world.getAllPlayers()) {
          list.push(get_id(pl))
        }
        p.list = list
        break
      case 1:
        var list = []
        choosePlayer(player, world.getAllPlayers(), (ps) => {
          for (var pl of ps) {
            list.push(get_id(pl))
          }
        })
        p.list = list
        break
    }
    share_pos.push(p)
  })
}

function random_tp(player, now) {
  tp_entity(player, player.dimension, player.location.x + get_random_tp_range(), 400, player.location.z + get_random_tp_range(), true)
  var id = system.runInterval(() => {
    var lo = player.location
    var block = get_block(player.dimension, {
      x: lo.x,
      y: 64,
      z: lo.z
    })
    if (!un(block)) {
      for (var i = 100; i > player.dimension.heightRange.min; i--) {
        lo.y = i
        var b = get_block(player.dimension, lo)
        if (!un(b)) {
          if (!b.isAir) {
            b = get_block(player.dimension, {
              x: lo.x,
              y: lo.y + 2,
              z: lo.z
            })
            if (!un(b)) {
              if (b.isAir) {
                b = get_block(player.dimension, {
                  x: lo.x,
                  y: lo.y + 1,
                  z: lo.z
                })
                if (!un(b)) {
                  if (b.isAir) {
                    break
                  }
                }
              }
            }
          }
        }
      }
      tp_entity(player, player.dimension, lo.x, lo.y + 1, lo.z, false)
      system.clearRun(id)
    }
  }, 20)
  player.last_tp = now
}

function posBar(player) {
  push_text("pos.body", "此处保存您的所有传送点/n您可以编辑、修改、分享传送点")
  push_text("pos.name", "传送系统")

  var now = Date.now()
  var ui = new btnBar()
  ui.title = get_text("pos.name")
  ui.body = tran_text(player, get_text("pos.body"))
  for (var pos of public_pos) {
    ui.btns.push({
      text: `[公共]${pos.name}`,
      icon: pictures[pos.icon],
      op: {
        "pos": pos
      },
      func: (op) => {
        var ui2 = new btnBar()
        ui2.cancel = () => {
          posBar(player)
        }
        viewPosBar(player, op.pos, is_public_editable(player), ui2, () => {
          save_public_pos()
        }, () => {
          posBar(player)
        })
      }
    })
  }

  for (var pos of share_pos) {
    if (now > pos.time || !is_number(pos.time) || !is_string(pos.name)) {
      delete share_pos[pos]
    } else {
      if (array_has(pos.list, get_id(player))) {
        ui.btns.push({
          text: `[分享][${get_di(pos.di).name}]${pos.name}\n剩余时间:${-Math.round((now - pos.time) / 1000)}s`,
          icon: pictures[pos.icon],
          op: {
            "pos": pos
          },
          func: (op) => {
            var ui2 = new btnBar()
            ui2.cancel = () => {
              posBar(player)
            }
            viewPosBar(player, op.pos, is_public_editable(player), ui2, function () { }, () => {
              posBar(player)
            })
          }
        })
      }

    }
  }

  if (config.tp.pp) {
    ui.btns.push({
      text: "传送玩家",
      icon: ui_icon.heart,
      func: () => {
        tpPlayerBar(player)
      }
    })
  }
  if (config.tp.die && !un(player.last_die) && now - player.last_tp > config.tp.down * 1000) {
    var die = player.last_die
    ui.btns.push({
      text: "返回死亡点",
      icon: ui_icon.die,
      func: () => {
        tp_entity(player, die.di, die.x, die.y, die.z, true)
      }
    })
  }
  if (config.tp.back && is_array(player.back_pos)) {
    ui.btns.push({
      text: "返回上一位置",
      icon: ui_icon.back,
      func: () => {
        tp_entity(player, player.back_pos[0], player.back_pos[1], player.back_pos[2], player.back_pos[3], true)
        player.back_pos = ""
      }
    })
  }

  if (config.tp.per && config.tp.per_count > 0) {
    ui.btns.push({
      text: "个人传送点",
      icon: ui_icon.player,
      func: () => {
        personalPosBar(player, player)
      }
    })
  }

  if (config.tp.world) {
    ui.btns.push({
      text: "世界公共点",
      icon: ui_icon.world,
      func: () => {
        worldPosBar(player)
      }
    })
  }
  if (config.tp.group) {
    ui.btns.push({
      text: "群组公共点",
      icon: ui_icon.group,
      func: () => {
        groupPosBar(player)
      }
    })
  }

  if ((config.tp.random_range > 0 && now - player.last_tp > config.tp.down * 1000) && (player.dimension.id !== "minecraft:the_end" || config.tp.random_end === true)) {
    ui.btns.push({
      text: "随机传送",
      icon: ui_icon.compass,
      func: () => {
        random_tp(player, now)
      }
    })
  }

  if (is_public_editable(player)) {
    ui.btns.push({
      text: "添加固定传送点",
      icon: ui_icon.add,
      func: () => {
        public_pos.push({})
        editPosBar(player, public_pos[public_pos.length - 1], () => {
          save_public_pos()
        }, () => {
          posBar(player)
        })
      }
    })
  }

  ui.show(player)
}

function tpPlayerBar(player) {
  var ps = world.getAllPlayers()
  var names = []
  for (var i = 0; i < ps.length; i++) {
    names.push(ps[i].name)
  }
  var ui = new infoBar()
  ui.title = "传送玩家"
  ui.options("p", "选择玩家", names, 0)
  ui.options("mode", "方向", ["你 > 对方", "对方 > 你"], 0)
  ui.show(player, (r) => {
    var goal = ps[r.p]
    goal.tpa = {
      goal: player,
      mode: r.mode,
      time: Date.now() + 60 * 1000
    }
    chat(`§e[传送系统]玩家${player.name}向你发起传送请求\n方向：${r.mode === 0 ? "对方 > 你" : "你 > 对方"}\n一分钟内输入+tpaccept即可传送`, [goal])
    tpaRequest(goal, player, r.mode)
  })
}

function tpaRequest(goal, player, mode) {
  var ui = new btnBar()
  ui.title = "传送请求Teleportation Request"
  ui.body = `玩家${player.name}向你发起传送请求\n方向：${mode === 0 ? "对方(other) > 你(me)" : "你(me) > 对方(other)"}`
  ui.btns = [{
    text: "同意Agree",
    icon: ui_icon.ok,
    func: () => {
      try {
        if (!goal.tpa) {
          throw new Error("传送请求已过期");
        }

        const { goal: requester, mode } = goal.tpa;
        const target = mode === 0 ? goal : requester;
        const source = mode === 0 ? requester : goal;

        // 执行传送
        source.teleport(
          target.location,
          {
            dimension: target.dimension,
            rotation: target.getRotation(),
            facingLocation: target.location
          }
        );

        chat("§a[传送系统]传送成功！", [requester, goal]);
      } catch (e) {
        console.error(`传送失败: ${e}`);
        chat("§c[传送系统]传送失败: " + e.message, [player, goal]);
      } finally {
        delete goal.tpa;
      }
    }
  }, {
    text: "拒绝Refuse",
    icon: ui_icon.delete,
    func: () => {
      delete goal.tpa
      chat("§e[传送系统]对方拒绝(Refuse)了你的传送请求！", [player])
    }
  }]
  ui.busy = 0
  ui.show(goal)
}

function get_block(di, lo) {
  var block = undefined
  try {
    block = di.getBlock(lo)
  } catch (err) { }
  return block
}

function landBar(player, goal) {

  var ui = new btnBar()
  ui.title = "领地管理"

  if (un(world.scoreboard.getObjective(config.land.board))) {
    confirm(player, "记分版配置错误！领地功能无法使用！")
    return
  }

  var text = ""
  var l = get_land_by_pos(goal.dimension, goal.location)
  if (is_string(l.name)) {
    text += `当前领地：${l.name}(id:${l.id})\n`
  }

  ui.body = text + `你好${goal.name}\n管理您的领地\n您的领地数量:${goal.lands.length}`
  if (goal.lands.length < config.land.max || get_op_level(goal) > 0) {
    ui.btns.push({
      text: "添加领地",
      icon: ui_icon.add,
      func: () => {
        player.landing.mode = 1
        tip(player, array2string([
          "领地设置方法:",
          "空手选取方块点",
          "输入+land命令 或 打开主菜单 即可进入创建页面",
          "潜行状态下输入+land命令 或 打开主菜单 即可进入取消创建",
          "创建页面可更改Y轴",
          "创建页面选择 暂时预览 模式可以继续修改坐标点"

        ]))
      }
    })
  }

  for (var land_id of goal.lands) {
    var land = get_land(land_id)
    if (is_string(land.name)) {
      ui.btns.push({
        text: `[${get_di(land.di).name}]${land.name}`,
        op: {
          id: land.id
        },
        func: (op) => {
          viewLandBar(player, goal, op.id)
        }
      })
    }
  }

  ui.show(player)
}

function array2line(array) {
  var text = ""
  for (var t of array) {
    text += t + ","
  }
  text = text.slice(0, text.length - 1)
  return text
}

function vector3_to_string(vec) {
  return `(${vec.x.toFixed(1)},${vec.y.toFixed(1)},${vec.z.toFixed(1)})`
}

function editLandPermissionBar(player, goal, land, type) {
  land.mem_per = to_array(land.mem_per)
  land.other_per = to_array(land.other_per)

  var ui = new infoBar()
  if (type === 0) {
    ui.title = "编辑成员权限"
  } else {
    ui.title = "编辑访客权限"
  }

  for (var per of data_format.land_permission) {
    if (type === 0) {
      ui.toggle(per, get_text(per), array_has(land.mem_per, per))
    } else {
      ui.toggle(per, get_text(per), array_has(land.other_per, per))
    }
  }

  ui.show(player, (r) => {
    var result = []
    for (var k in r) {
      if (r[k] === true) {
        result.push(k)
      }
    }
    if (type === 0) {
      land.mem_per = result
    } else {
      land.other_per = result
    }

    save_land(land)
    viewLandBar(player, goal, land.id)
  })
}

function viewLandBar(player, goal, id) {
  var land = get_land(id)
  var ui = new btnBar()
  ui.title = "领地"
  ui.body = [
    `领地名:${land.name}`,
    `领地ID:${land.id}`,
    `范围:${vector3_to_string(land.from)} 到 ${vector3_to_string(land.to)}`,
    `领地主人:${(is_bool(land.public) ? "公共领地" : get_name_by_id(land.creater))}`,
    `成员:${array2line(land.member)}`,
    `开放队伍:${array2line(land.group)}`
  ]
  if (is_number(land.price)) {
    ui.body.push(`价格:${land.price}`)
  }
  if (land_member_level(player, land) >= 3 || (is_bool(land.public) && is_op(player))) {
    ui.btns.push({
      text: "编辑领地名",
      icon: ui_icon.edit,
      func: () => {
        var ui2 = new infoBar()
        ui2.title = "编辑领地名"
        ui2.cancel = () => {
          viewLandBar(player, goal, id)
        }
        ui2.input("name", "领地名", "输入领地名", land.name)
        ui2.show(player, (r) => {
          land.name = r.name
          save_land(land)
          viewLandBar(player, goal, id)
        })
      }
    })

    ui.btns.push({
      text: "编辑欢迎语",
      icon: ui_icon.content,
      func: () => {
        var ui2 = new infoBar()
        ui2.title = "编辑欢迎语"
        ui2.cancel = () => {
          viewLandBar(player, goal, id)
        }
        ui2.input("wel", "欢迎语", "输入欢迎语", land.wel)
        ui2.show(player, (r) => {
          land.wel = r.wel
          save_land(land)
          viewLandBar(player, goal, id)
        })
      }
    })

    ui.btns.push({
      text: "编辑开放队伍",
      icon: ui_icon.group,
      func: () => {
        var ui2 = new infoBar()
        ui2.title = "编辑开放队伍"
        ui2.cancel = () => {
          viewLandBar(player, goal, id)
        }
        ui2.input("group", "开放队伍(多个队伍间用英文,间隔)", "如:58965,695632,256699", array2line(land.group))
        ui2.show(player, (r) => {
          var groups = r.group.split(",")
          array_clear(groups, "")
          land.group = groups
          save_land(land)
          viewLandBar(player, goal, id)
        })
      }
    })

    ui.btns.push({
      text: "编辑成员权限",
      func: () => {
        editLandPermissionBar(player, goal, land, 0)
      }
    }, {
      text: "编辑访客权限",
      func: () => {
        editLandPermissionBar(player, goal, land, 1)
      }
    })

    ui.btns.push({
      text: "添加成员",
      icon: ui_icon.add,
      func: () => {
        var players = []
        for (var p of world.getAllPlayers()) {
          if (!array_has(land.member, p.name) && get_id(p) !== land.creater) {
            players.push(p)
          }
        }
        choosePlayer(player, players, (ps) => {
          for (var p of ps) {
            land.member.push(p.name)
          }
          save_land(land)
          viewLandBar(player, goal, id)
        })
      }
    })

    if (land.member.length > 0) {
      ui.btns.push({
        text: "移除成员",
        icon: ui_icon.rubbish,
        func: () => {
          var ui2 = new infoBar()
          ui2.title = "移除成员"
          ui2.cancel = () => {
            viewLandBar(player, goal, id)
          }
          ui2.options("id", "移除成员", land.member, 0)
          ui2.show(player, (r) => {
            land.member.splice(r.id, 1)
            save_land(land)
            viewLandBar(player, goal, id)
          })
        }
      })
    }

    ui.btns.push({
      text: "删除领地",
      icon: ui_icon.delete,
      func: () => {
        confirm(player, "确认删除领地？", (r) => {
          if (r) {
            var index = lands.ids.indexOf(land.id)
            lands.ids.splice(index, 1)
            lands.min.splice(index, 1)
            lands.max.splice(index, 1)
            array_clear(goal.lands, land.id)
            save_player_lands(goal)
            save_lands()
            landBar(player, goal)

            var board = world.scoreboard.getObjective(config.land.board)
            if (!un(board)) {
              if (!un(goal.scoreboardIdentity) && is_number(land.price)) {
                board.addScore(goal, land.price)
              }
            }
          } else {
            viewLandBar(player, goal, id)
          }
        })
      }
    })
  } else {
    ui.btns.push({
      text: "关闭",
      icon: ui_icon.delete,
      func: () => { }
    })
  }
  ui.show(player)
}

function get_random_tp_range() {
  return random_int(config.tp.random_range * 2) - config.tp.random_range
}

function managerStoreGroupsBar(player, type) {
  var ui = new btnBar()
  ui.cancel = () => {
    manageStoreBar(player, 0)
  }
  ui.title = "编辑分组"
  ui.body = ["管理分组", "注意：分组添加后不能修改，只能删除重新添加"]
  ui.btns = [{
    text: "新增分组",
    icon: ui_icon.add,
    func: () => {
      var ui2 = new infoBar()
      ui2.cancel = () => {
        managerStoreGroupsBar(player, type)
      }
      ui2.title = "新增分组"
      ui2.input("name", "分组名称", "名称", "")
      add_pictures_choice(ui2, "选择图标")
      ui2.show(player, (r) => {
        if (r.name === "") {
          tip(player, "分组名称不能为空！", () => {
            managerStoreGroupsBar(player, type)
          })
          return
        }

        config.store.groups[r.name] = r.icon
        save_config()
        managerStoreGroupsBar(player, type)
      })
    }
  }, {
    text: "删除分组",
    icon: ui_icon.delete,
    func: () => {
      var groups = config.store.groups

      var ui2 = new infoBar()
      ui2.cancel = () => {
        managerStoreGroupsBar(player, type)
      }
      ui2.title = "删除分组"
      for (var name in groups) {
        ui2.toggle(name, name, false)
      }

      ui2.show(player, (r) => {
        for (var name in r) {
          if (r[name]) {
            delete groups[name]
          }
        }
        save_config()
        managerStoreGroupsBar(player, type)
      })
    }
  }]

  var groups = []
  groups = config.store.groups
  for (var g of Object.keys(groups)) {
    var gg = g
    ui.btns.push({
      icon: pictures[groups[gg]],
      text: gg,
      func: () => {
        managerStoreGroupsBar(player, type)
      }
    })
  }

  ui.show(player)
}

function manageStoreBar(player, type = 0) {
  var ui = new btnBar()
  ui.title = "管理商店"
  ui.body = "在这里编辑商店"
  ui.btns = [{
    text: "修改商店页面文字",
    icon: ui_icon.edit,
    func: () => {
      var texts = []
      if (type === 0) {
        texts = to_array(parse_json(get_data("global_store_text")), ["商店"])
      }
      var editor = new arrayEditor()
      editor.tran = true
      editor.back = () => {
        if (type === 0) {
          save_data("global_store_text", to_json(texts))
        }
        manageStoreBar(player, type)
      }
      editor.edit(player, texts)
    }
  }, {
    text: "配置分组",
    icon: ui_icon.group,
    func: () => {
      managerStoreGroupsBar(player, type)
    }
  }]

  if (type === 0) {
    ui.btns.push({
      text: "配置币种",
      icon: ui_icon.compass,
      func: () => {
        var ui2 = new infoBar()
        ui2.cancel = () => {
          manageStoreBar(player, 0)
        }
        ui2.cancel = () => {
          manageStoreBar(player, 0)
        }
        ui2.title = "币种"
        ui2.input("moneys", "统计货币的记分版，多个记分版直接用英文分号;间隔，币种名即为记分版名称", "输入记分版ID", config.store.moneys)
        ui2.show(player, (r) => {
          config.store.moneys = r.moneys
          save_config()
          manageStoreBar(player, 0)
        })
      }
    })
  }

  ui.btns.push({
    text: "配置代码说明",
    icon: ui_icon.info,
    func: () => {
      confirm(player, array2string([
        "配置类型:",
        `1.给予玩家物品。\n格式:{"item":"物品ID","amount":物品数量}\n例如:{"item":"minecraft:apple","amount":64}`,
        `2.抽取箱子中的物品。物品的数量即为抽到该物品的权重，若物品不可堆叠,则这个物品的下一个物品不在抽取范围内,下一个物品的数量为这个物品的权重。箱子必须在主世界的常加载区块。\n格式:{"x":x坐标,"y":y坐标,"z":z坐标,"c":物品数量}"\n例：{"x":0,"y":0,"z":0,"c":5}`,
        `3.传送。\n格式:{"tp":"tp命令的坐标格式"}\n例如:{"tp":"100 25 67"}、{"tp":"~ ~1000 ~"}`,
        `4.执行命令\n格式:{"command":["命令1","命令2","命令3"]}  以此类推\n例如:{"command":["say hello","say hi"]}`,
        `§e注意：代码无效不会返还物品、记分版分数，所以请测试一下代码是否能正常运行！`
      ]), () => {
        manageStoreBar(player, type)
      })
    }
  }, {
    text: "添加商品",
    icon: ui_icon.add,
    func: () => {
      editGoodBar(player, type, {})
    }
  })
  if (global_goods.length > 0) {
    ui.btns.push({
      text: "删除商品",
      icon: ui_icon.delete,
      func: () => {
        var ui2 = new infoBar()
        ui2.title = "删除商品"
        for (var id of global_goods) {
          var g = get_global_good(id)
          ui2.toggle(id, g.title, false)
        }
        ui2.cancel = () => {
          manageStoreBar(player, type)
        }
        ui2.show(player, (r) => {
          for (var id in r) {
            if (r[id] === true) {
              array_clear(global_goods, id)
            }
          }
          save_global_goods()
          manageStoreBar(player, type)
        })
      }
    }, {
      text: "刷新商品限量",
      icon: ui_icon.random,
      func: () => {
        var ui2 = new infoBar()
        ui2.title = "刷新商品"
        for (var id of global_goods) {
          var g = get_global_good(id)
          ui2.toggle(id, g.title, false)
        }
        ui2.cancel = () => {
          manageStoreBar(player, type)
        }
        ui2.show(player, (r) => {
          for (var id in r) {
            if (r[id] === true) {
              update_good(get_global_good(id), true)
            }
          }
          manageStoreBar(player, type)
        })
      }
    })
  }

  if (type === 0) {
    for (var id of global_goods) {
      var g = get_global_good(id)
      ui.btns.push({
        text: g.title,
        icon: get_good_icon(g),
        op: {
          id: id
        },
        func: (op) => {
          editGoodBar(player, 0, get_global_good(op.id))
        }
      })
    }
  }

  ui.show(player)
}

function get_good_icon(g) {
  if (g.icon !== null) {
    return pictures[g.icon]
  }
  if (g.custom_icon !== "") {
    return g.custom_icon
  }
  return null
}

function get_global_good(id) {
  var g = to_object(parse_json(get_data(id)))
  update_good(g)
  return g
}

function get_moneys() {
  var s = config.store.moneys.split(";")
  return s
}

function selectGoodTypeBar(player, type, good, save) {
  var ui = new infoBar()
  ui.title = "选择商品类型"
  ui.options("type", "类型", ["售卖物品(记录所有特殊值)", "收购物品(仅记录物品ID)", "礼品"], 0)
  ui.cancel = () => {
    if (type === 0) {
      manageStoreBar(player, type)
    } else {
      save(false)
    }
  }
  ui.show(player, (r) => {
    good.type = r.type
    good.id = String(Date.now())
    editGoodBar(player, type, good, save)
  })
}

function editGoodBar(player, type, good, save = function () { }) {
  var fir = false
  if (un(good.type)) {
    good = {
      ...data_format.good
    }
  }
  if (good.type === 9) {
    fir = true
    selectGoodTypeBar(player, type, good, save)
    return
  }

  var groups = ["无"].concat(Object.keys(config.store.groups))
  var moneys = ["以物易物(仅售卖、礼品有效)"].concat(get_moneys())

  /*
  {   
      id : "",
      state : 0 ,0-在售 1-停售
      group : "",
      title : "",
      index : 0,
      global_count : 0,
      personal_count : 0,
      update_type : 0, 0-不刷新 1-固定时间 2-每小时 3-每天 4-每月
      update_time : 60, 刷新间隔时间/s，选择固定时间后才有用
      money : "", 币种,空则为以物易物
      money_item : "", 以物易物id
      price : 1, 单价
      icon : "", 图标
      custom_icon : "", 自定义图标
      name : "", 物品名称
      description : "",物品简介
      chest : "", 售卖、快速售卖专用,容器id
      slot : 0, 售卖、快速售卖专用,物品序号id
      item : "minecraft:", 收购专用,物品id
      hide : false, 礼品专用，领取后不再显示
      bar : 0, 条样式
      count : 1, 售卖专用，一次交易的物品数量,
      code : "", 售卖、礼品专用，配置
      back : false
  }
  */

  var ui = new infoBar()
  ui.title = "编辑商品"
  ui.cancel = () => {
    if (type === 0) {
      manageStoreBar(player, type)
    } else {
      save(false)
    }
  }
  ui.options("state", "状态", ["在售", "停售"], good.state)
  ui.input("title", "标题", "输入标题", good.title)
  if (type === 0) {
    ui.options("group", "分组", groups, (array_has(groups, good.group) ? groups.indexOf(good.group) : 0))
    ui.range("index", "优先级(越高显示在越前面,相同时随机排列)", 0, 100, 1, good.index)
  }
  ui.input("global_count", "全图限量(限制交易次数，不是物品数量)", "总限量数,0则不限量", String(good.global_count))
  ui.input("personal_count", "玩家限量(限制交易次数，不是物品数量)", "总限量数,0则不限量", String(good.personal_count))
  ui.options("update_type", "限量刷新方案(不限量不需要填)", ["不刷新", "隔固定时间刷新", "每小时整更新", "每天0点更新", "每月1日更新"], good.update_type)
  ui.input("update_time", "刷新间隔时间/秒(仅选择\"隔固定时间刷新\"才填)", "时间/秒", String(good.update_time))
  ui.options("money", "币种", moneys, array_has(moneys, good.money) ? moneys.indexOf(good.money) : 0)
  ui.input("money_item", "以物易物时用于交换的物品ID", "", good.money_item)
  ui.input("price", "单价(记分版分数/交换物品数量)", "价格必须为整数或0", String(good.price))
  add_pictures_choice(ui, "预选图标（预选图标优先级大于自定义图标）", good.icon)
  ui.input("custom_icon", "自定义路径图标", "输入路径，如textures/items/totem.png", good.custom_icon)
  ui.input("name", "交易(或物品)名称", "输入名称", good.name)
  ui.input("description", "交易描述", "输入描述", good.description)
  ui.toggle("back", "交易后[关闭页面|返回上一页面]", good.back)

  switch (good.type) {
    case 0:
      ui.options("op", "操作售卖的物品", ["不变(第一次设置时不要选这个)", "更改为当前手持物品", "更改为物品栏第1个物品", "更改为物品栏第2个物品", "更改为物品栏第3个物品", "更改为物品栏第4个物品", "更改为物品栏第5个物品", "更改为物品栏第6个物品", "更改为物品栏第7个物品", "更改为物品栏第8个物品", "更改为物品栏第9个物品"], (good.chest === "" ? 1 : 0))
      ui.range("count", "单次售卖物品数量", 1, 64, 1, good.count)
      ui.options("bar", "玩家选择交易数量的样式", ["手动输入", "范围条(1-10)", "范围条(1-16)", "范围条(1-64)", "范围条(1-256)", "快速售卖(点击标题立即购买)"], good.bar)
      ui.input("code", "§e配置代码(用于实现特殊功能，填写后将覆盖原本售卖的物品，如果你不知道请勿填写)", "", good.code)
      break
    case 1:
      ui.input("item", "收购的物品ID", "输入物品id，需要前缀", good.item)
      ui.options("bar", "玩家选择交易数量的样式", ["手动输入(推荐)", "范围条(1-10)", "范围条(1-16)", "范围条(1-64)", "范围条(1-256)"], good.bar)
      break
    case 2:
      ui.input("code", "§e配置代码", "", good.code)
      ui.toggle("hide", "领取完后隐藏", good.hide)
      break
  }

  ui.show(player, (r) => {
    good.state = r.state
    good.updated = Date.now()
    if (type === 0) {
      good.group = (r.group === 0) ? "" : groups[r.group]
      good.index = Math.round(r.index)
    }
    good.title = r.title
    good.global_count = to_number(parseInt(r.global_count), good.global_count)
    good.last = good.global_count
    good.personal_count = to_number(parseInt(r.personal_count), good.personal_count)
    good.update_type = r.update_type
    good.update_time = to_number(parseInt(r.update_time), good.update_time)
    if (r.money === 0) {
      good.money = ""
    } else {
      good.money = moneys[r.money]
    }
    good.money_item = r.money_item
    good.price = to_number(parseInt(r.price), good.price)
    good.icon = r.icon
    good.custom_icon = r.custom_icon
    good.name = r.name
    good.description = r.description
    good.back = r.back
    switch (good.type) {
      case 0:
        good.count = Math.round(r.count)
        good.bar = r.bar
        good.code = r.code
        if (r.op !== 0) {
          var item = get_player_hand_item(player)
          if (r.op >= 2) {
            item = player.slots.getItem(r.op - 2)
          }
          if (un(item)) {
            chat("§e无法获取手持物品，售卖物品更改失败！", [player], false)
          } else {
            set_store_item(item, (chest, slot) => {
              good.chest = chest
              good.slot = slot
              save_data(good.id, to_json(good))
            })
          }
        }

        break
      case 1:
        good.item = r.item
        good.bar = r.bar
        break
      case 2:
        good.code = r.code
        good.hide = r.hide
        break
    }

    if (type === 0) {
      save_data(good.id, to_json(good))
      if (!array_has(global_goods, good.id)) {
        global_goods.push(good.id)
        save_global_goods()
      }
      manageStoreBar(player, type)
    } else {
      save(good, true)
    }

  })
}

var working_pool = []

function set_store_item(item, func = function (_chest, _slot) { }) {
  working_pool.push({
    type: 0,
    item: item,
    func: func
  })
}

function get_store_item(chest, slot, func = function (_item) { }) {
  if (chest === "") {
    return
  }
  working_pool.push({
    type: 1,
    chest: chest,
    slot: slot,
    func: func
  })
}

system_ids.works = system.runInterval(() => {
  try {
    var block = overworld.getBlock({
      x: 5,
      y: 319,
      z: 5
    })
    if (un(block)) {
      overworld.runCommand("tickingarea add 0 0 0 15 0 15 USF")
    }
  } catch (err) {
    overworld.runCommand("tickingarea add 0 0 0 15 0 15 USF")
  }
  if (working_pool.length > 0) {
    try {
      var c = working_pool[0]
      if (c.type === 0) {
        var chest = ""
        for (var key of chests) {
          if (key.indexOf("*") !== 0) {
            chest = key
            break
          }
        }
        var str
        if (chest === "") {
          var id = "usf:" + String(Date.now())
          var block = overworld.getBlock({
            x: 5,
            y: 319,
            z: 5
          })
          block.setType("minecraft:chest")
          var com = block.getComponent("minecraft:inventory")
          com.container.setItem(0, c.item)
          str = world.structureManager.createFromWorld(id, overworld, {
            x: 5,
            y: 319,
            z: 5
          }, {
            x: 5,
            y: 319,
            z: 5
          }, {
            saveMode: "World",
            includeBlocks: true,
            includeEntities: false
          })
          str.saveToWorld()
          overworld.runCommand("setblock 5 319 5 air")

          chests.push(id)
          save_data("chests", to_json(chests))

          c.func(id, 0)
          working_pool.splice(0, 1)
        } else {
          world.structureManager.place(chest, overworld, {
            x: 5,
            y: 319,
            z: 5
          })
          var block = overworld.getBlock({
            x: 5,
            y: 319,
            z: 5
          })
          var com = block.getComponent("minecraft:inventory")
          var first = get_first_empty(com.container)
          com.container.setItem(first, c.item)

          if (com.container.emptySlotsCount === 0) {
            array_clear(chests, chest)
            chests.push("*" + chest)
            save_data("chests", to_json(chests))
          }
          world.structureManager.delete(chest)
          str = world.structureManager.createFromWorld(chest, overworld, {
            x: 5,
            y: 319,
            z: 5
          }, {
            x: 5,
            y: 319,
            z: 5
          }, {
            saveMode: "World",
            includeBlocks: true,
            includeEntities: false
          })
          str.saveToWorld()

          overworld.runCommand("setblock 5 319 5 air")

          c.func(chest, first)
        }
      } else {
        world.structureManager.place(c.chest, overworld, {
          x: 5,
          y: 319,
          z: 5
        })
        var block = overworld.getBlock({
          x: 5,
          y: 319,
          z: 5
        })
        var com = block.getComponent("minecraft:inventory")
        var item = com.container.getItem(c.slot)
        overworld.runCommand("setblock 5 319 5 air")

        c.func(item)
      }
    } catch (err) { }
    working_pool.splice(0, 1)
  }
}, 5)

function get_first_empty(container) {
  if (container.emptySlotsCount === 0) {
    return -1
  }
  for (var i = 0; i < container.size; i++) {
    if (un(container.getItem(i))) {
      return i
    }
  }

  return -1
}

function storeBar(player, type = 0, group = "") {
  var ui = new btnBar()
  ui.title = "商店"
  ui.body = tran_text(player, to_array(parse_json(get_data("global_store_text")), ["商店"]))

  if (get_op_level(player) >= 1 && type === 0) {
    ui.btns.push({
      text: "管理全局商店",
      icon: ui_icon.setting,
      func: () => {
        manageStoreBar(player, 0)
      }
    })
  }

  if (group === "") {
    var groups = Object.keys(config.store.groups)
    for (var g of groups) {
      ui.btns.push({
        text: g,
        op: {
          g: g
        },
        icon: (typeof (config.store.groups[g]) === "string" ? pictures[config.store.groups[g]] : null),
        func: (op) => {
          storeBar(player, type, op.g)
        }
      })
    }
  } else {
    ui.btns.push({
      text: "返回",
      icon: ui_icon.back,
      func: () => {
        storeBar(player, type)
      }
    })
  }

  var goods = []
  if (type === 0) {
    for (var id of global_goods) {
      var g = get_global_good(id)
      if (g.group === group && g.state === 0) {
        if (((get_personal_buy(player, g) >= g.personal_count && g.personal_count > 0) || (g.last === 0 && g.global_count > 0)) && g.hide) { } else {
          goods.push(g)
        }

      }
    }
  }
  var btns = []
  for (var g of goods) {
    if (btns.length === 0) {
      btns.push({
        text: g.title,
        icon: get_good_icon(g),
        op: {
          id: g.id,
          index: g.index
        },
        func: (op) => {
          dealGoodBar(player, 0, group, op.id)
        }
      })
    } else {
      for (var i = 0; i <= btns.length; i++) {
        if (i < btns.length) {
          if (g.index > btns[i].op.index) {
            btns.splice(i, 0, {
              text: g.title,
              icon: get_good_icon(g),
              op: {
                id: g.id,
                index: g.index
              },
              func: (op) => {
                dealGoodBar(player, 0, group, op.id)
              }
            })
            break
          }
        } else {
          btns.push({
            text: g.title,
            icon: get_good_icon(g),
            op: {
              id: g.id,
              index: g.index
            },
            func: (op) => {
              dealGoodBar(player, 0, group, op.id)
            }
          })
          break
        }
      }
    }
  }
  ui.btns = ui.btns.concat(btns)

  ui.show(player)

}

function update_good(g, force = false) {
  var date = new Date(g.updated)
  var now = get_date_object_China_time()
  if (force) {
    g.last = g.global_count
    g.updated = get_date_now_China_time()
  }
  switch (g.update_type) {
    case 1:
      if (get_date_now_China_time() - g.updated >= g.update_time * 1000) {
        g.last = g.global_count
        g.updated = get_date_now_China_time()
      }
      break
    case 2:
      if (now.getHours() !== date.getHours() || now.getDate() !== date.getDate() || date.getMonth() !== now.getMonth()) {
        g.last = g.global_count
        g.updated = get_date_now_China_time()
      }
      break
    case 3:
      if (now.getDate() !== date.getDate() || date.getMonth() !== now.getMonth()) {
        g.last = g.global_count
        g.updated = get_date_now_China_time()
      }
      break
    case 4:
      if (date.getMonth() !== now.getMonth()) {
        g.last = g.global_count
        g.updated = get_date_now_China_time()
      }
      break
  }

  save_global_good(g)
}

function save_global_good(g) {
  save_data(g.id, to_json(g))
}

function dealGoodBar(player, type, group, id, back = function () { }) {
  var good = {}
  if (type !== 2) {
    good = get_global_good(id)
  } else {
    good = id
  }
  var board
  if (good.money !== "") {
    board = world.scoreboard.getObjective(good.money)
    if (un(board)) {
      chat("§e[商店系统]配置错误！币种不存在！", [player])
      return
    }
  } else {
    if (good.type === 1) {
      chat("§e[商店系统]配置错误！币种不存在！", [player])
      return
    }
  }
  if (good.type === 0) {
    if (good.chest === "") {
      chat("§e[商店系统]配置错误！售卖物品未录入！", [player])
      return
    }
  }
  var text = [
    `§e商品名:§r${good.name}`,
    `§e商品描述:§r${good.description}`,
    `§e限量:§r${(good.global_count === 0) ? "无限" : String(good.global_count - good.last) + "/" + String(good.global_count)}`,
    `§e个人限量:§r${(good.personal_count === 0) ? "无限" : String(get_personal_buy(player, good)) + "/" + String(good.personal_count)}`,
  ]

  switch (good.type) {
    case 0:
      if (good.money === "") {
        text.push("§e货币物品:§r" + good.money_item)
        text.push("§e需要的物品数量(价格):§r" + String(good.price))
      } else {
        text.push("§e货币:§r" + board.displayName)
        text.push("§e价格:§r" + String(good.price))
      }
      break
    case 1:
      if (good.money === "") {
        chat("§e[商店系统]配置错误！", [player])
        return
      } else {
        text.push("§e货币:§r" + board.displayName)
        text.push("§e回收价格/个:§r" + String(good.price))
      }
      break
  }
  if (!un(player.store_record[good.id])) {
    if (player.store_record[good.id].updated !== good.updated) {
      player.store_record[good.id].count = 0
      player.store_record[good.id].updated = good.updated
      save_store_record(player)
    }
  }
  if ((get_personal_buy(player, good) >= good.personal_count && good.personal_count > 0) || (good.last === 0 && good.global_count > 0)) {
    if (good.type === 0 && good.bar === 5) {
      chat("§e[商店系统]已售馨！", [player])
      return
    }
    text.push("\n§e已售馨！")
    var ui = new btnBar()
    ui.title = good.name
    ui.body = tran_text(player, text)
    if (type === 0 && good.back) {
      ui.cancel = () => {
        storeBar(player, 0, group)
      }
    }
    if (type > 0) {
      ui.cancel = () => {
        back()
      }
    }
    ui.btns = [{
      text: "返回",
      icon: ui_icon.back,
      func: () => {
        storeBar(player, dara, group)
      }
    }]
    ui.show(player)
  } else {
    if (good.bar === 5) {
      dealOrderBar(player, good, {
        count: 1,
        one_count: good.count
      })
      return
    }

    var ui = new infoBar()
    ui.title = good.name
    var trade_text = "购买数量"
    if (good.type === 1) {
      trade_text = "收购数量(1-512)"
    }
    if (good.type === 2) {
      var ui = new btnBar()
      ui.title = good.name
      ui.body = text
      ui.btns = [{
        text: "领取",
        func: () => {
          dealOrderBar(player, good)
        }
      }]
      ui.show(player)
      return
    }
    if (type === 0 && good.back) {
      ui.cancel = () => {
        storeBar(player, 0, group)
      }
    }
    if (type > 0) {
      ui.cancel = () => {
        back()
      }
    }
    //["手动输入","范围条(1-10)","范围条(1-16)","范围条(1-64)","范围条(1-256)","快速售卖(点击标题立即购买)"
    switch (good.bar) {
      case 0:
        ui.input("count", array2string(text) + "\n\n" + trade_text, "输入整数", "1")
        break
      case 1:
        ui.range("count", array2string(text) + "\n\n" + trade_text, 1, 10, 1, 1)
        break
      case 2:
        ui.range("count", array2string(text) + "\n\n" + trade_text, 1, 16, 1, 1)
        break
      case 3:
        ui.range("count", array2string(text) + "\n\n" + trade_text, 1, 64, 1, 1)
        break
      case 4:
        ui.range("count", array2string(text) + "\n\n" + trade_text, 1, 256, 1, 1)
        break
    }
    ui.show(player, (r) => {
      var count = r.count
      if (is_string(count)) {
        count = parseInt(count)
      }
      count = to_number(count, 0)
      if (count <= 0 || count > 512) {
        chat("§e[商店系统]无法解析数量!", [player])
      } else {
        if ((good.global_count === 0 || count <= good.last) && (good.personal_count === 0 || good.personal_count - get_player_store_record_count(player, id) >= count)) {
          dealOrderBar(player, good, {
            count: count,
            one_count: good.count
          })
        } else {
          chat("§e[商店系统]数量超过限制!", [player])
        }
      }

      if (type === 0 && good.back) {
        storeBar(player, 0, group)
      }
      if (type > 0) {
        back()
      }
    })
  }
}

function get_player_store_record_count(player, id) {
  if (un(player.store_record[id])) {
    return 0
  } else {
    return player.store_record[id].count
  }
}

function deal_money(player, good, price) {
  var id = good.money
  if (id === "") {
    var con = player.getComponent("minecraft:inventory").container
    return container_remove(con, good.money_item, price)
  } else {
    var board = world.scoreboard.getObjective(id)
    return board_reduce(player, board, price)
  }
}

function dealOrderBar(player, good, data = {
  count: 1
}) {
  switch (good.type) {
    case 2:
      if (deal_money(player, good, good.price)) {
        run_code(player, good.code)
      } else {
        chat("§e[商店系统]条件不足,领取失败！", [player])
      }
      break
    case 1:
      var con = player.getComponent("minecraft:inventory").container
      if (container_remove(con, good.item, data.count)) {
        var board = world.scoreboard.getObjective(good.money)
        board_add(player, board, good.price * data.count)
        score_event(player, "earn", "", good.price * data.count)
      } else {
        chat("§e[商店系统]物品不足,收购失败！", [player])
      }
      break
    case 0:
      var c = data.count * good.price
      if (good.money !== "") {
        c = data.count * good.price
      }
      if (deal_money(player, good, c)) {
        score_event(player, "buy", "", good.price * data.count)
        if (good.code !== "") {
          for (var i = 0; i < data.count; i++) {
            run_code(player, good.code)
          }
        } else {
          get_store_item(good.chest, good.slot, (item) => {
            item.amount = 1
            for (var i = 0; i < data.count * data.one_count; i++) {
              player.dimension.spawnItem(item, player.location)
            }
          })
        }
      } else {
        chat("§e[商店系统]条件不足,购买失败！", [player])
      }
      break
  }

  if (good.global_count > 0) {
    good.last = good.last - data.count
    save_global_good(good)
  }
  if (good.personal_count > 0) {
    if (un(player.store_record[good.id])) {
      player.store_record[good.id] = {
        updated: good.updated,
        count: data.count
      }
    } else {
      player.store_record[good.id].count = data.count + player.store_record[good.id].count
    }
    save_store_record(player)
  }
}

function run_code(player, code) {
  try {
    code = parse_json(code)
    if (Object.keys(code) === 0) {
      return chat("§e[商店系统]解析失败！", [player])
    }

    if (is_number(code.x) && is_number(code.y) && is_number(code.z) && is_number(code.c)) {
      var block = overworld.getBlock(code)
      var con = block.getComponent("minecraft:inventory").container
      var weights = []
      var total = 0
      for (var i = 0; i < con.size; i++) {
        var item = con.getItem(i)
        if (!un(item)) {
          if (item.maxAmount === 1) {
            var amount = item.amount
            var item2 = con.getItem(i + 1)
            if (!un(item2)) {
              amount = item2.amount
              weights.push(amount)
              weights.push(0)
              total += amount
              i += 1
            }
          } else {
            weights.push(item.amount)
            total += item.amount
          }
        } else {
          weights.push(0)
        }
      }

      for (var i = 0; i < code.c; i++) {
        var r = random_int(total) + 1
        for (var cf = 0; cf < weights.length; cf++) {
          r -= weights[cf]
          if (r <= 0) {
            var item = con.getItem(cf)
            item.amount = 1
            player.dimension.spawnItem(item, player.location)
            break
          }
        }
      }
    }

    if (is_string(code.tp)) {
      player.runCommand(`tp @s ${code.tp}`)
    }

    if (is_array(code.command)) {
      for (var i = 0; i < code.command.length; i++) {
        if (is_string(code.command[i])) {
          player.runCommand(code.command[i])
        }
      }
    }

    if (is_string(code.item) && is_number(code.amount)) {
      if (code.amount > 512) {
        code.amount = 512
      }
      var item = new ItemStack(code.item, 1)
      for (var i = 0; i < code.amount; i++) {
        var con = player.getComponent("minecraft:inventory").container
        player.dimension.spawnItem(item, player.location)
      }
    }
  } catch (err) {
    chat("§e[商店系统]运行失败！", [player])
    log("§e[商店系统]运行失败！错误:" + err, [], "warn")
  }
}

function board_reduce(goal, board, score, force = false) {
  if (get_score(board, goal) >= score || force) {
    board.setScore(goal, get_score(board, goal) - score)
    return true
  }
  return false
}

function board_add(goal, board, score) {
  board.setScore(goal, get_score(board, goal) + score)
}

function container_remove(con, id, count) {
  var total = 0
  var slots = []
  for (var i = 0; i < con.size; i++) {
    var item = con.getItem(i)
    if (!un(item)) {
      if (item.typeId === id) {
        slots.push(con.getSlot(i))
        total += item.amount
      }
    }
  }

  if (total >= count) {
    for (var slot of slots) {
      if (slot.amount > count) {
        slot.amount -= count
        count = 0
      } else {
        count -= slot.amount
        slot.setItem()
      }
    }
    return true
  }
  return false
}

function get_personal_buy(player, g) {
  if (un(player.store_record[g.id])) {
    return 0
  }
  var c = player.store_record[g.id]
  if (c.updated !== g.updated) {
    c.count = 0
    c.updated = g.updated
    save_store_record(player)
    return 0
  }
  return c.count
}

function editConfigFileBar(player) {
  if (get_op_level(player) < 1) {
    return
  }

  if (Date.now() - to_number(player.last_cf) < 1000) {
    return
  } else {
    player.last_cf = Date.now()
  }

  var slot = get_player_offhand_slot(player)
  if (un(slot) || !slot.hasItem()) {
    return
  }
  var data = to_object(parse_json(get_data("data", slot)))
  if (un(data.title)) {
    object_override(data, data_format.config_file)
  }
  var ui = new btnBar()
  ui.title = "编辑策略文件"
  ui.body = ["更改此策略文件", "注意：策略文件应用后无法直接通过设置界面修改，请妥善保存策略文件物品", "当没有设置按钮时，不会显示页面，但会运行打开界面时的指令"]
  ui.btns = [{
    text: "修改配置",
    icon: ui_icon.compass,
    func: () => {
      var ui2 = new infoBar()
      ui2.title = "策略文件的配置设置"
      ui2.cancel = () => {
        editConfigFileBar(player)
      }
      ui2.input("name", "策略文件的物品名(仅用于备注)", "输入名字", to_string(slot.nameTag))
      ui2.input("title", "策略文件标题", "输入标题，显示在页面顶上", data.title)
      ui2.input("body", "策略文件界面内容", "输入内容", data.body)
      ui2.options("operation", "关闭二级菜单后的操作", ["返回菜单", "关闭页面"], to_number(data.operation, 0))
      ui2.input("in", '打开界面时执行的命令\n格式为["命令1","命令2","命令3"]', "输入指令", to_string(data.in))
      ui2.input("out", '直接关闭界面时执行的命令\n格式为["命令1","命令2","命令3"]', "输入指令", to_string(data.out))
      ui2.show(player, (r) => {
        data.title = r.title
        data.body = r.body
        data.operation = r.operation
        data.in = r.in
        data.out = r.out
        if (r.name === "") {
          slot.nameTag = undefined
        } else {
          slot.nameTag = r.name
        }
        save_data("data", to_json(data), slot)
        editConfigFileBar(player)
      })
    }
  }, {
    text: "二级菜单",
    icon: ui_icon.copy,
    func: () => {
      editConfigSecondBar(player, slot, data)
    }
  }, {
    text: "添加按钮",
    icon: ui_icon.add,
    func: () => {
      editBtnBar(player, slot, data, data.things.length)
    }
  }]

  if (data.things.length > 0) {
    ui.btns.push({
      text: "删除按钮",
      icon: ui_icon.delete,
      func: () => {
        var ui2 = new infoBar()
        ui2.title = "删除按钮"
        for (var t = 0; t < data.things.length; t++) {
          ui2.toggle("b", data.things[t].title, false)
        }
        ui2.cancel = () => {
          editConfigFileBar(player)
        }
        ui2.show(player, (r) => {
          var goals = []
          if (is_bool(r.b)) {
            if (r.b) {
              data.things = []
            }
          } else {
            for (var i = 0; i < r.b.length; i++) {
              if (r.b[i] === true) {
                goals.push(data.things[i])
              }
            }
          }
          for (var btn of goals) {
            array_clear(data.things, btn)
          }

          save_data("data", to_json(data), slot)
          editConfigFileBar(player)
        })
      }
    })
    ui.btns.push({
      text: "预览",
      icon: ui_icon.eye,
      func: () => {
        showConfigBar(player, data)
      }
    })
  }

  for (var i = 0; i < data.things.length; i++) {
    var btn = data.things[i]
    ui.btns.push({
      text: btn.title,
      icon: get_good_icon(btn),
      op: {
        index: i
      },
      func: (op) => {
        editBtnBar(player, slot, data, op.index)
      }
    })
  }

  ui.show(player)
}

function showConfigBar(player, data, group = "", first = true) {
  if (data.things.length === 0) {
    return
  }

  var ui = new btnBar()
  ui.title = data.title
  ui.body = tran_text(player, data.body)
  if (group !== "" && data.operation === 0) {
    ui.cancel = () => {
      showConfigBar(player, data, "", false)
    }
  }
  if (first && to_string(data.in) !== "" && group === "") {
    var commands = to_array(parse_json(data.in))
    for (var i = 0; i < commands.length; i++) {
      try {
        player.runCommand(commands[i])
      } catch (err) { }
    }
  }
  if (group === "" && to_string(data.out) !== "") {
    ui.cancel = () => {
      var commands = to_array(parse_json(data.out))
      for (var i = 0; i < commands.length; i++) {
        try {
          player.runCommand(commands[i])
        } catch (err) { }
      }
    }
  }

  if (group === "") {
    for (var name in data.groups) {
      ui.btns.push({
        text: name,
        icon: (data.groups[name] === "") ? null : pictures[data.groups[name]],
        op: {
          name: name
        },
        func: (op) => {
          showConfigBar(player, data, op.name, false)
        }
      })
    }
  } else {
    ui.btns.push({
      text: "返回",
      icon: ui_icon.back,
      func: () => {
        showConfigBar(player, data, "", false)
      }
    })
  }

  var btns = []
  for (var btn of data.things) {
    if (btn.group === group) {
      if (to_string(btn.tag) === "" || player.hasTag(to_string(btn.tag))) {
        btns.push(btn)
      }
    }
  }
  if (btns.length === 0) {
    if (group === "") {
      if (data.groups.length === 0) {
        return
      }
    } else {
      showConfigBar(player, data, "", false)
      return
    }
  }

  var ui_btns = ui.btns
  for (var btn of btns) {
    if (ui_btns.length === 0) {
      ui_btns.push({
        text: btn.title,
        icon: get_good_icon(btn),
        op: btn,
        func: (op) => {
          run_btn(player, op, data, group)
        }
      })
    } else {
      for (var i = 1; i <= ui_btns.length; i++) {
        if (i < ui_btns.length) {
          if (btn.index > ui_btns[i].op.index) {
            ui_btns.splice(i, 0, {
              text: btn.title,
              icon: get_good_icon(btn),
              op: btn,
              func: (op) => {
                run_btn(player, op, data, group)
              }
            })
            break
          }
        } else {
          ui_btns.push({
            text: btn.title,
            icon: get_good_icon(btn),
            op: btn,
            func: (op) => {
              run_btn(player, op, data, group)
            }
          })
          break
        }
      }
    }
  }
  /* for(var btn of btns){
      ui.btns.push({
          text : btn.title,
          icon : get_good_icon(btn),
          op : btn,
          func : (op)=>{
              run_btn(player,op,data,group)
          }
      })
  } */
  ui.show(player)
}

function open_page(player, page) {
  switch (page) {
    case "cd":
      cdBar(player)
      break
    case "pos":
      posBar(player)
      break
    case "chat":
      setChatBar(player)
      break
    case "land":
      landBar(player, player)
      break
    case "group":
      groupsBar(player)
      break
    case "store":
      storeBar(player, 0, "")
      break
    case "tran":
      tranBar(player)
      break
    case "board":
      show_board(player, null, false)
      break

  }
}

function run_btn(player, btn, data, group) {
  switch (btn.type) {
    case 0:
      var commands = to_array(parse_json(btn.command))
      for (var c of commands) {
        player.runCommand(c)
      }
      if (btn.operation === 0) {
        showConfigBar(player, data, group, false)
      }
      break
    case 3:
      dealGoodBar(player, 1, "", btn.gid, () => {
        if (btn.operation === 0) {
          showConfigBar(player, data, group, false)
        }
      })
      break
    case 2:
      viewPosBar(player, btn.pos, false, new btnBar(), () => { }, () => {
        if (btn.operation === 0) {
          showConfigBar(player, data, group, false)
        }
      })
      break
    case 4:
      var ui = new btnBar()
      ui.title = btn.page_title
      ui.body = tran_text(player, btn.page)
      ui.cancel = () => {
        if (btn.operation === 0) {
          showConfigBar(player, data, group, false)
        }
      }
      ui.btns = [{
        text: "关闭",
        icon: ui_icon.delete,
        func: () => {
          if (btn.operation === 0) {
            showConfigBar(player, data, group, false)
          }
        }
      }]
      ui.show(player)
      break
    case 1:
      dealGoodBar(player, 2, "", btn.good, () => {
        if (btn.operation === 0) {
          showConfigBar(player, data, group, false)
        }
      })
      break
    case 5:
      posBar(player)
      break
    case 6:
      setChatBar(player)
      break
    case 7:
      landBar(player, player)
      break
    case 8:
      groupsBar(player)
      break
    case 9:
      storeBar(player, 0, "")
      break
    case 10:
      tranBar(player)
      break
    case 11:
      show_board(player, null, false)
      break
  }
}

function editBtnBar(player, slot, data, index) {
  var btn = {}
  if (index < data.things.length) {
    btn = data.things[index]
  }
  if (un(btn.index)) {
    var ui = new infoBar()
    ui.title = "设置操作类型"
    ui.cancel = () => {
      editConfigFileBar(player)
    }
    ui.options("op", "按钮操作", ["执行命令", "新商品", "传送点", "链接至全局商店的商品", "确认页面",
      "打开传送系统",
      "打开聊天设置",
      "打开领地系统",
      "打开群组系统",
      "打开商店系统",
      "打开转账机",
      "打开公告",
    ], 0)
    ui.show(player, (r) => {
      btn.type = r.op
      btn.group = ""
      btn.title = ""
      btn.custom_icon = ""
      btn.icon = ""
      btn.tag = ""
      btn.index = 0
      editBtnBar2(player, slot, data, btn, true)
    })
  } else {
    editBtnBar2(player, slot, data, btn, false)
  }
}

function editBtnBar2(player, slot, data, btn, save = false) {
  var groups = ["无"].concat(Object.keys(data.groups))
  var ui = new infoBar()
  ui.title = "设置按钮配置"
  ui.cancel = () => {
    editConfigFileBar(player)
  }
  ui.options("group", "按钮所属二级菜单", groups, array_has(groups, btn.group) ? array_index(groups, btn.group) : 0)
  ui.input("title", "按钮标题", "标题", btn.title)
  ui.range("index", "优先级(越高显示在越前面,相同时随机排列)", 0, 100, 1, btn.index)
  add_pictures_choice(ui, "预选图标（预选图标优先级大于自定义图标）", btn.icon)
  ui.input("custom_icon", "自定义路径图标", "输入路径，如textures/items/totem.png", btn.custom_icon)
  ui.options("operation", "执行按钮后的操作", ["返回菜单", "关闭页面"], to_number(btn.operation, 0))
  ui.input("tag", "标签(含该标签玩家才会显示)(不支持多标签)", "标签", to_string(btn.tag))
  ui.show(player, (r) => {
    btn.title = r.title
    btn.icon = r.icon
    btn.custom_icon = r.custom_icon
    btn.index = Math.round(r.index)
    btn.operation = r.operation
    btn.tag = r.tag
    if (r.group === 0) {
      btn.group = ""
    } else {
      btn.group = groups[r.group]
    }

    editBtnBar3(player, slot, data, btn, save)
  })
}

function editBtnBar3(player, slot, data, btn, save = false) {
  var ui = new infoBar()
  ui.title = "设置按钮配置"
  ui.cancel = () => {
    editConfigFileBar(player)
  }

  var names = []
  var ids = []
  if (btn.type === 3) {
    for (var id of global_goods) {
      var g = get_global_good(id)
      names.push(g.name)
      ids.push(id)
    }
  }

  switch (btn.type) {
    case 11:
      if (save) {
        data.things.push(btn)
      }
      save_data("data", to_json(data), slot)
      editConfigFileBar(player)
      return
    case 0:
      ui.input("command", '执行的命令\n格式:["命令1","命令2","命令3"]', "输入命令数组", to_string(btn.command))
      break
    case 1:
      var good = {}
      if (!save) {
        good = btn.good
      }
      editGoodBar(player, 1, good, (g, r) => {
        if (r) {
          btn.good = g
          if (save) {
            data.things.push(btn)
          }
          save_data("data", to_json(data), slot)
        }
        editConfigFileBar(player)
      })
      return
    case 2:
      var new_pos = {}
      if (!un(btn.pos)) {
        new_pos = btn.pos
      }
      editPosBar(player, new_pos, () => {
        if (save) {
          btn.pos = new_pos
          data.things.push(btn)
        }
        save_data("data", to_json(data), slot)
      }, () => {
        editConfigFileBar(player)
      })
      return
    case 4:
      ui.input("page_title", "页面标题", "标题", to_string(btn.page_title))
      ui.input("page", "页面内容", "内容", to_string(btn.page))
      break
    case 3:
      if (ids.length === 0) {
        confirm(player, "当前无全局商品可绑定！", () => {
          editConfigFileBar(player)
        })
        return
      }
      ui.options("gid", "绑定的商品", names, array_has(ids, to_string(btn.gid)) ? array_index(ids, btn.gid) : 0)
      break
  }
  ui.show(player, (r) => {
    switch (btn.type) {
      case 0:
        btn.command = r.command
        break
      case 4:
        btn.page_title = r.page_title
        btn.page = r.page
        break
      case 3:
        btn.gid = ids[r.gid]
        break
    }
    if (save) {
      btn.pos = new_pos
      data.things.push(btn)
    }
    save_data("data", to_json(data), slot)
    editConfigFileBar(player)
  })
}

function editConfigSecondBar(player, slot, data) {
  var ui = new btnBar()
  ui.title = "编辑二级菜单"
  ui.body = ["管理二级菜单", "注意：菜单添加后不能修改，只能删除重新添加"]
  ui.cancel = () => {
    editConfigFileBar(player)
  }
  ui.btns = [{
    text: "新增二级菜单",
    icon: ui_icon.add,
    func: () => {
      var ui2 = new infoBar()
      ui2.cancel = () => {
        editConfigSecondBar(player, slot, data)
      }
      ui2.title = "新增二级菜单"
      ui2.input("name", "菜单名称", "名称", "")
      add_pictures_choice(ui2, "选择图标")
      ui2.show(player, (r) => {
        if (r.name === "") {
          tip(player, "菜单名称不能为空！", () => {
            editConfigSecondBar(player, slot, data)
          })
          return
        }

        data.groups[r.name] = r.icon
        save_data("data", to_json(data), slot)
        editConfigSecondBar(player, slot, data)
      })
    }
  }, {
    text: "删除二级菜单",
    icon: ui_icon.delete,
    func: () => {
      var groups = data.groups

      var ui2 = new infoBar()
      ui2.cancel = () => {
        editConfigSecondBar(player, slot, data)
      }
      ui2.title = "删除二级菜单"
      for (var name in groups) {
        ui2.toggle(name, name, false)
      }

      ui2.show(player, (r) => {
        for (var name in r) {
          if (r[name]) {
            delete groups[name]
          }
        }
        save_data("data", to_json(data), slot)
        editConfigSecondBar(player, slot, data)
      })
    }
  }]

  var groups = []
  groups = data.groups
  for (var g of Object.keys(groups)) {
    var gg = g
    ui.btns.push({
      icon: pictures[groups[gg]],
      text: gg,
      func: () => {
        editConfigSecondBar(player, slot, data)
      }
    })
  }

  ui.show(player)
}

function cdBar(player) {
  if (Date.now() - to_number(player.last_cd) < 1000) {
    return
  } else {
    player.last_cd = Date.now()
  }

  if (player.landing.mode === 1) {
    if (player.isSneaking) {
      player.landing.mode = 0
      player.landing.points = []
      chat("§e[领地系统]已取消创建领地！", [player])
    } else {
      if (player.landing.points.length === 2) {
        createLandBar(player)
      } else {
        show_title(player, get_text("land.two"))
      }
    }
    return
  }

  push_text("cd.name", "主菜单")
  push_text("cd.pos", "传送系统")
  push_text("cd.kill", "自杀")
  push_text("cd.chat", "聊天设置")
  push_text("cd.land", "领地")
  push_text("cd.group", "群组")
  push_text("cd.board", "公告")

  var ui = new btnBar()
  ui.title = get_text("cd.name")
  ui.body = tran_text(player, to_array(parse_json(get_data("menu_text")), data_format.menu), true)
  ui.busy = null

  if (player.in_land !== "") {
    var land = get_land(player.in_land)
    ui.btns.push({
      text: `领地:${land.name}\n领地主:${(is_bool(land.public) ? "公共领地" : get_name_by_id(land.creater))}`,
      icon: ui_icon.land,
      func: () => {
        viewLandBar(player, player, land.id)
      }
    })
  }

  ui.btns.push({
    text: get_text("cd.pos"),
    icon: ui_icon.pos,
    func: () => {
      posBar(player)
    }
  })
  ui.btns.push({
    text: get_text("cd.chat"),
    icon: ui_icon.chat,
    func: () => {
      setChatBar(player)
    }
  })
  if (config.land.able) {
    ui.btns.push({
      text: get_text("cd.land"),
      icon: ui_icon.land,
      func: () => {
        landBar(player, player)
      }
    })
  }
  if (config.groups.able) {
    ui.btns.push({
      text: get_text("cd.group"),
      icon: ui_icon.player,
      func: () => {
        groupsBar(player)
      }
    })
  }
  if (config.daily.able) {
    var now = get_date_object_China_time()
    var date = new Date(to_number(player.info.daily, 0))
    if (date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth() || now.getDate() !== date.getDate()) {
      ui.btns.push({
        text: "签到",
        icon: pictures.gift,
        func: () => {
          var commands = to_array(parse_json(config.daily.command))
          for (var i = 0; i < commands.length; i++) {
            try {
              player.runCommand(commands[i])
            } catch (err) { }
          }
          player.info.daily = get_date_now_China_time()
          save_player_info(player)
        }
      })
    }
  }

  if (config.store.able) {
    ui.btns.push({
      text: "商店",
      icon: ui_icon.villager,
      func: () => {
        storeBar(player)
      }
    })
  }

  if (config.tran.able) {
    ui.btns.push({
      text: "转账机",
      icon: ui_icon.trade,
      func: () => {
        tranBar(player)
      }
    })
  }
  if (config.game.kill) {
    ui.btns.push({
      text: get_text("cd.kill"),
      icon: ui_icon.sword,
      func: () => {
        player.kill()
      }
    })
  }

  if (get_board_ids().length > 0 && config.board.able) {
    ui.btns.push({
      text: get_text("cd.board"),
      icon: ui_icon.sign,
      func: () => {
        show_board(player)
      }
    })
  }

  if (get_op_level(player) >= 1) {
    ui.btns.push({
      text: "管理界面",
      icon: ui_icon.op,
      func: () => {
        opBar(player)
      }
    })
  }
  ui.show(player)
}

function get_date_now_China_time() {
  var d = new Date()
  d = new Date(Date.now() + (8 - d.getTimezoneOffset()) * 3600000)
  return d.getTime()
}

function get_date_object_China_time() {
  var d = new Date()
  d = new Date(Date.now() + (8 - d.getTimezoneOffset()) * 3600000)
  return d
}

function usfTickCheck(player) {
  chat("正在进行时长为5s的性能检测...", [player])
  const start_tick = system.currentTick
  const startTime = Date.now()

  system.runTimeout(() => {
    const elapsedTime = (Date.now() - startTime) / 1000
    const tickDiff = system.currentTick - start_tick
    const tps = (tickDiff / elapsedTime).toFixed(2)

    let tps_text = "极其卡顿"
    if (tps > 10) {
      tps_text = "卡顿"
    }
    if (tps > 14) {
      tps_text = "不足"
    }
    if (tps > 16) {
      tps_text = "正常"
    }
    if (tps > 18) {
      tps_text = "优"
    }

    const ui = new btnBar()
    ui.title = "插件性能检查"
    ui.body = [
      "检测用时:" + elapsedTime.toFixed(2) + "s",
      `平均TPS:${tps}(${tps_text})`,
      `配置文件占用:${get_string_length(to_json(config))}/32767`
    ]
    ui.btns = [{
      text: "管理界面",
      icon: ui_icon.op,
      func: () => {
        opBar(player)
      }
    }]
    ui.show(player)
  }, 100)
}

function banListCheck(player) {
  var ui = new btnBar()
  ui.title = "封禁列表管理"
  ui.body = ["管理封禁列表",
    "注：玩家名与玩家id皆有效",
    "封禁列表:"
  ]

  var list = get_ban_list()
  for (var id of list) {
    ui.body.push(`${get_name_by_id(id)}(${id})`)
  }

  ui.btns = [{
    text: "添加并立即踢出玩家",
    icon: ui_icon.add,
    func: () => {
      choosePlayer(player, world.getAllPlayers(), (ps) => {
        for (var p of ps) {
          list.push(String(get_id(p)))
          kick(p, "你已被封禁！")
        }
        save_data("ban", to_json(list))
        banListCheck(player)
      })
    }
  }]

  if (list.length > 0) {
    ui.btns.push({
      text: "移除玩家",
      icon: ui_icon.delete,
      func: () => {
        var ui = new infoBar()
        ui.title = "移除玩家"
        for (var id of list) {
          ui.toggle(id, `${get_name_by_id(id)}(${id})`, false)
        }
        ui.show(player, (r) => {
          for (var k of Object.keys(r)) {
            if (r[k] === true) {
              array_clear(list, k)
            }
          }
          save_data("ban", to_json(list))
          banListCheck(player)
        })
      }
    })
  }

  ui.btns.push({
    text: "编辑列表",
    icon: ui_icon.edit,
    func: () => {
      var editor = new arrayEditor()
      editor.back = () => {
        save_data("ban", to_json(list))
        banListCheck(player)
      }
      editor.edit(player, list)
    }
  })

  ui.show(player)
}

function get_left_time(p) {
  return Math.round(p.info.ban_time - Date.now())
}

function stopPlayerBar(player) {
  var ps = world.getAllPlayers()
  var texts = []
  var ui = new infoBar()
  ui.title = "屏蔽/禁言玩家"
  for (var i = 0; i < ps.length; i++) {
    var p = ps[i]

    var text = p.name
    if (p.info.ban_time > Date.now()) {
      text += `(禁言中，剩余${Math.round(get_left_time(p) / 1000)}s)`
    }
    if (p.info.block) {
      text += "(屏蔽中)"
    }
    texts.push(text)
  }

  ui.options("id", "选择玩家", texts, 0)
  ui.input("left", "禁言时间/s(设为0则取消禁言)", "输入时间", "0")
  ui.toggle("block", "屏蔽(此玩家不会收到公共消息)", false)

  ui.show(player, (r) => {
    var p = ps[r.id]
    r.left = to_number(parseInt(r.left), 0)
    p.info.ban_time = Date.now() + r.left * 1000
    p.info.block = r.block
    save_player_info(p)
    opBar(player)
  })

}

function tagSetBar(player) {
  var ps = world.getAllPlayers()
  var names = []
  for (var p of ps) {
    names.push(`${p.name}(${get_chat_tag(p)})`)
  }

  var ui = new infoBar()
  ui.title = "头衔设置"
  ui.options("id", "选择玩家", names, 0)
  ui.input("tag", "你可以通过§e/tag 玩家 add usf.tag:头衔§r来设置玩家头衔\n以及§e/tag 玩家 add usf.tag:Reset§r来重置玩家头衔\n头衔", "输入头衔", "")
  ui.show(player, (r) => {
    var p = ps[r.id]
    set_chat_tag(p, r.tag)
    opBar(player)
  })
}

function two_find_min(array, count) {
  var goal = -1
  var from = 0
  var to = array.length - 1
  while (from <= to) {
    var mid = Math.floor((from + to) / 2)
    if (array[mid] <= count && mid > goal) {
      goal = mid
    }
    if (array[mid] < count) {
      from = mid + 1
    } else {
      to = mid - 1
    }
  }
  return goal
}

function find_min_in_lands(dis) {
  return two_find_min(lands.min, dis)
}

function save_lands() {
  save_data("lands_ids", to_json(lands.ids))
  save_data("lands_min", to_json(lands.min))
  save_data("lands_max", to_json(lands.max))
}

function add_land(player, land) {
  var index = find_min_in_lands(Math.max(land.distance - 65, 0))
  if (index === -1) {
    lands.ids.unshift(land.id)
    lands.min.unshift(Math.max(land.distance - 65, 0))
    lands.max.unshift(land.distance + 65)
  } else {
    lands.ids.splice(index + 1, 0, land.id)
    lands.min.splice(index + 1, 0, Math.max(land.distance - 65, 0))
    lands.max.splice(index + 1, 0, land.distance + 65)
  }
  save_lands()
  player.lands.push(land.id)
  save_player_lands(player)
}

function save_land(land) {
  save_data(`land.${land.id}`, to_json(land))
}

function is_land_in_other(di, lo1, lo2) {
  var center = {
    x: (lo1.location.x + lo2.location.x) / 2,
    y: (lo1.location.y + lo2.location.y) / 2,
    z: (lo1.location.z + lo2.location.z) / 2
  }
  var dis = Math.round(Math.sqrt(Math.pow(Math.abs(center.x), 2) + Math.pow(Math.abs(center.z), 2)))
  var i = two_find_min(lands.min, dis)
  if (i === -1) {
    return true
  }
  for (i >= 0; i--;) {
    if (lands.max[i] < dis) {
      return true
    }
    var land = get_land(lands.ids[i])
    if (is_string(land.name)) {
      if (land.di === di.id) {
        if (
          ((lo1.x < land.from.x && lo2.x < land.from.x && lo1.x < land.to.x && lo2.x < land.to.x) || (lo1.x > land.from.x && lo2.x > land.from.x && lo1.x > land.to.x && lo2.x > land.to.x)) ||
          ((lo1.y < land.from.y && lo2.y < land.from.y && lo1.y < land.to.y && lo2.y < land.to.y) || (lo1.y > land.from.y && lo2.y > land.from.y && lo1.y > land.to.y && lo2.y > land.to.y)) ||
          ((lo1.z < land.from.z && lo2.z < land.from.z && lo1.z < land.to.z && lo2.z < land.to.z) || (lo1.z > land.from.z && lo2.z > land.from.z && lo1.z > land.to.z && lo2.z > land.to.z))
        ) { } else {
          return false
        }
      }
    }
  }
  return true
}

function createLandBar(player) {
  var ui = new infoBar()
  ui.busy = null
  var points = player.landing.points

  if (!is_land_in_other(player.dimension, points[0], points[1])) {
    show_title(player, "领地重叠！无法创建！")
    return
  }

  var size = {
    x: Math.abs(points[0].location.x - points[1].location.x) + 1,
    y: Math.abs(points[0].location.y - points[1].location.y) + 1,
    z: Math.abs(points[0].location.z - points[1].location.z) + 1,
  }

  if (size.x > 126.5 || size.z > 126.5) {
    show_title(player, "范围过大！无法创建！\n上限:126*126")
    return
  }

  var board = world.scoreboard.getObjective(config.land.board)
  var price = Math.round(size.x * size.y * size.z * config.land.price)
  if (to_number(board.getScore(player)) - price < 0 && config.land.must) {
    show_title(player, "金额不足！无法创建！")
    return
  }

  if (un(player.scoreboardIdentity)) {
    show_title(player, "无法初始化记分版\n请重进游戏")
    return
  }

  ui.title = "新建领地"
  ui.input("name", `领地尺寸:${size.x} * ${size.y} * ${size.z}\n您的金额:${to_number(board.getScore(player))}\n价格:${price}\n总方块量:${size.x * size.y * size.z}\n始点:${get_block_pos(points[0])}\n终点:${get_block_pos(points[1])}\n领地名:`, "领地名", "")
  ui.range("y1", "起点y坐标(修改后请选择预览)", player.dimension.heightRange.min, player.dimension.heightRange.max, 1, points[0].y)
  ui.range("y2", "终点y坐标(修改后请选择预览)", player.dimension.heightRange.min, player.dimension.heightRange.max, 1, points[1].y)

  if (get_op_level(player) > 0) {
    ui.toggle("public", "公共领地(管理均可编辑)", false)
  }

  ui.options("type", "操作", ["暂时预览", "取消创建", "确认创建"], 0)
  ui.show(player, (r) => {
    if (r.type === 0) {
      try {
        var b = player.dimension.getBlock({
          x: points[0].location.x,
          y: r.y1,
          z: points[0].location.z
        })
        if (!un(b)) {
          points[0] = {
            location: b.location,
            x: b.x,
            y: b.y,
            z: b.z
          }
        }

        b = player.dimension.getBlock({
          x: points[1].location.x,
          y: r.y2,
          z: points[1].location.z
        })
        if (!un(b)) {
          points[1] = {
            location: b.location,
            x: b.x,
            y: b.y,
            z: b.z
          }
        }
      } catch (err) { }
      return
    }
    if (r.type === 1) {
      player.landing.mode = 0
      player.landing.points = []
      return
    }

    var ps = get_edge_from_block(points[0].location, points[1].location)
    points[0] = ps[0]
    points[1] = ps[1]
    var land = {
      "id": get_di_num(player.dimension) + String(get_random_land_id()),
      "di": player.dimension.id,
      "from": points[0],
      "to": points[1],
      "creater": get_id(player),
      "group": [],
      "member": [],
      "wel": "",
      "name": r.name,
      "price": price,
    }

    if (is_bool(r.public)) {
      if (r.public === true) {
        land.public = true
      }
    } else {
      board.setScore(player, to_number(board.getScore(player)) - price)
    }

    var center = {
      x: (points[1].x + points[0].x) / 2,
      z: (points[1].z + points[0].z) / 2
    }

    land.distance = Math.round(Math.sqrt(Math.pow(Math.abs(center.x), 2) + Math.pow(Math.abs(center.z), 2)))
    add_land(player, land)
    save_land(land)
    player.landing.mode = 0
    player.landing.points = []
  })
}

function small_to_big(c1, c2) {
  if (c1 < c2) {
    return [c1, c2]
  }
  return [c2, c1]
}

function get_edge_from_block(start, end) {
  var tallest = small_to_big(start.y, end.y)[1] + 1
  var shortest = small_to_big(start.y, end.y)[0]
  var new_start = {
    x: small_to_big(start.x, end.x)[0],
    y: tallest,
    z: small_to_big(start.z, end.z)[0]
  }
  var new_end = {
    x: small_to_big(start.x, end.x)[1] + 1,
    y: shortest,
    z: small_to_big(start.z, end.z)[1] + 1
  }
  return [new_start, new_end]
}

function show_range(start, end, di, co = {
  red: 0.0,
  green: 1.0,
  blue: 1.0,
  alpha: 1.0
}) {
  var molang = new mc.MolangVariableMap()
  molang.setColorRGB("variable.color", co)
  molang.setVector3("variable.direction", {
    x: 0,
    y: 0,
    z: 0
  })

  var tallest = small_to_big(start.y, end.y)[1] + 1
  var shortest = small_to_big(start.y, end.y)[0]
  var new_start = get_edge_from_block(start, end)[0]
  var new_end = get_edge_from_block(start, end)[1]
  try {
    for (var cf = small_to_big(new_start.x, new_end.x)[0]; cf <= small_to_big(new_start.x, new_end.x)[1]; cf++) {
      di.spawnParticle("minecraft:wax_particle", {
        x: cf,
        y: shortest,
        z: new_start.z
      }, molang)
    }
    for (var cf = small_to_big(new_start.x, new_end.x)[0]; cf <= small_to_big(new_start.x, new_end.x)[1]; cf++) {
      di.spawnParticle("minecraft:wax_particle", {
        x: cf,
        y: shortest,
        z: new_end.z
      }, molang)
    }
    for (var cf = small_to_big(new_start.z, new_end.z)[0]; cf <= small_to_big(new_start.z, new_end.z)[1]; cf++) {
      di.spawnParticle("minecraft:wax_particle", {
        x: new_start.x,
        y: shortest,
        z: cf
      }, molang)
    }
    for (var cf = small_to_big(new_start.z, new_end.z)[0]; cf <= small_to_big(new_start.z, new_end.z)[1]; cf++) {
      di.spawnParticle("minecraft:wax_particle", {
        x: new_end.x,
        y: shortest,
        z: cf
      }, molang)
    }
    for (var cf = small_to_big(new_start.x, new_end.x)[0]; cf <= small_to_big(new_start.x, new_end.x)[1]; cf++) {
      di.spawnParticle("minecraft:wax_particle", {
        x: cf,
        y: tallest,
        z: new_start.z
      }, molang)
    }
    for (var cf = small_to_big(new_start.x, new_end.x)[0]; cf <= small_to_big(new_start.x, new_end.x)[1]; cf++) {
      di.spawnParticle("minecraft:wax_particle", {
        x: cf,
        y: tallest,
        z: new_end.z
      }, molang)
    }
    for (var cf = small_to_big(new_start.z, new_end.z)[0]; cf <= small_to_big(new_start.z, new_end.z)[1]; cf++) {
      di.spawnParticle("minecraft:wax_particle", {
        x: new_start.x,
        y: tallest,
        z: cf
      }, molang)
    }
    for (var cf = small_to_big(new_start.z, new_end.z)[0]; cf <= small_to_big(new_start.z, new_end.z)[1]; cf++) {
      di.spawnParticle("minecraft:wax_particle", {
        x: new_end.x,
        y: tallest,
        z: cf
      }, molang)
    }
    for (var cf = shortest; cf <= tallest; cf++) {
      di.spawnParticle("minecraft:wax_particle", {
        x: new_start.x,
        y: cf,
        z: new_start.z
      }, molang)
    }
    for (var cf = shortest; cf <= tallest; cf++) {
      di.spawnParticle("minecraft:wax_particle", {
        x: new_end.x,
        y: cf,
        z: new_start.z
      }, molang)
    }
    for (var cf = shortest; cf <= tallest; cf++) {
      di.spawnParticle("minecraft:wax_particle", {
        x: new_start.x,
        y: cf,
        z: new_end.z
      }, molang)
    }
    for (var cf = shortest; cf <= tallest; cf++) {
      di.spawnParticle("minecraft:wax_particle", {
        x: new_end.x,
        y: cf,
        z: new_end.z
      }, molang)
    }
  } catch (err) { }
}

function getPlayerItemsBar(player) {
  var block = player.dimension.getBlock(player.location)
  var p_com = player.getComponent("minecraft:inventory").container
  var items = []
  if (!block.isAir) {
    tip(player, "您所在的位置不是空气方块，无法执行背包检查功能！", () => {
      opBar(player)
    })
    return
  } else {
    choosePlayer(player, world.getAllPlayers(), (ps) => {
      for (var p of ps) {
        var com = p.getComponent("minecraft:inventory").container
        block.setType("minecraft:undyed_shulker_box")
        var b_com = block.getComponent("minecraft:inventory").container
        b_com.clearAll()

        for (var i = 9; i < com.size; i++) {
          b_com.setItem(i - 9, com.getItem(i))
        }
        items.push(block.getItemStack(1, true))
        b_com.clearAll()

        for (var i = 0; i < 9; i++) {
          b_com.setItem(i, com.getItem(i))
        }
        com = p.getComponent("minecraft:equippable")
        b_com.setItem(9, com.getEquipment("Head"))
        b_com.setItem(10, com.getEquipment("Chest"))
        b_com.setItem(11, com.getEquipment("Legs"))
        b_com.setItem(12, com.getEquipment("Feet"))

        b_com.setItem(18, com.getEquipment("Offhand"))
        items.push(block.getItemStack(1, true))

        b_com.clearAll()
        for (var item of items) {
          b_com.addItem(item)
        }
        var goal = block.getItemStack(1, true)
        goal.nameTag = `玩家背包:${p.name}`
        p_com.addItem(goal)
        block.setType("minecraft:air")
      }
    })
  }
}

function reset_player_follow(player) {
  delete player.follow
  player.camera.fade({
    fadeColor: {
      blue: 0,
      green: 0,
      red: 0
    },
    fadeTime: {
      fadeInTime: 0.4,
      fadeOutTime: 0.4,
      holdTime: 0.2
    }
  })
  system.runTimeout(() => {
    player.camera.clear()
  }, 8)
  if (is_object(player.info.follow)) {
    var follow = player.info.follow
    tp_entity(player, get_di(follow.di), follow.x, follow.y, follow.z)
    set_mode(player, player.info.follow.mode)
    delete player.info.follow
    save_player_info(player)
  }
}

function followBar(player) {
  var text = get_text("follow.tip")
  var ui = new infoBar()
  var players = world.getAllPlayers()
  var names = []
  for (var i = 0; i < players.length; i++) {
    names.push(players[i].name)
  }
  ui.title = "跟踪视角"
  ui.options("index", text + "\n选择玩家", names, 0)
  ui.options("mode", "选择跟踪模式", ["第一视角", "自由视角"], 0)
  ui.show(player, (r) => {
    player.camera.fade({
      fadeColor: {
        blue: 0,
        green: 0,
        red: 0
      },
      fadeTime: {
        fadeInTime: 0.4,
        fadeOutTime: 0.4,
        holdTime: 0.2
      }
    })
    system.runTimeout(() => {
      var lo = players[r.index].location
      if (r.mode === 0) {
        tp_entity(player, players[r.index].dimension, lo.x, -10000, lo.z, false)
      } else {
        tp_entity(player, players[r.index].dimension, lo.x, -10000 + lo.y, lo.z, false)
      }

      player.follow = {
        type: r.mode,
        player: players[r.index],
        pos: player.location
      }

      player.info.follow = {
        di: player.dimension.id,
        x: player.location.x,
        y: player.location.y,
        z: player.location.z,
        mode: get_mode(player)
      }
      save_player_info(player)

      set_mode(player, 3)

      lo.y += 2
      player.camera.setCamera("usf:example_player_effects", {
        location: lo,
        easeOptions: {
          easeType: "Linear",
          easeTime: 0.1
        }
      })
    }, 8)
  })
}

function reportBar(player) {
  var ui = new btnBar()
  ui.title = "管理员日志"
  ui.body = get_reports()
  ui.btns = [{
    text: "添加一行日志",
    func: () => {
      var ui2 = new infoBar()
      ui2.cancel = () => {
        reportBar(player)
      }
      ui2.input("text", "日志内容", "请输入日志", "")
      ui2.show(player, (r) => {
        report_warn("text", {
          text: r.text
        })
        reportBar(player)
      })
    }
  }, {
    text: "清理日志",
    func: () => {
      save_data("reports", "")
      reportBar(player)
    }
  }]
  ui.show(player)
}

function lockRulesBar(player) {
  var ui = new infoBar()
  ui.title = "规则锁定"
  var text = ""
  if (to_bool(config.rule.able)) {
    var rules = to_object(parse_json(config.rule.data))
    for (var k in rules) {
      text += `${get_text(k)} : ${rules[k] === true ? "开" : "关"}\n`
    }
  }
  ui.toggle("able", text + "\n启用规则锁定", to_bool(config.rule.able))
  ui.cancel = () => {
    opBar(player)
  }
  ui.show(player, (r) => {
    config.rule.able = r.able
    if (r.able) {
      config.rule.data = to_json({
        "mobGriefing": world.gameRules.mobGriefing,
        "keepInventory": world.gameRules.keepInventory,
        "tntExplodes": world.gameRules.tntExplodes,
        "showCoordinates": world.gameRules.showCoordinates,
        "pvp": world.gameRules.pvp,
        "doMobSpawning": world.gameRules.doMobSpawning,
        "doImmediateRespawn": world.gameRules.doImmediateRespawn,
        "commandBlocksEnabled": world.gameRules.commandBlocksEnabled,
      })
    }
    save_config()
    opBar(player)
  })
}

function editItemEvents(player) {
  var ui = new btnBar()
  ui.title = "设置物品效果"
  ui.body = ["通过设置物品效果来让指定物品有特殊功能", "注：执行命令只能执行命令集"]
  ui.cancel = () => {
    opBar(player)
  }
  ui.btns = [{
    text: "编辑命令集",
    icon: ui_icon.edit,
    func: () => {
      confirm(player, array2string([
        "命令集的编辑格式为多行编辑器",
        '每一行输入一个命令集，格式为["命令1","命令2","命令3"]',
        "请注意命令集行号，当需要调用这个命令集时，请输入行号",
        "当无法识别行号时，会调用第一行的命令集，因此第一行可作为测试用"
      ]), (r) => {
        if (r) {
          var editor = new arrayEditor()
          editor.back = () => {
            save_command_set()
            editItemEvents(player)
          }
          editor.edit(player, command_set)
        } else {
          editItemEvents(player)
        }
      })
    }
  }, {
    text: "编辑物品效果",
    func: () => {
      editItemEvent(player)
    }
  }]
  ui.show(player)
}

function editItemEvent(player) {
  var ui = new infoBar()
  ui.title = "选择物品"
  ui.cancel = () => {
    editItemEvents(player)
  }
  ui.options("slot", "选择物品栏物品", [
    "物品栏1",
    "物品栏2",
    "物品栏3",
    "物品栏4",
    "物品栏5",
    "物品栏6",
    "物品栏7",
    "物品栏8",
    "物品栏9",
  ], 0)
  ui.show(player, (r) => {
    var item = player.slots.getItem(r.slot)
    if (un(item)) {
      confirm(player, "物品不存在！", () => {
        editItemEvents(player)
      })
    } else {
      var event = item.getLore()
      if (event.length > 0) {
        event = event[0]
        if (event.indexOf(":") !== -1) {
          event = [event.slice(0, event.indexOf(":")), event.slice(event.indexOf(":") + 1)]
        }
        if (event.length !== 2) {
          event = ["", ""]
        }
      } else {
        event = ["", ""]
      }
      var ui2 = new infoBar()
      ui2.title = "编辑效果"
      ui2.cancel = () => {
        opBar(player)
      }
      ui2.options("type", "效果", ["击退(耐久性)", "命令执行者(一次性)", "传送至准心位置(一次性)(最大范围48)"], array_has(data_format.item_events, event[0]) ? array_index(data_format.item_events, event[0]) : 0)
      ui2.input("data", '命令执行者-输入命令集的行号\n击退-输入等级1-10\n传送-不填', "填入数据", event[1])
      ui2.show(player, (r2) => {
        player.slots.getSlot(r.slot).setLore([data_format.item_events[r2.type] + ":" + r2.data])
        editItemEvents(player)
      })
    }
  })
}

function get_item_event(item) {
  if (un(item)) {
    return
  }
  var event = item.getLore()
  if (event.length > 0) {
    event = event[0]
    if (event.indexOf(":") !== -1) {
      event = [event.slice(0, event.indexOf(":")), event.slice(event.indexOf(":") + 1)]
    }
    if (event.length !== 2) {
      event = ["", ""]
    }

    return event
  }
  return
}

function opBar(player) {
  if (is_object(player.follow)) {
    reset_player_follow(player)
  }
  if (get_op_level(player) === 0) {
    return
  }
  var ui = new btnBar()
  ui.busy = null
  ui.title = "管理界面"
  ui.body = "欢迎来到管理界面"
  ui.btns = [{
    text: "重置我的今日签到",
    icon: pictures.gift,
    func: () => {
      player.info.daily = 0
    }
  },
  {
    text: "复制物品栏物品",
    icon: ui_icon.copy,
    func: () => {
      var ui = new infoBar()
      ui.title = "选择物品"
      ui.cancel = () => {
        opBar(player)
      }
      ui.options("slot", "选择物品栏物品", [
        "物品栏1",
        "物品栏2",
        "物品栏3",
        "物品栏4",
        "物品栏5",
        "物品栏6",
        "物品栏7",
        "物品栏8",
        "物品栏9",
      ], 0)
      ui.show(player, (r) => {
        var item = player.slots.getItem(r.slot)
        if (!un(item)) {
          player.slots.addItem(item)
          chat("§e[管理系统]复制成功！", [player])
        } else {
          chat("§e[管理系统]该物品不存在，无法复制！", [player])
        }
      })
    }
  },
  {
    text: "锁定游戏规则",
    icon: ui_icon.lock,
    func: () => {
      lockRulesBar(player)
    }
  },
  {
    text: "聊天消息过滤词",
    func: () => {
      confirm(player, [
        "提醒：每行输入一个白名单词，若聊天信息中包含任意一个词，usf将不处理此消息，例如兼容其他模组的指令系统",
        "点击下方确认按钮前往编辑"
      ], (r) => {
        if (r) {
          var editor = new arrayEditor()
          editor.back = () => {
            save_data("white_words", to_json(white_words))
            opBar(player)
          }
          editor.edit(player, white_words)
        } else {
          opBar(player)
        }
      })
    },
    icon: ui_icon.water
  },
  {
    text: "封禁实体",
    icon: ui_icon.rubbish,
    func: () => {
      confirm(player, [
        "提醒：每行输入一个实体id(要加minecraft前缀)",
        "点击下方确认按钮前往编辑"
      ], (r) => {
        if (r) {
          var editor = new arrayEditor()
          editor.back = () => {
            save_config()

            var unable = []
            for (var id of config.ban_entity) {
              if (un(mc.EntityTypes.get(id))) {
                unable.push(id)
              }
            }

            if (unable.length > 0) {
              var text = "编辑已完成，但以下ID可能无效\n" + array2string(unable)
              tip(player, text, () => {
                opBar(player)
              })
            } else {
              opBar(player)
            }

          }
          editor.edit(player, config.ban_entity)
        } else {
          opBar(player)
        }
      })
    }
  }, {
    text: "封禁掉落物",
    icon: ui_icon.rubbish,
    func: () => {
      confirm(player, [
        "提醒：每行输入一个物品id(要加minecraft前缀)",
        "点击下方确认按钮前往编辑"
      ], (r) => {
        if (r) {
          var editor = new arrayEditor()
          editor.back = () => {
            save_config()

            var unable = []
            for (var id of config.ban_item) {
              if (un(mc.ItemTypes.get(id))) {
                unable.push(id)
              }
            }

            if (unable.length > 0) {
              var text = "编辑已完成，但以下ID可能无效\n" + array2string(unable)
              tip(player, text, () => {
                opBar(player)
              })
            } else {
              opBar(player)
            }

          }
          editor.edit(player, config.ban_item)
        } else {
          opBar(player)
        }
      })
    }
  }, {
    text: "性能检测",
    icon: ui_icon.info,
    func: () => {
      usfTickCheck(player)
    }
  }, {
    text: "管理模式 - " + ((player.info.manager === true) ? "开" : "关" + "\n可破坏领地、在领地界面做修改"),
    icon: ui_icon.manager,
    func: () => {
      if (player.info.manager === false || un(player.info.manager)) {
        player.info.manager = true
        save_player_info(player)
      } else {
        player.info.manager = false
        save_player_info(player)
      }
    }
  }, {
    text: "管理玩家领地",
    icon: ui_icon.land,
    func: () => {
      choosePlayer(player, world.getAllPlayers(), (ps) => {
        if (ps.length >= 1) {
          landBar(player, ps[0])
        } else {
          opBar(player)
        }
      })
    }
  }, {
    text: "删除领地",
    icon: ui_icon.land,
    func: () => {
      var ui2 = new infoBar()
      ui2.cancel = () => {
        opBar(player)
      }
      ui2.title = "删除领地"
      ui2.input("id", "输入领地ID", "输入7位ID", "")
      ui2.show(player, (r) => {
        var index = lands.ids.indexOf(r.id)
        if (index === -1) {
          tip(player, "找不到此领地！", () => {
            opBar(player)
          })
        } else {
          lands.ids.splice(index, 1)
          lands.min.splice(index, 1)
          lands.max.splice(index, 1)
          save_lands()
          tip(player, "已删除此领地！", () => {
            opBar(player)
          })
        }
      })
    }
  }, {
    text: "视角跟踪",
    icon: ui_icon.eye,
    func: () => {
      followBar(player)
    }
  }, {
    text: "屏蔽/禁言玩家",
    icon: ui_icon.mute,
    func: () => {
      stopPlayerBar(player)
    }
  }, {
    text: "获取背包",
    icon: pictures.chest,
    func: () => {
      getPlayerItemsBar(player)
    }
  }, {
    text: "封禁列表管理",
    icon: ui_icon.stop,
    func: () => {
      banListCheck(player)
    }
  },
  {
    text: "头衔设置",
    icon: ui_icon.star,
    func: () => {
      tagSetBar(player)
    }
  },
  {
    text: "查看所有群组",
    icon: ui_icon.group,
    func: () => {
      var text = []

      for (var id of groups) {
        var g = get_group(id)
        if (is_group(g)) {
          text.push(`群名:${g.name}\n群ID:${g.id}\n群主:${get_name_by_id(g.creater)}\n群成员:`)
          for (var m of g.member) {
            text.push(get_name_by_id(m))
          }
          text.push("————————————")
        }
      }
      var ui = new btnBar()
      ui.title = "所有群组"
      ui.body = "此处管理所有群组，点击进入管理员编辑模式"
      ui.btns = [{
        text: "返回",
        icon: ui_icon.back,
        func: () => {
          opBar(player)
        }
      }]
      for (var id of groups) {
        var g = get_group(id)
        if (is_group(g)) {
          ui.btns.push({
            text: `${g.name}(${g.id})\n群主:${get_name_by_id(g.creater)}`,
            op: {
              i: id
            },
            func: (op) => {
              groupLookBar(player, get_group(op.i), true)
            }
          })
        }
      }
      ui.show(player)
    }
  }, {
    text: "管理日志",
    icon: ui_icon.share,
    func: () => {
      reportBar(player)
    }
  }, {
    text: "调试输出js全局变量",
    icon: ui_icon.random,
    func: () => {
      chat("config:" + to_json(config), [player])
      chat("IDs:" + to_json(ids), [player])
      chat("Names:" + to_json(id_names), [player])
    }
  }, {
    text: "管理悬浮字",
    icon: ui_icon.brush,
    func: () => {
      managerFloat(player)
    }
  }, {
    text: "编辑物品特殊效果",
    icon: ui_icon.sword,
    func: () => {
      editItemEvents(player)
    }
  }, {
    text: "插件设置",
    icon: ui_icon.setting,
    func: () => {
      usfSettingBar(player)
    }
  }
  ]

  ui.btns.push({
    text: "op管理",
    icon: ui_icon.op,
    func: () => {
      setOpBar(player)
    }
  })
  ui.show(player)
}

function managerFloat(player) {
  var ui = new btnBar()
  ui.title = "管理悬浮字"
  ui.body = [
    "管理32格内的悬浮字",
    "悬浮字本质是蝙蝠，为防止误杀悬浮字，kill悬浮字后会重新生成",
    "你可以去除悬浮字的Float标签，这样悬浮字即可被kill",
    "例如§e/tag @e[type=bat] remove Float§r命令可以使所有悬浮字都能被kill"
  ]

  var op = {
    location: player.location,
    maxDistance: 32,
    type: "bat",
    tags: ["Float"]
  }
  for (var bat of player.dimension.getEntities(op)) {
    ui.btns.push({
      text: `${get_data("name", bat)}`,
      op: {
        bat: bat
      },
      func: (op) => {
        editFloat(player, op.bat, false)
      }
    })
  }

  ui.btns.push({
    text: "添加悬浮字",
    icon: ui_icon.add,
    func: () => {
      var bat = player.dimension.spawnEntity("minecraft:bat", player.location, {
      spawnEvent : "usf:text"
      }
      )
      editFloat(player, bat, true)
    }
  })
  ui.show(player)
}

function editFloat(player, bat, first) {
  var text = get_data("text", bat)
  var name = get_data("name", bat)

  var ui = new infoBar()
  ui.title = "编辑悬浮字"
  ui.cancel = () => {
    if (first) {
      bat.remove()
    }
    managerFloat(player)
  }
  ui.busy = () => {
    bat.remove()
  }
  ui.input("name", "悬浮字备注(用于管理)", "输入备注", name)
  ui.input("text", get_text("tran_text_") + "\n内容", "输入内容", text)
  ui.input("x", "X坐标", "输入坐标", String(bat.location.x.toFixed(2)))
  ui.input("y", "Y坐标", "输入坐标", String(bat.location.y.toFixed(2)))
  ui.input("z", "Z坐标", "输入坐标", String(bat.location.z.toFixed(2)))
  ui.toggle("de", "删除", false)
  ui.show(player, (r) => {
    if (r.de) {
      bat.remove()
    } else {
      var lo = {
        di: bat.dimension.id
      }
      lo.x = to_number(parseFloat(r.x), bat.location.x)
      lo.y = to_number(parseFloat(r.y), bat.location.y)
      lo.z = to_number(parseFloat(r.z), bat.location.z)

      save_data("lo", to_json(lo), bat)
      save_data("name", r.name, bat)
      save_data("text", r.text, bat)
      if (!bat.hasTag("Float")) {
        bat.addTag("Float")
      }
    }
    managerFloat(player)
  })
}

function tip(player, text = "", back = function () { }) {
  var ui = new btnBar()
  ui.title = "提示"
  ui.body = text
  if (is_function(back)) {
    ui.cancel = back
    ui.btns.push({
      text: "返回",
      icon: ui_icon.back,
      func: () => {
        back()
      }
    })
  }
  ui.btns.push({
    text: "关闭",
    icon: ui_icon.delete,
    func: () => {

    }
  })
  ui.show(player)
}

function setOpBar(player) {
  if (get_op_level(player) === 0) {
    return
  }
  var ui = new btnBar()
  ui.title = "OP管理"
  ui.cancel = () => {
    opBar(player)
  }

  var text = "服务器OP:\n"
  for (var id of ops) {
    text += `${id}(${get_name_by_id(id)})` + "\n"
  }
  text += "服务器owners:\n"
  for (var o of get_owners()) {
    text += `${o}(${get_name_by_id(o)})` + "\n"
  }
  ui.body = text
  ui.btns.push({
    text: "添加op",
    icon: ui_icon.add,
    func: () => {
      var names = []
      var ps = []
      for (var p of world.getAllPlayers()) {
        if (get_op_level(p) === 0) {
          names.push(p.name)
          ps.push(p)
        }
      }
      if (ps.length === 0) {
        tip(player, "当前没有可添加的玩家！", () => {
          setOpBar(player)
        })
        return
      }

      var ui = new infoBar()
      ui.cancel = () => {
        setOpBar(player)
      }
      ui.title = "添加op"
      ui.options("id", "选择玩家", names, 0)
      ui.show(player, (r) => {
        ops.push(get_id(ps[r.id]))
        save_ops()
        setOpBar(player)
      })
    }
  })
  if (ops.length > 0) {
    ui.btns.push({
      text: "删除op",
      icon: ui_icon.delete,
      func: () => {
        var names = []
        for (var id of ops) {
          names.push(String(id) + `(${get_name_by_id(id)})`)
        }

        var ui = new infoBar()
        ui.cancel = () => {
          setOpBar(player)
        }
        ui.title = "删除op"
        ui.options("id", "选择玩家", names, 0)
        ui.show(player, (r) => {
          ops.splice(r.id, 1)
          save_ops()
          setOpBar(player)
        })
      }
    })
  }

  if (get_owners().length > 0) {
    ui.btns.push({
      text: "删除owner",
      icon: ui_icon.delete,
      func: () => {
        var owners = get_owners()
        var names = []
        for (var i = 0; i < owners.length; i++) {
          names.push(owners[i] + "(" + get_name_by_id(owners[i]) + ")")
        }
        chooseBar(player, names, (r) => {
          var ids = []
          for (var i of r) {
            ids.push(owners[i])
          }
          for (var i of ids) {
            owners.splice(owners.indexOf(i), 1)
          }
          save_data("owners", to_json(owners))
          setOpBar(player)
        })
      }
    })
  }

  if (get_op_level(player) === 1) {
    ui.btns = [{
      text: "关闭",
      icon: ui_icon.delete,
      func: () => {

      }
    }]
  }
  ui.show(player)
}

function save_ops() {
  save_data("op", to_json(ops))
}

function OnlineBoardBar(player) {
  var ui = new infoBar()
  ui.title = "剔除离线玩家记分版"
  var text = `输入要剔除离线玩家的记分版ID，多个记分版之间用英文分号;间隔开\n设置后,系统会生成一个下划线_后缀的记分版，这个记分版就是剔除离线玩家的记分版\n例如： Money >> Money_`
  ui.input("r", text, "记分版id,多个之间用;隔开", config.copy_boards)
  ui.show(player, (r) => {
    config.copy_boards = r.r
    save_config()
  })
}

function setEventsBar(player) {
  var ui = new btnBar()
  ui.title = "编辑全局事件"
  ui.body = "管理全局事件"
  ui.cancel = () => {
    usfSettingBar(player)
  }
  ui.btns = [{
    text: "添加全局事件",
    icon: ui_icon.add,
    func: () => {
      editEventBar(player, "", -1)
    }
  }]

  for (var type of Object.keys(events)) {
    for (var i = 0; i < events[type].length; i++) {
      ui.btns.push({
        text: to_string(events[type][i].name),
        op: {
          type: type,
          i: i
        },
        func: (op) => {
          editEventBar(player, op.type, op.i)
        }
      })
    }
  }

  ui.show(player)
}

function editEventBar(player, type, index) {
  var first = false
  var event
  if (index === -1) {
    first = true
    event = {
      tag: "",
      commands: "",
      name: ""
    }
  } else {
    event = events[type][index]
  }

  var ui = new infoBar()
  ui.title = "编辑事件"
  ui.cancel = () => {
    setEventsBar(player)
  }
  ui.input("name", "事件备注名", "输入名字", to_string(event.name))
  ui.options("type", "事件类型",
    ["玩家进游戏", "玩家死亡", "玩家使用传送点", "玩家发送消息", "玩家转换维度", "破坏方块", "放置方块", "玩家攻击", "玩家睡觉", "玩家杀死生物"],
    array_has(data_format.events, type) ? array_index(data_format.events, type) : 0)
  ui.input("tag", "标签限制(含有该标签才触发)", "标签(不支持多个)", event.tag)
  ui.input("commands", '执行的命令\n格式:["命令1","命令2","命令3"]', "输入命令", event.commands)
  if (!first) {
    ui.toggle("d", "删除", false)
  }
  ui.show(player, (r) => {
    if (!first) {
      if (r.d) {
        events[type].splice(index, 1)
        save_events()
        setEventsBar(player)
        return
      }
      events[type].splice(index, 1)
    }
    event.tag = r.tag
    event.name = r.name
    event.commands = r.commands
    if (un(events[data_format.events[r.type]])) {
      events[data_format.events[r.type]] = []
    }
    events[data_format.events[r.type]].push(event)
    save_events()
    setEventsBar(player)

  })
}

function chatByBoardBar(player) {
  var ui = new infoBar()
  ui.cancel = () => {
    usfSettingBar(player)
  }
  ui.title = "计分板聊天室"
  ui.toggle("able", "计分板聊天室\n启用后会生成一个id为chat的计分板\n计分板分数相同的人进行单独群聊\n[禁用|启用]", config.chat_board.able)
  ui.show(player, (r) => {
    config.chat_board.able = r.able
    save_config()
    usfSettingBar(player)
  })
}

function limitSetBar(player) {
  var ui = new btnBar()
  ui.title = "编辑玩家方块行为限制"
  ui.body = [
    "使用方法：",
    "添加标签，接下来选择该标签需要限制的行为",
    "(为性能考虑，玩家含多个标签被限制时只会触发一个)"
  ]
  ui.btns = [{
    text: "新增Tag",
    icon: ui_icon.add,
    func: () => {
      var ui2 = new infoBar()
      ui2.title = "新增Tag"
      ui2.input("tag", "要限制的玩家Tag", "输入Tag", "")
      ui2.cancel = () => {
        limitSetBar(player)
      }
      ui2.toggle("bb", "限制挖掘方块", true)
      ui2.toggle("ib", "限制交互方块", true)
      ui2.toggle("pb", "限制放置方块", true)
      ui2.show(player, (r) => {
        if (r.tag === "") {
          limitSetBar(player)
          return
        }

        limit[r.tag] = to_object(limit[r.tag])
        limit[r.tag].blocks = to_array(limit[r.tag].blocks)
        limit[r.tag].bb = r.bb
        limit[r.tag].ib = r.ib
        limit[r.tag].pb = r.pb
        save_limit()
        limitSetBar(player)
      })
    }
  }]

  for (var id in limit) {
    ui.btns.push({
      text: id,
      op: {
        id: id
      },
      func: (op) => {
        checkLimit(player, op.id)
      }
    })
  }

  ui.show(player)

}

function checkLimit(player, tag) {
  var ui = new btnBar()
  ui.title = "限制方块行为"
  ui.body = [
    `限制Tag - ${tag}`,
    `限制挖掘：${limit[tag].bb}`,
    `限制互动：${limit[tag].ib}`,
    `限制放置：${limit[tag].pb}`,
    "限制列表："
  ]
  ui.body = ui.body.concat(limit[tag].blocks)
  ui.cancel = () => {
    limitSetBar(player)
  }
  ui.btns = [{
    text: "关闭",
    icon: ui_icon.delete,
    func: () => {
      limitSetBar(player)
    }
  }, {
    text: "重置方块",
    icon: ui_icon.brush,
    func: () => {
      limit[tag].blocks = []
      save_limit()
      limitSetBar(player)
    }
  }, {
    text: "录入方块",
    icon: ui_icon.brush,
    func: () => {
      player.limiting = tag
      chat("§e[管理系统]开始录入...\n§e放置任意方块退出录入", [player])
    }
  }, {
    text: "删除",
    icon: ui_icon.rubbish,
    func: () => {
      delete limit[tag]
      save_limit()
      limitSetBar(player)
    }
  }]

  ui.show(player)
}

function usfSettingBar(player) {
  var ui = new btnBar()
  ui.title = "插件设置"
  ui.body = ["欢迎来到插件设置界面",
    "此处管理插件所有功能"
  ]
  ui.btns = [{
    text: "每日签到设置",
    icon: ui_icon.stick,
    func: () => {
      usfFunctionBar(player, "daily")
    }
  }, {
    text: "玩家方块行为限制",
    icon: ui_icon.stop,
    func: () => {
      limitSetBar(player)
    }
  }, {
    text: "计分板聊天室",
    icon: ui_icon.player,
    func: () => {
      chatByBoardBar(player)
    }
  }, {
    text: "记分版自动剔除离线玩家设置",
    icon: ui_icon.ping,
    func: () => {
      OnlineBoardBar(player)
    }
  }, {
    text: "转账鸡设置",
    icon: ui_icon.trade,
    func: () => {
      usfFunctionBar(player, "tran")
    }
  },
  {
    text: "全局配置文件",
    icon: ui_icon.copy,
    func: () => {
      setConfigItemBar(player)
    }
  },
  {
    text: "配置全局事件",
    icon: ui_icon.event,
    func: () => {
      setEventsBar(player)
    }
  },
  {
    text: "记分版计时器",
    icon: ui_icon.speed,
    func: () => {
      var ui2 = new infoBar()
      ui2.title = "记分版计时器"
      ui2.cancel = () => {
        usfSettingBar(player)
      }
      ui2.input("id", "记分版计时器\n注意：只能设置一个记分版作为计时器\n设置后，当记分版有分数>0时，自动开始倒计时，直到分数为-1停下\n设置后，当记分版有分数为-2时，自动开始正计时，直到分数被设置为0或-1\n插件重载/游戏重启后自动清空整个记分版\n\n记分版ID", "输入ID", config.timer)
      ui2.show(player, (r) => {
        config.timer = r.id
        save_config()
        usfSettingBar(player)
      })
    }
  },
  {
    text: "标签组设置",
    icon: ui_icon.brush,
    func: () => {
      confirm(player, [
        "说明：标签组可以设置多个标签成为1组",
        "其中第一个tag为默认tag,当玩家不含组中任何一个tag时自动赋予默认tag",
        "当玩家同时存在组中2个tag时,插件自动移除旧的tag,玩家在任何时候只含组内1个tag",
        "注意：标签组刷新频率为0.5S,给玩家添加tag后请延迟10tick执行下一个命令/操作",
        "格式：多行编辑器,每行填入一组标签组,每个标签之间用英文分号;间隔",
        "例如: tag1;tag2;tag3;tag4  则这四个标签为1个标签组",
        "点击下方确认按钮前往编辑"
      ], (r) => {
        if (r) {
          var editor = new arrayEditor()
          editor.back = () => {
            save_tag_groups()
            usfSettingBar(player)
          }
          editor.edit(player, tag_groups)
        } else {
          usfSettingBar(player)
        }
      })
    }
  },
  {
    text: "全局商店设置",
    icon: ui_icon.villager,
    func: () => {
      usfFunctionBar(player, "store")
    }
  },

  {
    text: "公告设置",
    icon: ui_icon.sign,
    func: () => {
      usfBoardBar(player)
    }
  }, {
    text: "伤害血量显示",
    icon: ui_icon.heart,
    func: () => {
      usfFunctionBar(player, "hurttip")
    }
  }, {
    text: "记分版默认值",
    icon: ui_icon.scoreboard,
    func: () => {
      usfFunctionBar(player, "reset")
    }
  }, {
    text: "群组设置",
    icon: ui_icon.group,
    func: () => {
      usfFunctionBar(player, "group")
    }
  }, {
    text: "日志功能设置",
    icon: ui_icon.content,
    func: () => {
      usfFunctionBar(player, "log")
    }
  }, {
    text: "数据统计(原积分功能)",
    icon: ui_icon.online,
    func: () => {
      usfFunctionBar(player, "score")
    }
  }, {
    text: "领地功能设置",
    icon: ui_icon.land,
    func: () => {
      usfFunctionBar(player, "land")
    }
  }, {
    text: "小游戏功能设置",
    icon: ui_icon.map,
    func: () => {
      usfFunctionBar(player, "mini")
    }
  }, {
    text: "游戏时间统计",
    icon: ui_icon.clock,
    func: () => {
      usfFunctionBar(player, "time")
    }
  }, {
    text: "锁定物品设置",
    icon: ui_icon.slot,
    func: () => {
      setLockBar(player)
    }
  }, {
    text: "进服欢迎提示设置",
    icon: ui_icon.tip,
    func: () => {
      usfFunctionBar(player, "tip")
    }
  }, {
    text: "聊天信息格式",
    icon: ui_icon.chat,
    func: () => {
      usfFunctionBar(player, "chat")
    }
  }, {
    text: "玩家名格式",
    icon: ui_icon.player,
    func: () => {
      usfFunctionBar(player, "name")
    }
  }, {
    text: "反作弊设置",
    icon: ui_icon.stop,
    func: () => {
      usfFunctionBar(player, "hacker")
    }
  }, {
    text: "插件命令设置",
    icon: ui_icon.command,
    func: () => {
      usfFunctionBar(player, "com")
    }
  },
  {
    text: "打开主菜单物品",
    icon: ui_icon.big,
    func: () => {
      usfFunctionBar(player, "cd_items")
    }
  }, {
    text: "编辑主菜单文字",
    icon: ui_icon.edit,
    func: () => {
      usfFunctionBar(player, "cd_con")
    }
  },
  {
    text: "传送点设置",
    icon: ui_icon.pos,
    func: () => {
      usfFunctionBar(player, "pos")
    }
  },
  {
    text: "游戏辅助功能",
    icon: pictures.tnt,
    func: () => {
      usfFunctionBar(player, "game")
    }
  },
  {
    text: "语言设置",
    icon: pictures.brush,
    func: () => {
      usfFunctionBar(player, "brush")
    }
  },
  {
    text: "其他功能",
    icon: pictures.craft_table,
    func: () => {
      usfFunctionBar(player, "other")
    }
  },
  ]
  ui.show(player)
}

function usfBoardBar(player) {
  var ui = new btnBar()
  ui.title = "公告设置"
  ui.body = ["此处管理服务器的公告板",
    "可以点击\"添加公告\"新建公告",
    "点击公告可以预览、编辑",
    "配置处可以修改公告基本设置"
  ]
  ui.btns = [{
    text: "配置",
    icon: ui_icon.sign,
    func: () => {
      usfFunctionBar(player, "board")
    }
  },
  {
    text: "添加公告",
    icon: ui_icon.add,
    func: () => {
      editBoardBar(player, `board${Date.now()}`)
    }
  }
  ]
  var boards = get_boards()
  for (var key of Object.keys(boards)) {
    var text = (boards[key].able) ? "§2[启用]§r" : "§4[禁用]§r"
    if (boards[key].able && boards[key].up) {
      text += "§n[顶置]§r"
    }
    ui.btns.push({
      text: text + boards[key].name,
      icon: (is_string(boards[key].icon)) ? pictures[boards[key].icon] : null,
      func: (op) => {
        editBoardBar(player, op.key)
      },
      op: {
        "key": key
      }
    })
  }
  ui.show(player)
}

function editBoardBar(player, id) {
  var data = parse_json(get_data(id))
  if (Object.keys(data).length === 0) {
    data = {
      able: true,
      texts: [],
      up: false,
      name: "",
      icon: null
    }
  }
  var ui = new infoBar()
  ui.title = "公告信息配置"
  ui.toggle("able", "[禁用 | 启用]", data.able)
  ui.input("name", "公告显示名称", "输入名称", data.name)
  add_pictures_choice(ui, "选择公告的图标", data.icon)
  ui.toggle("up", "顶置", data.up)
  ui.toggle("delete", "删除", false)

  ui.cancel = () => {
    usfBoardBar(player)
  }

  ui.show(player, (r) => {
    if (r["delete"] === true) {
      clear_data(id)
      var ids = get_board_ids()
      array_clear(ids, id)
      save_data("board_ids", to_json(ids))
      usfBoardBar(player)
    } else {
      data.name = r.name
      data.up = r.up
      data.able = r.able
      data.icon = r.icon
      save_data(id, to_json(data))
      var ids = get_board_ids()
      if (array_has(ids, id) === false) {
        ids.push(id)
      }
      save_data("board_ids", to_json(ids))

      var ed = new arrayEditor()
      ed.look = () => {
        return tran_text(player, data.texts)
      }
      ed.edit(player, data.texts)
      ed.back = () => {
        save_data(id, to_json(data))
        usfBoardBar(player)
      }
    }
  })
}

function editLock(player, index, first) {
  var cf = lock_config[index]
  var ui = new infoBar()
  ui.cancel = () => {
    if (first) {
      lock_config.splice(index, 1)
    }
    setLockBar(player)
  }
  ui.title = "编辑锁定物品"
  ui.input("id", "物品id", "输入id(如:minecraft:apple)", to_string(cf[1]))
  ui.range("count", "物品数量", 0, 64, 1, to_number(cf[2], 1))
  ui.options("slot", "锁定位置", [
    "物品栏1",
    "物品栏2",
    "物品栏3",
    "物品栏4",
    "物品栏5",
    "物品栏6",
    "物品栏7",
    "物品栏8",
    "物品栏9",
  ], to_number(cf[0], 0))
  ui.toggle("de", "删除", false)
  var tag = (cf.length > 3) ? cf[3] : ""
  ui.input("tag", "标签(含该标签才会被锁定此物品)", "标签", tag)
  ui.show(player, (r) => {
    if (r.de) {
      lock_config.splice(index, 1)
    } else {
      cf[0] = r.slot
      cf[1] = r.id
      cf[2] = r.count
      cf[3] = r.tag
    }
    save_lock_config()
    setLockBar(player)
  })
}

function setLockBar(player) {
  var ui = new btnBar()
  ui.title = "物品锁定"
  ui.cancel = () => {
    usfSettingBar(player)
  }
  ui.body = "管理锁定物品\n提示：为玩家添加reload_lock_item标签可以立马刷新玩家的锁定物品"
  ui.btns.push({
    text: "添加",
    icon: ui_icon.add,
    func: () => {
      lock_config.push([])
      editLock(player, lock_config.length - 1, true)
    }
  })
  ui.btns.push({
    text: "立即重载",
    icon: ui_icon.go,
    func: () => {
      for (var p of world.getAllPlayers()) {
        reset_lock_item(p)
      }
      setLockBar(player)
    }
  })
  for (var i = 0; i < lock_config.length; i++) {
    var items = lock_config[i]
    ui.btns.push({
      text: `${items[1]}\n物品栏:${items[0] + 1}`,
      op: {
        index: i
      },
      func: (op) => {
        editLock(player, op.index, false)
      }
    })
  }

  ui.show(player)

}

function resetBoardBar(player) {
  var ui = new btnBar()
  ui.title = "记分版默认值设置"
  ui.cancel = () => {
    usfSettingBar(player)
  }
  ui.body = ["当玩家记分版无值时，插件自动给予默认值"]
  for (var i = 0; i < reset_boards.length; i++) {
    var b = reset_boards[i]
    ui.btns.push({
      text: `记分版:${b[0]}\n默认值:${b[1]}`,
      op: {
        index: i
      },
      func: (op) => {
        var bd = reset_boards[op.index]
        var ui2 = new infoBar()
        ui2.cancel = () => {
          resetBoardBar(player)
        }
        ui2.title = "设置默认值"
        ui2.input("id", "记分版ID", "输入id", bd[0])
        ui2.input("value", "默认值", "输入整数", String(bd[1]))
        ui2.toggle("de", "删除", false)
        ui2.show(player, (r) => {
          if (r.de) {
            reset_boards.splice(op.index, 1)
            save_reset_boards()
            resetBoardBar(player)
          } else {
            bd[0] = r.id
            bd[1] = to_number(parseInt(r.value))
            save_reset_boards()
            resetBoardBar(player)
          }
        })
      }
    })
  }

  ui.btns.push({
    text: `添加`,
    icon: ui_icon.add,
    func: () => {
      var ui2 = new infoBar()
      ui2.cancel = () => {
        resetBoardBar(player)
      }
      ui2.title = "设置默认值"
      ui2.input("id", "记分版ID", "输入id", "")
      ui2.input("value", "默认值", "输入整数", "0")
      ui2.show(player, (r) => {
        reset_boards.push([r.id, to_number(parseInt(r.value))])
        save_reset_boards()
        resetBoardBar(player)
      })
    }
  })
  ui.show(player)
}

function setConfigItemBar(player) {
  var item = get_player_offhand_item(player)
  var ui = new btnBar()
  ui.title = "设置全局配置文件"
  ui.body = ["管理可以通过物品打开的全局配置文件", "注：在编辑界面将物品id留空则会删除此配置"]
  ui.btns = [{
    text: "新增物品",
    icon: ui_icon.add,
    func: () => {
      var ui2 = new infoBar()
      ui2.title = "新增物品"
      ui2.input("id", "物品id", "输入id", "minecraft:")
      ui2.cancel = () => {
        setConfigItemBar(player)
      }
      if (!un(item)) {
        if (item.typeId === "usf:config_file") {
          ui2.toggle("update", "绑定为当前配置文件", true)
        }
      }
      ui2.show(player, (r) => {
        if (r.id === "") {
          setConfigItemBar(player)
          return
        }

        var o = {}
        if (to_bool(r.update, false)) {
          set_store_item(item, (chest, slot) => {
            o.chest = chest
            o.item = slot
            config.config_item[r.id] = o
            save_config()
            setConfigItemBar(player)
          })
        } else {
          config.config_item[r.id] = o
          save_config()
          setConfigItemBar(player)
        }

      })
    }
  }]

  for (var id in config.config_item) {
    ui.btns.push({
      text: id,
      op: {
        id: id
      },
      func: (op) => {
        editConfigItemDetailBar(player, op.id)
      }
    })
  }

  ui.show(player)

}

function editConfigItemDetailBar(player, id) {
  var item = get_player_offhand_item(player)
  var ui = new infoBar()
  ui.title = "修改物品"
  ui.input("id", (is_string(config.config_item[id].chest) ? "当前已绑定配置文件" : "当前没有绑定配置文件") + "\n物品id", "输入id", id)
  ui.cancel = () => {
    setConfigItemBar(player)
  }
  if (!un(item)) {
    if (item.typeId === "usf:config_file") {
      ui.toggle("update", "绑定/覆盖为当前配置文件", false)
    }
  }
  ui.show(player, (r) => {
    var o = {
      ...config.config_item[id]
    }
    delete config.config_item[id]
    if (r.id === "") {
      setConfigItemBar(player)
      return
    }
    if (to_bool(r.update, false)) {
      set_store_item(item, (chest, slot) => {
        o.chest = chest
        o.item = slot
        config.config_item[r.id] = o
        save_config()
        setConfigItemBar(player)
      })
    } else {
      config.config_item[r.id] = o
      save_config()
      setConfigItemBar(player)
    }

  })
}

function setScoreBar(player) {
  var ui = new btnBar()
  ui.cancel = () => {
    usfSettingBar(player)
  }
  ui.title = "管理数据统计方案"
  ui.body = ["管理数据统计方案"]
  ui.btns = [{
    text: "新增数据统计方案",
    icon: ui_icon.add,
    func: () => {
      var ui2 = new infoBar()
      ui2.cancel = () => {
        setScoreBar(player)
      }
      ui2.title = "新增数据统计方案"
      ui2.input("tag", "使用该方案的玩家的tag(不填则没有tag限制)", "标签", "")
      ui2.show(player, (r) => {
        score_config[r.tag] = []
        save_score_config()
        setScoreBar(player)
      })
    }
  }]
  if (Object.keys(score_config).length > 0) {
    ui.btns.push({
      text: "删除方案",
      icon: ui_icon.delete,
      func: () => {
        var groups = score_config

        var ui2 = new infoBar()
        ui2.cancel = () => {
          setScoreBar(player)
        }
        ui2.title = "删除方案"
        for (var name in groups) {
          ui2.toggle(name, name, false)
        }

        ui2.show(player, (r) => {
          for (var name in r) {
            if (r[name]) {
              delete groups[name]
            }
          }
          save_score_config()
          setScoreBar(player)
        })
      }
    })
  }

  for (var c of Object.keys(score_config)) {
    var cf = c
    ui.btns.push({
      text: cf,
      func: () => {
        setScorePages(player, cf)
      }
    })
  }

  ui.show(player)
}

function setScorePages(player, cf) {
  var ui = new btnBar()
  ui.title = "设置方案"
  ui.body = ["配置方案", "方案Tag:" + cf]
  ui.btns = [{
    text: "新增统计",
    icon: ui_icon.add,
    func: () => {
      editScorePage(player, cf, {}, true)
    }
  }]

  for (var i = 0; i < score_config[cf].length; i++) {
    ui.btns.push({
      text: score_config[cf][i].name,
      op: {
        i: i
      },
      func: (op) => {
        editScorePage(player, cf, score_config[cf][op.i], false)
      }
    })
  }
  ui.show(player)
}

function editScorePage(player, tag, page, first = false) {
  if (first) {
    page = {
      type: "",
      data: "",
      name: "",
      board: ""
    }
  }
  
  var text = "切换维度-输入目标维度ID\n破坏方块-破坏的方块ID\n放置方块-放置的方块ID\n造成伤害-伤害的实体ID\n杀死实体-杀死的实体ID\n其他不用填"
  var ui = new infoBar()
  ui.cancel = () => {
    setScorePages(player, tag)
  }
  ui.title = "编辑统计"
  ui.input("name", "备注名", "输入备注名", page.name)
  ui.options("type", "统计类型", [
    "玩家死亡", "玩家切换维度", "破坏方块", "放置方块", "造成伤害", "生命值", "杀死实体", "加入游戏", "购买物品金额", "收购物品金额", "玩家受伤的血量(约为整数)", "玩家受伤次数", "击杀敌对生物"
  ], array_index(data_format.score, page.type))

  ui.input("board", "记分版ID", "输入记分版", page.board)
  ui.input("data", "限制数据\n" + text, "输入限制数据", page.data)
  if (!first) {
    ui.toggle("d", "删除", false)
  }
  ui.show(player, (r) => {
    if (first) {
      score_config[tag].push(page)
    } else {
      if (r.d) {
        array_clear(score_config[tag], page)
        save_score_config()
        setScorePages(player, tag)
        return
      }
    }
    page.type = data_format.score[r.type]
    page.data = r.data
    page.name = r.name
    page.board = r.board
    save_score_config()
    setScorePages(player, tag)
  })
}

//插件设置界面
function usfFunctionBar(player, type) {
  var ui = new infoBar()
  ui.cancel = () => {
    usfSettingBar(player)
  }

  switch (type) {
    case "online":
      ui.title = "在线记分版"
      var text = "下面填入只需要显示在线玩家的记分版id，多个id用;隔开\n插件会自动生成id\"名字_\"的记分版，这个记分版就是只显示在线玩家的记分版\n例如:Show记分版将生成Show_记分版"
      ui.input("online", text, "输入记分版id", config.other.online)
      break
    case "other":
      ui.title = "其他功能设置"
      ui.toggle("chat_board", "留言板[禁用 | 启用]", config.other.chat_board)
      ui.toggle("other_mod_support", "其他模组支持[禁用 | 启用]", config.other.other_mod_support)
      break
    case "log":
      ui.title = "日志设置"
      ui.toggle("able", "[禁用 | 启用]", config.log.able)
      ui.range("down", "(由于无法日志服务器时,控制台会弹出警告,当首次无法连接时,USF会进入冷却,暂停日志发送,以防止控制台刷屏)\n冷却时间", 30, 600, 30, config.log.down)
      ui.input("address", "日志服务器地址(一般不改)", "输入地址", config.log.address)
      for (var name of data_format.logs) {
        ui.toggle(name, get_text("log." + name), array_has(config.log.allow, name))
      }
      break
    case "reset":
      resetBoardBar(player)
      return
    case "hacker":
      ui.title = "反作弊设置"
      ui.toggle("back", "回退操作[禁用 | 启用]", config.hacker.back)
      ui.toggle("kick", "踢出玩家[禁用 | 启用]", config.hacker.kick)
      ui.toggle("chest", "反自动偷箱", array_has(config.hacker.allow, "chest"))
      break
    case "store":
      ui.title = "全局商店设置"
      ui.toggle("able", "全局商店[禁用 | 启用]", config.store.able)
      break
    case "score":
      setScoreBar(player)
      return
      break
    case "cd_items":
      var editor = new arrayEditor()
      editor.back = () => {
        save_config()
        usfSettingBar(player)
      }
      editor.edit(player, config.cd_items)
      return
      break
    case "brush":
      ui.title = "语言设置"
      ui.options("l", "语言", ["简体中文", "繁体中文"], config.language)
      break
    case "group":
      ui.title = "群组设置"
      ui.toggle("able", "[禁用 | 启用]", config.groups.able)
      ui.range("max", "可创建群组数量(管理员可无限创建)", 0, 100, 1, config.groups.max)
      break
    case "land":
      ui.title = "领地设置"
      ui.toggle("able", "[禁用 | 启用]", config.land.able)
      ui.range("max", "可创建领地数量(管理员可无限创建)", 0, 100, 1, config.land.max)
      ui.input("board", "领地扣费记分版id", "输入id", config.land.board)
      ui.range("price", "领地价格/每方块(最后价格约成整数)", 0, 10, 1, config.land.price)
      ui.toggle("must", "金额必须足够(若关闭，则记分版可能会被扣费成负数)", config.land.must)
      ui.input("show", "领地提示语(/name转换为领地主名字)", "输入提示语", config.land.show)
      break
    case "cd_con":
      var menu = to_array(parse_json(get_data("menu_text")), data_format.menu)
      var editor = new arrayEditor()
      editor.back = () => {
        save_data("menu_text", to_json(menu))
        usfSettingBar(player)
      }
      editor.tran = true
      editor.look = () => {
        return tran_text(player, menu)
      }
      editor.edit(player, menu)
      return
    case "board":
      var boards = get_boards()
      var names = ["无"]
      var ids = Object.keys(boards)
      for (var key of ids) {
        names.push(boards[key].name)
      }
      ids = [""].concat(ids)
      ui.title = "公告配置"
      ui.toggle("able", "公告[关闭 | 开启]", config.board.able)

      ui.options("_", "默认公告", names, array_index(ids, config.board["_"]))
      ui.match(ids)

      ui.options("first", "发给新成员", names, array_index(ids, config.board.first))
      ui.match(ids)
      break
    case "hurttip":
      ui.title = "伤害血量功能设置"
      ui.toggle("able", "伤害血量提示[关闭 | 开启]", config.hurt.able)
      ui.options("type", "显示模式", ["条状", "心形"], config.hurt.type)
      break
    case "tran":
      ui.title = "转账机功能设置"
      ui.toggle("able", "转账机[关闭 | 开启]", config.tran.able)
      ui.input("board", "转账的记分版，多个之间用英文分号;分隔", "输入记分版ID", config.tran.board)
      ui.range("free", "手续费(百分比)", 0, 200, 1, config.tran.free)
      break
    case "daily":
      ui.title = "每日签到设置"
      ui.toggle("able", "每日签到[关闭 | 开启]", config.daily.able)
      ui.input("command", '命令\n格式：["命令1","命令2"]', "输入命令", config.daily.command)
      break
    case "time":
      ui.title = "游戏时间统计"
      ui.toggle("able", "游戏时间统计[关闭 | 开启]\n游戏时间的记分版id为time\n显示时间的记分版id为time_show", config.time.able)
      ui.options("type", "统计时间", ["每秒", "每分钟"], config.time.type)
      ui.toggle("show", "显示时间并锁定在玩家列表", config.time.show)
      break
    case "tip":
      ui.title = "进服欢迎提示"
      ui.toggle("able", "进服欢迎提示[关闭 | 开启]", config.tip.able)
      ui.input("content", "内容" + get_text("tran_text"), "输入内容", get_data("tip"))
      break
    case "chat":
      ui.title = "聊天格式"
      var text = get_text("tran_text") + "\n\n聊天格式设置(以下内容会被特殊转义)：\n/sender >>发送者名称\n/tag >>聊天头衔\n/text >>聊天内容"
      ui.input("format", text, "输入内容", config.chat.format)
      ui.toggle("clear", "禁用彩色字符", to_bool(config.chat.clear))
      ui.input("l", "消息长度限制(最大长度)", "长度", String(config.chat.length))
      ui.input("tag", "玩家默认头衔(无则显示为维度)", "输入头衔", config.chat.tag)
      ui.toggle("disable", "§e强行禁用USF聊天系统§r(+命令仍能使用)", to_bool(config.chat.disable))
      break
    case "name":
      ui.title = "玩家名格式设置"
      var text = get_text("tran_text") + "\n\n玩家名格式设置"
      ui.toggle("able", "[禁用|启用]\n注意：与特殊命令name可能会冲突", config.name.able)
      ui.input("format", text, "输入内容", config.name.format)
      break
    case "pos":
      ui.title = "传送页面设置"
      ui.toggle("die", "返回死亡点[关闭 | 开启]", config.tp.die)
      ui.toggle("per", "个人传送点[关闭 | 开启]", config.tp.per)
      ui.toggle("pp", "玩家互传TPA[关闭 | 开启]", config.tp.pp)
      ui.toggle("world", "世界共享点[关闭 | 开启]", config.tp.world)
      ui.toggle("group", "群组共享点[关闭 | 开启]", config.tp.group)
      ui.toggle("back", "传送返回[关闭 | 开启]", config.tp.back)
      ui.toggle("share", "分享传送点[关闭 | 开启]", config.tp.share)
      ui.range("per_count", "个人传送点数量", 1, 55, 1, config.tp.per_count)
      ui.range("random_range", "随机传送距离(为0时不显示)", 0, 50000, 1000, config.tp.random_range)
      ui.toggle("random_end", "允许末地使用随机传送", config.tp.random_end)
      ui.range("down", "TP冷却时间/s", 0, 600, 10, config.tp.down)
      break
    case "game":
      ui.title = "游戏辅助设置"
      ui.toggle("kill", "主菜单显示自杀按钮", config.game.kill)
      ui.toggle("creeper", "苦力怕爆炸不破坏地形", config.game.creeper)
      ui.toggle("sign", "编辑告示牌需要双击", config.game.sign)
      ui.toggle("lock", "非op锁定生存模式", config.game.lock)
      ui.toggle("fb", "可发射火焰弹", config.game.fb)
      ui.range("r_in", "进入游戏给予抗性提升5的时间", 0, 30, 1, config.game.r_in)
      ui.range("r_di", "维度改变给予抗性提升5的时间", 0, 30, 1, config.game.r_di)
      ui.range("r_rs", "重生给予抗性提升5的时间", 0, 30, 1, config.game.r_rs)
      break
    case "mini":
      ui.title = "小游戏功能设置"
      ui.toggle("land_tag", "领地内赋予玩家§eland.领地ID§r的标签", config.mini.land_tag)
      ui.toggle("clear_tag", "玩家进入游戏清除_(下划线)开头的tag", config.mini.clear_tag)
      break
    case "com":
      ui.title = "插件命令设置"
      for (var key of data_format.commands) {
        ui.toggle(key, `+${key}(${get_text('commands.' + key)})`, array_has(config.commands, key))
      }
      break
  }

  ui.show(player, (r) => {
    switch (type) {
      case "board":
        config.board["_"] = r["_"]
        config.board["first"] = r["first"]
        config.board.able = r.able
        save_config()
        usfBoardBar(player)
        break
      case "online":
        config.other.online = r.online
        save_config()
        break
      case "tran":
        config.tran.able = r.able
        config.tran.board = r.board
        config.tran.free = Math.round(r.free)
        save_config()
        usfSettingBar(player)
        break
      case "daily":
        config.daily.able = r.able
        config.daily.command = r.command
        save_config()
        usfSettingBar(player)
        break
      case "mini":
        config.mini.land_tag = r.land_tag
        config.mini.clear_tag = r.clear_tag
        save_config()
        usfSettingBar(player)
        break
      case "group":
        config.groups.able = r.able
        config.groups.max = r.max
        save_config()
        usfSettingBar(player)
        break
      case "store":
        config.store.able = r.able
        save_config()
        usfSettingBar(player)
        break
      case "hacker":
        config.hacker.back = r.back
        config.hacker.kick = r.kick
        config.hacker.allow = []
        if (r.chest) {
          config.hacker.allow.push("chest")
        }
        save_config()
        usfSettingBar(player)
        break
      case "brush":
        config.language = r.l
        save_config()
        usfSettingBar(player)
        break
      case "hurttip":
        config.hurt.able = r.able
        config.hurt.type = r.type
        save_config()
        usfSettingBar(player)
        break
      case "land":
        config.land.able = r.able
        config.land.must = r.must
        config.land.price = r.price
        config.land.board = r.board
        config.land.max = r.max
        config.land.show = r.show
        save_config()
        if (un(world.scoreboard.getObjective(config.land.board))) {
          confirm(player, "刚才配置的记分版不存在！领地功能无法使用！", () => {
            usfSettingBar(player)
          })
        } else {
          usfSettingBar(player)
        }
        break
      case "time":
        config.time.able = r.able
        config.time.type = r.type
        config.time.show = r.show
        save_config()
        usfSettingBar(player)
        break
      case "tip":
        config.tip.able = r.able
        save_data("tip", r.content)
        save_config()
        usfSettingBar(player)
        break
      case "log":
        config.log.able = r.able
        config.log.down = r.down
        config.log.address = r.address
        config.log.allow = []
        for (var name of Object.keys(r)) {
          if (array_has(data_format.logs, name)) {
            if (r[name]) {
              config.log.allow.push(name)
            }
          }
        }
        save_config()
        usfSettingBar(player)
        break
      case "chat":
        config.chat.format = r.format
        config.chat.clear = r.clear
        config.chat.length = to_number(parseInt(r.l), 1024)
        config.chat.tag = r.tag
        config.chat.disable = r.disable
        save_config()
        usfSettingBar(player)
        break
      case "name":
        config.name.format = r.format
        config.name.able = r.able
        save_config()
        usfSettingBar(player)
        break
      case "com":
        config.commands = []
        for (var key of Object.keys(r)) {
          if (r[key]) {
            config.commands.push(key)
          }
        }
        save_config()
        usfSettingBar(player)
        break
      case "pos":
        config.tp.random_range = r.random_range
        config.tp.random_end = r.random_end
        config.tp.die = r.die
        config.tp.world = r.world
        config.tp.per = r.per
        config.tp.share = r.share
        config.tp.pp = r.pp
        config.tp.per_count = r.per_count
        config.tp.down = r.down
        config.tp.group = r.group
        config.tp.back = r.back
        save_config()
        usfSettingBar(player)
        break
      case "other":
        config.other.chat_board = r.chat_board
        config.other.other_mod_support = r.other_mod_support
        save_config()
        usfSettingBar(player)
        break
      case "game":
        config.game.kill = r.kill
        config.game.creeper = r.creeper
        config.game.sign = r.sign
        config.game.lock = r.lock
        config.game.r_in = r.r_in
        config.game.r_di = r.r_di
        config.game.fb = r.fb
        config.game.r_rs = r.r_rs
        save_config()
        usfSettingBar(player)
        break
    }
  })
}

function show_board(player, id = null, show_cd = true) {
  var boards = get_boards()
  if (config.board.able === false || boards.length === 0) {
    return
  }
  var ids = Object.keys(boards)
  for (var i of ids) {
    if (boards[i].able === false) {
      array_clear(ids, i)
    }
  }
  var board = null
  var current_id = id
  if (id === null) {
    if (player.info.join_times === 1 && is_object(boards[config.board.first])) {
      board = boards[config.board.first]
      current_id = config.board.first
    }
    if (board === null && is_object(boards[config.board["_"]])) {
      board = boards[config.board["_"]]
      current_id = config.board["_"]
    }
  } else {
    board = boards[id]
  }
  if (board === null) {
    var i = ids[random_int(ids.length)]
    board = boards[i]
    current_id = i
  }
  var ui = new btnBar()
  ui.busy = null
  ui.title = board.name
  ui.body = tran_text(player, board.texts, true)
  if (show_cd) {
    ui.btns = [{
      text: "主菜单",
      icon: ui_icon.craft_table,
      func: () => {
        cdBar(player)
      }
    }]
  }

  for (var i = 0; i < ids.length; i++) {
    var last_id = ids[i]
    if (last_id !== current_id && boards[last_id].able) {
      ui.btns.push({
        text: (boards[last_id].up ? "§n[顶置]§r" : "") + boards[last_id].name,
        icon: (is_string(boards[last_id].icon)) ? pictures[boards[last_id].icon] : null,
        func: (op) => {
          show_board(player, String(op.ii))
        },
        op: {
          ii: last_id
        }
      })
      if (boards[last_id].up) {
        ui.btns.splice(0, 0, ui.btns.pop())
      }
    }
  }

  if (ui.btns.length === 0) {
    ui.btns.push({
      text: "关闭",
      icon: ui_icon.delete,
      func: () => { }
    })
  }
  ui.show(player)
}

// function show_board(player){
// var content = get_data("board_content")

// var ui = new ui.btnBar()
// ui.title = "公告板"
// ui.body = content

// ui.setBusy("again",40)
// ui.setCancel("close")

// if(enable_settings.board.length < totals.length && full_text === false){
// ui.addButton("展开§?Unfold",{icon:ui_icon.down},(id,option) => {
// show_board(player,true)
// })
// }

// ui.addButton("打开主菜单§?Menu Page",{icon:ui_path + "icon_crafting.png"},(id,option) => {
// try_cdBar(player)
// })
// ui.addButton("交易系统§?Trade Page",{icon:ui_path + "icon_deals.png"},(id,option) => {
// tradeBar(player)
// })
// ui.addButton("帮助页面§?Help",{icon:ui_path + "how_to_play_button_default.png"},(id,option) => {
// helpBar(player)
// player_history(player,show_board)
// })
// ui.addButton("语言设置/Language",{icon:ui_path + "world_glyph_color_2x.png"},(id,option) => {
// var ui = new infoBar()
// ui.back_func = ()=>{
// show_board(player)
// }
// ui.setCancel("run",()=>{
// show_board(player)
// })
// languageBar(player,ui)
// })

// if(is_page_changer(player)){
// ui.addButton("编辑此页面§?Edit this page",{"icon":ui_icon.setting},(id,option) =>{
// pageSetBar(player,"board",() => {
// cdBar(player)
// })  
// })
// ui.addButton("编辑公告内容§?Edit this page content",{icon:ui_icon.page},(id,option) =>{
// var ui = new arrayEditor()
// ui.tran = true
// ui.array = [...totals]
// ui.callback = function(result){
// totals = result
// save_totals()
// }
// ui.finish = () =>{
// show_board(player)
// }
// ui.show(player)
// })
// }
// if(has_feature("Board")){
// ui.show(player)
// }
// }

//工具函数

function clear_colour(text) {
  return text.replace(/§./g, "")
}

//判断变量是否是string
function is_string(v) {
  return typeof (v) == "string" ? true : false
}

function is_function(v) {
  return typeof (v) == "function" ? true : false
}

function to_bool(v, none = false) {
  if (typeof (v) === "boolean") {
    return v
  }
  return none
}

function is_object(v) {
  return typeof (v) == "object" ? true : false
}

function is_array(v) {
  return Array.isArray(v)
}

//下面是格式化函数

function to_string(value, none = "") {
  return typeof (value) == "string" ? value : none
}

function to_array(value, none = []) {
  return Array.isArray(value) ? value : none
}

function to_object(value, none = {}) {
  return typeof (value) == "object" ? value : none
}

function array_index(array, text, none = 0) {
  var index = array.indexOf(text)
  return (index >= 0) ? index : none
}

function add_pictures_choice(ui, text, choice = null) {
  var texts = ["无"]
  var keys = Object.keys(pictures)
  for (var k of keys) {
    texts.push(get_text("Pictures." + k))
  }
  ui.options("icon", text, texts, (keys.indexOf(choice) === -1) ? 0 : keys.indexOf(choice) + 1)
  ui.match([null].concat(Object.keys(pictures)))
}

function random_int(max = 10) {
  return Math.floor(Math.random() * max)
}

function array_clear(array, text) {
  while (array.indexOf(text) >= 0) {
    array.splice(array.indexOf(text), 1)
  }
}

function array_has(array, text) {
  if (array.indexOf(text) >= 0) {
    return true
  }
  return false
}

function is_number(value) {
  if (typeof (value) == "number") {
    if (!isNaN(value)) {
      return true
    }
  }
  return false
}

function is_bool(value) {
  if (typeof (value) == "boolean") {
    return true
  }
  return false
}

function to_number(value, none = 0) {
  if (typeof (value) == "number") {
    if (!isNaN(value)) {
      return value
    }
  }
  return none
}

function array2string(array = [], none = "", clear_color = false) {
  if (is_string(array)) {
    return array
  } else {
    if (is_array(array)) {
      var text = ""
      for (var cf of array) {
        text += "\n"
        if (clear_color) {
          text += "§r"
        }
        text += cf
      }
      return text.slice(1)
    }
  }
  return none
}

function parse_number(text, none = 0) {
  var num = parseFloat(text)
  if (Number.isNaN(num)) {
    return none
  }
  return num
}

function string_has(str, text) {
  if (str.indexOf(text) === -1) {
    return false
  }
  return true
}

function format(id, replacer) {
  var text = get_text(id)
  for (var i = 0; i < replacer.length; i++) {
    text = text.replaceAll(("[" + String(i) + "]"), String(replacer[i]))
  }
  return text
}

function parse_json(data) {
  if (!is_string(data) || data == "") {
    return {}
  }
  try {
    data = JSON.parse(data)
  } catch (e) { }
  return to_object(data, {})
}

function pos_string(vec) {
  return `(${Math.round(vec.x)},${Math.round(vec.y)},${Math.round(vec.z)})`
}

//to_json必须传入object
function to_json(data) {
  if (!is_object(data)) {
    return
  }
  try {
    data = JSON.stringify(data)
  } catch (e) { }
  return to_string(data, "{}")
}

//文本格式化
function tran_text(player, texts, keep_array = false) {
  var things = {}

  if (is_player(player)) {
    var spawn = player.getSpawnPoint()
    if (un(spawn)) {
      spawn = world.getDefaultSpawnLocation()
    }
    spawn.y = 64
    things = {
      name: player.name,
      pos: pos_string(player.location),
      dimension: player.dimension.name,
      tag: get_chat_tag(player),
      health: String(Math.ceil(player.health.currentValue)),
      level: String(player.level),
      respawn: get_block_pos({
        location: spawn
      }),
      join: String(player.info.join_times)
    }
    var boards = world.scoreboard.getObjectives()
    for (var b of boards) {
      if (b.hasParticipant(player)) {
        things["board." + b.id + ".score"] = String(b.getScore(player))
      } else {
        things["board." + b.id + ".score"] = "0"
      }
    }
  }

  var tran = function (line) {
    if (line.startsWith("**")) {

    } else {
      if (string_has(line, "/")) {
        for (var k of Object.keys(tran_info)) {
          line = line.replaceAll("/" + k, tran_info[k])
        }
        for (var k of Object.keys(things)) {
          line = line.replaceAll("/" + k, things[k])
        }
      }
      if (string_has(line, "var(")) {
        while (line.indexOf("var(") !== -1) {
          var index = line.indexOf("var(")
          var index2 = line.indexOf(")", index)
          if (index2 !== -1) {
            line = line.slice(0, index) + to_string(vars[line.slice(index + 4, index2)]) + line.slice(index2 + 1)
          } else {
            line = line.slice(0, index) + to_string(vars[line.slice(index + 4)])
          }
        }
      }
    }

    line = line.replaceAll("/n", "\n")
    return line
  }

  var text = []

  if (is_array(texts)) {
    for (var cf = 0; cf < texts.length; cf++) {
      text.push(tran(texts[cf]))
    }

    if (keep_array) {
      return text
    } else {
      return array2string(text, "", true)
    }
  }
  if (is_string(texts)) {
    text = tran(texts)
  }

  return text
}

function un(v) {
  if (v == undefined) {
    return true
  }
  return false
}

function server_log(type, text, path) {
  if (!log_config.able || !config.log.able) {
    return
  }
  if (!log_config.server) {
    return
  }
  switch (type) {
    case 0:
      type = "log"
      break
    case 1:
      type = "print"
      break
    case 2:
      type = "info"
      text = to_json(text)
      break
  }
  text = clear_colour(text)
  logs.push({
    type: encodeURI(type),
    text: encodeURI(text),
    path: encodeURI(path),
    v: "2"
  })

}