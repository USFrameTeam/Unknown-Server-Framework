import * as command from "./Command.js";
import { btnBar , infoBar } from "./Basic/ui.js";
import { has_system , get_system , exported_datas} from "./Basic/Core.js";
import * as event from "./Basic/Event.js";
import * as mc from "./Basic/Mc.js";
import * as tool from "./Basic/Tool.js";
import * as logger from "./Basic/Logger.js";
import { has_system , get_system } from "./Basic/Core.js";
import { save_data , get_data , ui_icon } from "./Basic/Data.js";
import { format } from "./Basic/Text.js";

/*
ItemLocker.js
功能：物品锁定
*/

var lock_config = [];

event.connect_custom_event("world_load",(things) => {
    lock_config = tool.to_array(tool.parse_json(get_data("lock_items")));

    //注册设置
    if(has_system("setting")){
      get_system("setting").register_setting("lock_item","锁定物品设置",setLockBar);
    }

    logger.log(0,1,"————留言板已加载————");
});

command.register_mc_command({
    description : "重载玩家的锁定物品",
    permissionLevel : 1,
    name : "usf:reload_lock_item",
    mandatoryParameters : [{
        name : "Player",
        type : "PlayerSelector",
    }],
},(origin,args) => {
    let player = args[0];
    reset_lock_item(player);
});


function reset_lock_item(player) {
    if(!tool.is_object(player.slots)){
        logger.log(2,1,format("玩家[0]数据slots加载失败！无法刷新玩家的锁定物品",[player.name]));
        return;
    }
    for(let index = 0; index < player.slots.size; index++){
        const item = player.slots.getItem(index);
        if(!tool.un())
    }
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

function setLockBar(player , back = false) {
  const ui = new btnBar();
  ui.title = "物品锁定";
  ui.cancel = () => {
    event.emit_custom_event("setting_changed",{player : player , back : back});
  }
  ui.body = "管理锁定物品\n提示：使用命令/usf:reset_lock_item可以立马刷新玩家的锁定物品";
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

function save_lock_config() {
  save_data("lock_items", tool.to_json(lock_config));
}

event.connect_custom_event("export" , ()=> {
	exported_datas.push({
		description : "锁定物品",
		id : "lock_item",
		data : tool.to_json(lock_config),
	});
});
event.connect_custom_event("import" , (data_set)=> {
	if(data_set.id !== "lock_item"){return;}
	lock_config = tool.to_array(tool.parse_json(data_set.data));
	save_lock_config();
});