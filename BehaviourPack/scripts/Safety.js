import * as mc from "./Basic/Mc.js";
import * as event from "./Basic/Event.js";
import * as tool from "./Basic/Tool.js";
import * as logger from "./Basic/Logger.js";
import { config , save_config , register_system , get_system , has_system} from "./Basic/Core.js";
import { is_op , get_op_level, has_owner, get_owners, save_owners } from "./Basic/Permission.js";
import { btnBar , arrayEditor , infoBar} from "./Basic/ui.js";
import { ui_icon , save_data } from "./Basic/Data.js";
import { tip } from "./Basic/UniversalUI.js";
import { tran_text } from "./Basic/Text.js";
import * as command from "./Command.js";
import { get_id } from "./Basic/Player.js";

/*
Safety.js
作用：
1.封禁实体、物品
2.封禁方块
3.锁定游戏规则
4.游戏模式锁定
5.OP修改
*/

const lockable_rules = ["commandBlocksEnabled" , "doImmediateRespawn" , "keepInventory" , "mobGriefing",
    "pvp", "showCoordinates" , "tntExplodes" , "doMobSpawning"
]

command.register_mc_command({
  description : "申请重置USF最高OP(owner)",
  permissionLevel : 1,
  name : "usf:reset",
  mandatoryParameters : [],
},(origin,args) => {
    logger.log(0 , 2 , "[安全系统]重置命令已发出，请于30秒内在控制台运行/reload命令即可重置owner");
    save_data("reset", String(Date.now()));
});

command.register_mc_command({
  description : "获取USF最高OP(owner)",
  permissionLevel : 1,
  name : "usf:get_owner",
  mandatoryParameters : [],
},(origin,args) => {
    if(origin.sourceType === "Entity" && tool.is_player(origin.sourceEntity)){
      if (!has_owner) {
          save_data("owners", tool.to_json([get_id(origin.sourceEntity)]));
          get_owners();
          logger.log( 0 , 2, "初始化成功，您已获取最高op！");
        } else {
          logger.log(0,2,"已存在owner，请在控制台使用命令，或从其他owner处获取");
        }
    }
    if(origin.sourceType === "Server"){
      const owners = get_owners();
      for (var p of world.getAllPlayers()) {
        if (!tool.array_has(owners, get_id(p))) {
          owners.push(get_id(p));
        }
      }
      save_owners();
      logger.log(0,2,"已给予全部在线玩家Owner权限！", []);
    }
});


event.register_mc_event(false,"entitySpawn",undefined,function(event){
    const entity = event.entity;
    if(!mc.is_entity_valid(entity)){return;}
    if(tool.is_player(entity)){return;}

    //清除违禁实体
    if (tool.array_has(config.ban_entity, entity.typeId)) {
        logger.log(0,1,"检测到违禁实体[0]生成，已清除",[tool.shorter_minecraft(entity.typeId)]);
        entity.remove();
    }

    //清除违禁物品
    if (entity.typeId === "minecraft:item") {
        var com = entity.getComponent("minecraft:item");
        if (!tool.un(com)) {
            if (tool.array_has(config.ban_item, com.itemStack.typeId)) {
                logger.log(0,1,"检测到违禁物品[0]生成，已清除",[tool.shorter_minecraft(com.itemStack.typeId)]);
                entity.remove();
            }
        }
    }
});

event.register_mc_event(false, "gameRuleChange" , undefined , (event) => {
  if (!config.rule.able) {
    return;
  }

  const rules = tool.to_object(tool.parse_json(config.rule.data));

  if (tool.un(rules[event.rule]) || rules[event.rule] === event.value) {
    return;
  }

  mc.change_gamerule(event.rule , rules[event.rule]);
  logger.log(0,1,"锁定的游戏规则[0]被修改，现已重置",[event.rule]);
});

event.connect_custom_event("world_load",(things) => {
    event.register_mc_event(true,"playerBreakBlock",{
        blockTypes : config.ban_block,
    },clear_ban_block);
    event.register_mc_event(true,"playerPlaceBlock",{
        blockTypes : config.ban_block,
    },clear_ban_block);

    //注册设置
    if(has_system("setting")){
          get_system("setting").register_setting("safety","安全设置",settingBar);
    }

    logger.log(0,1,"————安全系统已加载————");
});

//is_place为true则为放置方块，否则则为破坏方块
function clear_ban_block(event){
    const player = event.player;
    if(get_op_level(player) === 0){
        event.cancel = true;
        const block = event.block;
        logger.log(0,1,"检测到玩家[0][3]违禁方块[1]于[2],已退回操作",
            [player.name,tool.shorter_minecraft(block.typeId),tool.dimension_pos_to_text({
                x : block.x,
                y : block.y,
                z : block.z,
                dimension : block.dimension
            }), ((tool.un(event.face)) ? "破坏" : "放置" )]);
    }
}

function lockRulesBar(player , back = false) {
  const ui = new infoBar();
  ui.title = "游戏规则/游戏模式锁定";
  let text = "";
  if (tool.to_bool(config.rule.able)) {
    let rules = tool.to_object(tool.parse_json(config.rule.data))
    for (let k in rules) {
      text += `${get_text(k)} : ${rules[k] === true ? "开" : "关"}\n`
    }
  }
  ui.toggle("able",  "游戏规则锁定[关闭 | 开启]\n" + text, to_bool(config.rule.able));
  ui.toggle("lock",  "非OP锁定生存模式[关闭 | 开启]\n" + text, to_bool(config.game.lock));
  ui.cancel = () => {
    settingBar(player,back);
  }
  ui.show(player, (r) => {
    config.rule.able = r.able;
    config.game.lock = r.lock;
    if (r.able) {
      let data = {};
      for(let rule of lockable_rules){
        data[rule] = mc.get_gamerule(rule);
      }
    }
    save_config();
    settingBar(player,back);
  })
}

event.register_mc_event(true , "playerGameModeChange" , undefined , (event) => {
    if (!config.game.lock) {
        return;
    }
    var player = event.player;
    if (get_op_level(player) === 0) {
        if (event.toGameMode !== "Survival") {
            event.cancel = true;
            logger.log(0,1,"玩家[0]的游戏模式试图修改为[1],已重置为生存模式",[player.name,event.toGameMode]);
        }
    }
});

function settingBar(player,back = false){
    const ui = new btnBar();
    ui.cancel = () => {
        event.emit_custom_event("sitting_changed",{player : player , back : back});
    }
    ui.body = ["在此处管理USF提供的安全功能"];
    ui.btns = [{
        text : "游戏规则/游戏模式锁定",
        icon : ui_icon.lock,
        func : () => {
            lockRulesBar(player,back);
        }
    },{
        text: "封禁实体",
        icon: ui_icon.rubbish,
        func: () => {
            tip(player,tran_text(player,[
            "该功能可以在特定实体生成时将其立即删除",
            "提醒：每行输入一个实体id(要加minecraft前缀)(如minecraft:zombie)",
            "点击下方按钮前往编辑"
            ],false),
            () => {
                const editor = new arrayEditor();
                editor.back = () => {
                save_config();
    
                let unable = [];
                for (let id of config.ban_entity) {
                  if (un(mc.has_entity_type(id))) {
                    unable.push(id);
                  }
                }
    
                if (unable.length > 0) {
                  var text = "编辑已完成，但以下ID可能无效\n" + tool.array2string(unable);
                  tip(player, text, () => {
                    settingBar(player,back);
                  })
                } else {
                  settingBar(player,back);
                }
    
              }
              editor.edit(player, config.ban_entity);
            })
        }
      }, {
        text: "封禁掉落物",
        icon: ui_icon.rubbish,
        func: () => {
            tip(player,tran_text(player,[
            "该功能可以封禁掉落物",
            "提醒：每行输入一个物品id(要加minecraft前缀)(如minecraft:apple)",
            "点击下方按钮前往编辑"
            ],false),
            () => {
                const editor = new arrayEditor();
                editor.back = () => {
                save_config();
    
                let unable = [];
                for (let id of config.ban_item) {
                  if (un(mc.has_item_type(id))) {
                    unable.push(id);
                  }
                }
    
                if (unable.length > 0) {
                  var text = "编辑已完成，但以下ID可能无效\n" + tool.array2string(unable);
                  tip(player, text, () => {
                    settingBar(player,back);
                  })
                } else {
                  settingBar(player,back);
                }
    
              }
              editor.edit(player, config.ban_item);
            })
        }
      },{
        text: "封禁方块",
        icon: ui_icon.rubbish,
        func: () => {
            tip(player,tran_text(player,[
            "该功能可限制玩家放置/破坏特定方块",
            "提醒：每行输入一个方块id(要加minecraft前缀)(如minecraft:stone)",
            "点击下方按钮前往编辑"
            ],false),
            () => {
                const editor = new arrayEditor();
                editor.back = () => {
                save_config();
    
                let unable = [];
                for (let id of config.ban_block) {
                  if (un(mc.has_block_type(id))) {
                    unable.push(id);
                  }
                }
    
                if (unable.length > 0) {
                  var text = "编辑已完成，但以下ID可能无效\n" + tool.array2string(unable);
                  tip(player, text, () => {
                    settingBar(player,back);
                  })
                } else {
                  settingBar(player,back);
                }
    
              }
              editor.edit(player, config.ban_item);
            })
        }
      }]
}
