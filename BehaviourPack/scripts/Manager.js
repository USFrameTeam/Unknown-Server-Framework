import { chooseBar, playerChooser, register_global_ui , show_global_ui } from "./Basic/UniversalUI.js";
import { btnBar , infoBar } from "./Basic/ui.js";
import { config , register_system } from "./Basic/Core.js";
import { id_names , ids , save_player_info } from "./Basic/Player.js";
import { get_op_level } from "./Basic/Permission.js";
import * as logger from "./Basic/Logger.js";
import { format , get_text } from "./Basic/Text.js";
import { ui_icon , pictures } from "./Basic/Data.js";
import * as mc from "./Basic/Mc.js";
import * as tool from "./Basic/Tool.js";

/*Manager.js
功能：
1.定义管理员界面
2.定义全局性管理员功能
*/

var external_btns = [];

function managerBar(player , options = {cancel = ()=>{show_global_ui(player,"usf");}}){
    if (get_op_level(player) === 0) {
        return;
    }
    const ui = new btnBar();
    let btn_options = {
        player : player,
    }
    ui.busy = null;
    ui.title = "管理员界面";
    ui.body = "欢迎使用管理员功能";
    if(tool.is_function(options.cancel)){
        ui.cancel = options.cancel;
    }
    ui.btns = [
        {
            text: "查看历史日志",
            icon: ui_icon.share,
            func: () => {
                checkHistoryLogBar(player);
            }
        },{
            text: "调试输出js全局变量",
            icon: ui_icon.random,
            func: () => {
                mc.chat("config:" + tool.to_json(config), [player]);
                mc.chat("IDs:" + tool.to_json(ids), [player]);
                mc.chat("Names:" + tool.to_json(id_names), [player]);
            }
        },
        {
            text: "复制物品栏物品",
            icon: ui_icon.copy,
            func: () => {
                copyHotbarBar(player);
            }
        },
        {
            text: "性能检测",
            icon: ui_icon.info,
            func: () => {
                performanceBar(player);
            }
        },
        {
            text: format("管理模式 - [0]\n可破坏领地、在领地界面做修改", [tool.to_bool(player.info.manager,false) === true ? "开" : "关" + "\n"]),
            icon: ui_icon.manager,
            func: () => {
                if ( un(player.info.manager) || player.info.manager === false) {
                    player.info.manager = true;
                    save_player_info(player);
                } else {
                    player.info.manager = false;
                    save_player_info(player);
                }
            }
        },
        {
            text: "视角跟踪",
            icon: ui_icon.eye,
            func: () => {
                show_global_ui(player,"follow");
            }
        },{
            text: "获取背包",
            icon: pictures.chest,
            func: () => {
                getPlayerItemsBar(player);
            }
    },
    ];
    for(let btn of external_btns){
        btn.op = btn_options;
        ui.btns.push(btn);
    }
    ui.show(player);
}

function getPlayerItemsBar(player) {
  const block = player.dimension.getBlock(player.location);
  const com = player.slots;
  const items = [];
  if (!block.isAir) {
    tip(player, "您所在的位置不是空气方块，无法执行背包检查功能！", () => {
      managerBar(player);
    });
    return;
  } else {
    playerChooser(player, mc.get_all_players(), (ps) => {
      for (const p of ps) {
        const com = p.getComponent("minecraft:inventory").container;
        block.setType("minecraft:undyed_shulker_box");
        const b_com = block.getComponent("minecraft:inventory").container;
        b_com.clearAll();

        for (let i = 9; i < com.size; i++) {
          b_com.setItem(i - 9, com.getItem(i));
        }
        items.push(block.getItemStack(1, true))
        b_com.clearAll();

        for (let i = 0; i < 9; i++) {
          b_com.setItem(i, com.getItem(i));
        }
        com = p.getComponent("minecraft:equippable");
        b_com.setItem(9, com.getEquipment("Head"));
        b_com.setItem(10, com.getEquipment("Chest"));
        b_com.setItem(11, com.getEquipment("Legs"));
        b_com.setItem(12, com.getEquipment("Feet"));

        b_com.setItem(18, com.getEquipment("Offhand"));
        items.push(block.getItemStack(1, true));

        b_com.clearAll();
        for (const item of items) {
          b_com.addItem(item);
        }
        const goal = block.getItemStack(1, true);
        goal.nameTag = `玩家背包:${p.name}`;
        p_com.addItem(goal);
        block.setType("minecraft:air");
      }
    });
  }
}


function performanceBar(player) {
  mc.chat("§e[管理员系统]正在进行时长为5s的性能检测...", [player]);
  const start_tick = system.currentTick;
  const start_time = Date.now();

  mc.run_timeout(() => {
    const total_time = (Date.now() - start_time) / 1000;
    const total_tick = system.currentTick - start_tick;
    const tps = (total_tick / total_time).toFixed(2)

    let tps_text = "极其卡顿"
    if (tps > 6) {
      tps_text = "严重卡顿"
    }
    if (tps > 10) {
      tps_text = "卡顿"
    }
    if (tps > 15) {
      tps_text = "稍微卡顿"
    }
    if (tps > 18) {
      tps_text = "优"
    }

    const ui = new btnBar();
    ui.title = "插件性能检查";
    ui.body = [
      "检测用时:" + total_time.toFixed(2) + "s",
      `平均TPS:${tps}(${tps_text})`,
      `配置文件占用:${tool.get_string_length(tool.to_json(config))}/32767`,
    ]
    ui.btns = [{
      text: "管理界面",
      icon: ui_icon.op,
      func: () => {
        managerBar(player);
      }
    }]
    ui.show(player);
  }, 100);
}

function copyHotbarBar(player){
    var ui = new infoBar();
    ui.title = "复制物品栏";
    ui.cancel = () => {
        managerBar(player);
    }

    let description = [];
    for(let index = 1; index <= 9; index++){
        description.push("物品栏" + String(index));
    }

    ui.options("slot", "选择要复制的物品所在的物品栏", description, 0);
    ui.show(player, (r) => {
        const item = player.slots.getItem(r.slot);
        if (!un(item)) {
            player.slots.addItem(item);
            mc.chat("§e[管理系统]复制成功！", [player])
        } else {
            mc.chat("§e[管理系统]该物品不存在，无法复制！", [player]);
        }
    });
}

function checkHistoryLogBar(player) {
    var ui = new btnBar();
    ui.title = "查看历史日志";
    ui.body = ["历史日志(最多存储50条)："].concat(logger.history_logs);
    ui.cancel = ()=>{
        managerBar(player);
    };
    ui.btns = [{
        text: "清理日志",
        func: () => {
            logger.history_logs = [];
            checkHistoryLogBar(player);
        }
    }];
    ui.show(player);
}

function register_manager_bar_btn(btn){
    if(!tool.is_object(btn)){return;}
    if(tool.un(btn.text) || tool.un(btn.func)){return;}
    external_btns.push(btn);
}


core.register_system("manager",{
    "register_manager_bar_btn" : register_manager_bar_btn,
});
register_global_ui("manager",managerBar);

logger.log(0,1,"————管理系统已加载————");