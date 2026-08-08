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
  }

  ui.show(player, (r) => {
    switch (type) {
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
