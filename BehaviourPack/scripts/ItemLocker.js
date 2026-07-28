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
var lock_item_condition_list = {};

event.connect_custom_event("world_load",(things) => {
    lock_config = tool.to_array(tool.parse_json(get_data("lock_items")));
    lock_item_condition_list = tool.to_object(tool.parse_json(get_data("lock_items_condition_list")));

    //注册设置
    if(has_system("setting")){
      get_system("setting").register_setting("lock_item","锁定物品设置",setLockBar);
    }

    logger.log(0,1,"————留言板已加载————");
});

event.connect_custom_event("player_load" , (options) => {
  reset_lock_item(options.player);
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

    try {
      //清理旧锁定
      for (let i = 0; i < player.slots.size; i++) {
        const item = player.slots.getItem(i);

        if (tool.is_object(item)) {
          const lore = item.getLore();
          if (lore.length === 1 && lore[0] === "usf:Lock") {
            player.slots.setItem(i);
          }
        }
      }

      for (let config of lock_config) {
        if(config[3] !== "" && has_system("condition") && get_system("condition").test(player , lock_item_condition_list , config[3])){
          continue;
        }
        try {
          const new_item = new mc.ItemStack(config[1], config[2]);
          new_item.setLore(["usf:Lock"]);
          new_item.lockMode = "slot";
          new_item.keepOnDeath = true;
          player.slots.setItem(config[0], new_item);
        } catch (err) {logger.log(2,1,"重置玩家[0]的锁定物品时报错[1]",[player.name , e]);}
      }
    }catch(e){logger.log(2,1,"重置玩家[0]的锁定物品时报错[1]",[player.name , e]);}
}

function editLock(player, index , back) {
  const config = (index === -1) ? [] : lock_config[index];
  const ui = new infoBar();
  ui.cancel = () => {
    setLockBar(player);
  }
  ui.title = "编辑锁定物品";
  ui.input("id", "物品id", "输入id(如:minecraft:apple)", tool.to_string(cf[1]));
  ui.range("count", "物品数量", 1, 64, 1, tool.to_number(cf[2], 1));
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
  ], tool.to_number(cf[0], 0));
  ui.toggle("de", "删除", false);
  ui.input("condition_set", "准则集ID(结果为真的玩家才会执行,留空则默认全部玩家执行)", "准则集ID", tool.to_string(cf[3]));
  ui.show(player, (r) => {
    if (r.de) {
      if(index === -1){
        setLockBar(player , back);
      }else{
        lock_config.splice(index,1);
        save_lock_config();
        setLockBar(player,back);
      }
      return;
    } else {
      cf[0] = r.slot;
      cf[1] = r.id;
      cf[2] = r.count;
      cf[3] = r.condition_set;
    }
    save_lock_config();
    setLockBar(player , back);
  });
}

function setLockBar(player , back = false) {
  const ui = new btnBar();
  ui.title = "物品锁定";
  ui.cancel = () => {
    event.emit_custom_event("setting_changed",{player : player , back : back});
  }
  ui.body = "管理锁定物品\n提示：使用命令/usf:reset_lock_item可以立马刷新玩家的锁定物品";
  ui.btns.push({
    text: "添加锁定物品",
    icon: ui_icon.add,
    func: () => {
      lock_config.push([]);
      editLock(player , -1 , back);
    }
  });
  if(has_system("condition")){
    ui.btns.push({
      text: "编辑准则集列表",
      icon: ui_icon.content,
      func: () => {
        get_system("condition").editConditionList(player , lock_item_condition_list , (intention) => {
          if(intention === "save"){save_lock_condition_list();}
          else{ setLockBar(player , back);}
        });
      }
    });
  }
  ui.btns.push({
    text: "立即重载",
    icon: ui_icon.go,
    func: () => {
      for (var p of mc.get_all_players()) {
        reset_lock_item(p);
      }
      setLockBar(player);
    }
  })
  for (var i = 0; i < lock_config.length; i++) {
    var items = lock_config[i];
    ui.btns.push({
      text: `${items[1]}\n物品栏:${items[0] + 1}`,
      op: {
        index: i
      },
      func: (op) => {
        editLock(player, op.index, back);
      }
    })
  }

  ui.show(player);

}

function save_lock_config() {
  save_data("lock_items", tool.to_json(lock_config));
}

function save_lock_condition_list() {
  save_data("lock_items_condition_list", tool.to_json(lock_item_condition_list));
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
