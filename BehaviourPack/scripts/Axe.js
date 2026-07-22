import { infoBar , btnBar } from "./Basic/ui.js";
import * as event from "./Basic/Event.js";
import * as mc from "./Basic/Mc.js";
import { format } from "./Basic/Text.js";
import { ui_icon , get_data , save_data} from "./Basic/Data.js";
import * as tool from "./Basic/Tool.js";
import { config , dimensions, save_config ,has_system , get_system} from "./Basic/Core.js";
import { get_op_level } from "./Basic/Permission.js";
import { playerChooser , tip } from "./Basic/UniversalUI.js";
import * as logger from "./Basic/Logger.js";

/*
Axe.js
功能：小木斧
*/

event.connect_custom_event("world_load",(things) => {

    //注册设置
    if(has_system("setting")){
          get_system("setting").register_setting("axe","小木斧设置",settingBar);
    }

    logger.log(0,1,"————小木斧已加载————");
});

mc.run_interval(() => {
    if(!config.fast_building.able){return;}
    for (const player of mc.get_all_players()) {
        if (get_op_level(player) > 0) {
            const hand_item = mc.get_player_hand_item(player);
            if (tool.is_object(hand_item) && hand_item.typeId === "minecraft:wooden_axe") {
                player.building = tool.to_object(player.building , {
                    blocks : [],
                    shape : undefined,
                });
                if(player.building.shape === undefined && player.building.blocks.length === 2){
                    player.building.shape = mc.create_box_shape(player.dimension,player.building.blocks[0],player.building.blocks[1],[player]);
                }
                mc.set_ActionBar(player, "§e[小木斧]潜行下单击方块打开操作面板");
            }else if(tool.is_object(player.building)){
                if(!tool.un(player.building.shape)){
                    mc.remove_shape(player.building.shape);
                    player.building.shape = undefined;
                }
            }
        }
    }
} , 1 * 20);

event.register_mc_event(true , "playerPlaceBlock" , undefined , (event) => {
  if (tool.is_string(player.axe_filling)) {
    event.cancel = true;
    mc.run(() => {
      run_fill_command(player , player.axe_filling.replaceAll("{{{{}}}}", event.permutationToPlace.type.id));
      player.axe_filling = undefined;
    });
  }
});


event.register_mc_event(true , "playerInteractWithBlock" , undefined , (event) => {
    if(!config.other.fast_building){return;}
    const player = event.player;
    const item = event.itemStack;
    const block = event.block;
    if (tool.to_number(player.last_in, 0) + 20 < mc.get_current_ticks()) {
        player.last_in = mc.get_current_ticks();
        if (get_op_level(player) < 1 || tool.un(item) || item.typeId !== "minecraft:wooden_axe") {return;}
        if (player.isSneaking === false) {
            if(tool.is_object(player.building)){
                player.building.blocks.push(block);
                if(player.building.blocks.length > 2){
                    player.building.blocks = player.building.blocks.slice(1,3);
                }
                mc.set_ActionBar(player, "§e[小木斧]成功选定方块");
            }
        } else if(tool.is_object(player.building)){
            mc.run(() => {
                axeBar(player);
            })

        }
    }
});

function axeBar(player) {
  if (player.building.blocks.length !== 2) {
    mc.set_ActionBar(player, "§e[小木斧]请选择两个点后继续");
    return
  }
  const ui = new btnBar();
  ui.title = "小木斧";
  ui.body = "小木斧操作面板";
  ui.btns = [{
    text: "填充选区内方块",
    icon: ui_icon.brush,
    func: () => {
      axeFillBar(player);
    }
  },
  {
    text: "生成为结构",
    icon: ui_icon.compass,
    func: () => {
      axeStrBar(player);
    }
  }
  ];

  ui.show(player);
}

function axeStrBar(player) {
  const ui = new infoBar();
  ui.title = "导出为结构";
  ui.input("id", "结构ID", "输入ID", "structure");
  ui.toggle("mode", "保存模式[临时|永久]", false);
  ui.toggle("block", "包含方块", true);
  ui.toggle("entity", "包含实体", true);
  ui.show(player, (r) => {
    mc.get_structure_manager().createFromWorld(r.id, player.dimension, player.building.blocks[0], player.building.blocks[1], {
      includeBlocks: r.block,
      includeEntities: r.entity,
      saveMode: (r.mode) ? "World" : "Memory",
    });
  });
}

function axeFillBar(player) {
  const modes = ["", "replace", "outline"];
  const add = "";
  const blocks = player.building.blocks;

  const ui = new infoBar();
  ui.title = "小木斧";
  ui.options("type", "填充模式", ["全填", "替换", "填充外围"], 0);
  ui.input("re", "替换的方块ID(仅替换时填)", "输入ID", "minecraft:");
  ui.options("id", "填充的方块", ["接下来放置的方块", "空气"], 0);
  ui.show(player, (r) => {
    if (r.type === 1){
      run_fill_command(player , `fill ${blocks[0].x} ${blocks[0].y} ${blocks[0].z} ${blocks[1].x} ${blocks[1].y} ${blocks[1].z} ` + r.re + " ");
      }
    else {
      if (r.id === 1) {
        run_fill_command(player , `fill ${blocks[0].x} ${blocks[0].y} ${blocks[0].z} ${blocks[1].x} ${blocks[1].y} ${blocks[1].z} air ` + modes[r.type] + " " + add);
      } 
      else {
         player.axe_filling = (`fill ${blocks[0].x} ${blocks[0].y} ${blocks[0].z} ${blocks[1].x} ${blocks[1].y} ${blocks[1].z} {{{{}}}} ` + modes[r.type] + " " + add);
       }
     }
  })
}

function run_fill_command(player , command){
  try{
    player.dimension.runCommand(command);
    mc.chat("§e[小木斧]填充完毕！", [player]);
  }catch(e){
    mc.chat("§e[小木斧]填充失败...", [player]);
  }
    
}

function settingBar(player,back = false){
    const ui = new infoBar();
    ui.title = "小木斧设置";
    ui.cancel = () => {
        event.emit_custom_event("setting_changed",{player : player , back : back});
    }

    ui.toggle("able", "小木斧[禁用|启用]", config.fast_biulding.able);

    

    ui.show(player,(r) => {
        config.fast_biulding.able = r.able;
        save_config();
        event.emit_custom_event("setting_changed",{player : player , back : back});
    });
}