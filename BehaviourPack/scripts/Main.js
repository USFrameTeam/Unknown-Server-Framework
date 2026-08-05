var limit = {};
var events = {};
var score_config = {};
var command_set = [];


var chat_board = {};

system.chat_board = system.runInterval(() => {
  if (!config.chat_board.able) {
    return;
  }

  const board = world.scoreboard.getObjective("chat") ||
    world.scoreboard.addObjective("chat", "聊天记分板");

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


function reload_all() {


  chests = to_array(parse_json(get_data("chests")), []);
  command_set = to_array(parse_json(get_data("command_set")));
  limit = to_object(parse_json(get_data("limit")));

  if (config.timer !== "") {
    overworld.runCommand(`scoreboard players reset * ${config.timer}`);
  }
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


function save_global_goods() {
  save_generic("global_goods", global_goods);
}

 function reset_player_data(player) {
  
  const storeRecord = parse_json(get_data("store_record", player));

  player.store_record = to_object(storeRecord);


  return;
} 



function save_store_record(player) {
  save_data("store_record", to_json(player.store_record), player);
}




function beforePlayerInteractWithBlock(event) {
  
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

  

  if (to_number(player.last_in, 0) + 20 < system.currentTick) {
    player.last_in = system.currentTick

    if (to_string(player.limiting) !== "") {
      if (!array_has(limit[player.limiting].blocks, block.typeId)) {
        limit[player.limiting].blocks.push(block.typeId)
        chat(`§e[管理系统]已录入：${block.typeId}`)
        save_limit()
      }
    }

    
  }
}




function get_block_pos_id(block) {
  return `${block.dimension.id}.${block.x}.${block.y}.${block.z}`
}
 

function beforeChatSend(event) {
  

  
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

}



function beforeBlockPlace(event) {
  var player = event.player
  var block = event.block
  var per = event.permutationBeingPlaced

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


}

function afterBlockPlace(event) {
  var player = event.player
  var block = event.block
  var id = no_minecraft(block.typeId)
  if (to_string(player.limiting) !== "") {
    chat(`§e[管理系统]已退出录入！`, [player])
  }
  player.limiting = ""

  
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


}

function playerSpawn(event) {
  //var player = event.player
  //var is_login = false

  if (event.initialSpawn === true) {
    //签到相关
    if (un(player.info.last_time)) {
    } else {
      var d1 = new Date(player.info.last_time)
      var d2 = new Date()
      if (is_same_day(d1, d2) === false) {
        player.info.score = {}
      }
    }



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

function afterEntityHurt(event) {
  var hurt = event.hurtEntity
  var hurter = event.damageSource.damagingEntity
  var damage = event.damage

  if (typeof (hurter) === "object") {
    if (hurter.typeId == "minecraft:player") {

      var event = get_item_event(get_player_hand_item(hurter))
      if (!un(event)) {
        if (event[0] === "knock") {
          var level = to_number(parseInt(event[1]), 1)
          if (level > 10) {
            level = 10
          }
          var view = hurter.getViewDirection()
          hurt.applyKnockback({x:view.x * 0.5 * (level + 1), z:view.z * 0.5 * (level + 1)},0.5)
        }
      }

   
    }
  } 
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

function beforePlayerLeave(event) {
  var player = event.player
  //delete id_player[get_id(player)]
  var name = player.name
  var spawn_pos = player.getSpawnPoint()
  var tags = player.getTags()
  var pos = player.location
  pos.dimension = player.dimension

  //save_player_info(player)
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
          log("初始化成功，您已获取最高op！使用钟点地面即可打开主菜单")
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
        const die = player.last_die;
        tpWithAnimation(player, { x: die.x, y: die.y, z: die.z }, die.di);
    }
    break;
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
      player.applyKnockback({x:things[0] * things[2], z:things[1] * things[2]},things[3])
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
        ui2.input("moneys", "统计货币的记分板，多个记分板直接用英文分号;间隔，币种名即为记分板名称", "输入记分板ID", config.store.moneys)
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
        `§e注意：代码无效不会返还物品、记分板分数，所以请测试一下代码是否能正常运行！`
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
  var s = config.store.moneys
  s = (s == "" ? [] : s.split(";"))
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
  //注意传入的good必须是object，如果是新商品请传入一个空object
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
  ui.input("price", "单价(记分板分数/交换物品数量)", "价格必须为整数或0", String(good.price))
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
        if (r.op !== 0 && type === 0) {
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
              if(type === 0){
                save_data(good.id, to_json(good))
              }
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
      save(good, true , r.op)
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
        //score_event(player, "earn", "", good.price * data.count)
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
        //score_event(player, "buy", "", good.price * data.count)
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

  ui.btns = [{
    text: "重置我的今日签到",
    icon: pictures.gift,
    func: () => {
      player.info.daily = 0
    }
  },
  , {
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
  }{
    text: "获取背包",
    icon: pictures.chest,
    func: () => {
      getPlayerItemsBar(player)
    }
  }
    {
    text: "编辑物品特殊效果",
    icon: ui_icon.sword,
    func: () => {
      editItemEvents(player)
    }
  }
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
    text: "记分板计时器",
    icon: ui_icon.speed,
    func: () => {
      var ui2 = new infoBar()
      ui2.title = "记分板计时器"
      ui2.cancel = () => {
        usfSettingBar(player)
      }
      ui2.input("id", "记分板计时器\n注意：只能设置一个记分板作为计时器\n设置后，当记分板有分数>0时，自动开始倒计时，直到分数为-1停下\n设置后，当记分板有分数为-2时，自动开始正计时，直到分数被设置为0或-1\n插件重载/游戏重启后自动清空整个记分板\n\n记分板ID", "输入ID", config.timer)
      ui2.show(player, (r) => {
        config.timer = r.id
        save_config()
        usfSettingBar(player)
      })
    }
  },
 {
    text: "日志功能设置",
    icon: ui_icon.content,
    func: () => {
      usfFunctionBar(player, "log")
    }
  }
  ]
  ui.show(player)
}
//插件设置界面
function usfFunctionBar(player, type) {
  var ui = new infoBar()
  ui.cancel = () => {
    usfSettingBar(player)
  }

  switch (type) {
    case "log":
      ui.title = "日志设置"
      ui.toggle("able", "[禁用 | 启用]", config.log.able)
      ui.range("down", "(由于无法日志服务器时,控制台会弹出警告,当首次无法连接时,USF会进入冷却,暂停日志发送,以防止控制台刷屏)\n冷却时间", 30, 600, 30, config.log.down)
      ui.input("address", "日志服务器地址(一般不改)", "输入地址", config.log.address)
      for (var name of data_format.logs) {
        ui.toggle(name, get_text("log." + name), array_has(config.log.allow, name))
      }
      break
    case "store":
      ui.title = "全局商店设置"
      ui.toggle("able", "全局商店[禁用 | 启用]", config.store.able)
      break
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
    case "daily":
      ui.title = "每日签到设置"
      ui.toggle("able", "每日签到[关闭 | 开启]", config.daily.able)
      ui.input("command", '命令\n格式：["命令1","命令2"]，例如["scoreboard players add @s a 10"]', "输入命令", config.daily.command);
      break
  }

  ui.show(player, (r) => {
    switch (type) {
      case "online":
        config.other.online = r.online
        save_config()
        break
      case "daily":
        config.daily.able = r.able
        config.daily.command = r.command
        save_config()
        usfSettingBar(player)
        break
      case "store":
        config.store.able = r.able
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
