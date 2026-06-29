import * as mc from "./Basic/Mc.js";
import * as event from "./Basic/Event.js";
import * as tool from "./Basic/Tool.js";
import * as logger from "./Basic/Logger.js";
import { config , save_config } from "./Basic/Core.js";
import { is_op } from "./Basic/Permission.js";

/*
Safety.js
作用：
1.封禁实体、物品
2.封禁方块
3.锁定游戏规则
4.游戏模式锁定
*/

const lockable_rules = ["commandBlocksEnabled" , "doImmediateRespawn" , "keepInventory" , "mobGriefing",
    "pvp", "showCoordinates" , "tntExplodes" , "doMobSpawning"
]

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
});

//is_place为true则为放置方块，否则则为破坏方块
function clear_ban_block(event){
    const player = event.player;
    if(!is_op(player)){
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

function lockRulesBar(player) {
  var ui = new infoBar()
  ui.title = "游戏规则锁定"
  var text = ""
  if (tool.to_bool(config.rule.able)) {
    var rules = to_object(parse_json(config.rule.data))
    for (var k in rules) {
      text += `${get_text(k)} : ${rules[k] === true ? "开" : "关"}\n`
    }
  }
  ui.toggle("able",  "游戏规则锁定[关闭 | 开启]\n" + text, to_bool(config.rule.able));
  ui.cancel = () => {
    event.emit_custom_event("sitting_changed",{type : "safety"});
  }
  ui.show(player, (r) => {
    config.rule.able = r.able
    if (r.able) {
      let data = {};
      for(let rule of lockable_rules){
        data[rule] = mc.get_gamerule(rule);
      }
    }
    save_config();
    event.emit_custom_event("sitting_changed",{type : "safety"});
  })
}
