import * as event from "./Basic/Event.js";
import * as tool from "./Basic/Tool.js";
import * as mc from "./Basic/Mc.js";
import * as command from "./Command.js";
import { btnBar , arrayEditor , infoBar} from "./Basic/ui.js";
import { ui_icon } from "./Basic/Data.js";
import { get_text } from "./Basic/Text.js";
import { save_config , config , has_system , get_system} from "./Basic/Core.js";
import { get_player_name } from "./Basic/Player.js";
import * as logger from "./Basic/Logger.js";


/*
GameHelper.js
功能：游戏辅助功能
同时注册了部分命令
*/

event.connect_custom_event("world_load",(things) => {
    //注册设置
    if(has_system("setting")){
          get_system("setting").register_setting("helper","游戏辅助设置",settingBar);
    }

    logger.log(0,1,"————游戏辅助系统已加载————");
});

event.register_mc_event(true,"explosion",undefined,beforeExplosion);
event.register_mc_event(true,"itemUse",undefined,beforeItemUse);
event.register_mc_event(true,"entityRemove",undefined,beforeEntityRemove);
event.register_mc_event(true,"playerInteractWithBlock",undefined,sign_test);
event.register_mc_event(false,"playerSpawn",undefined,playerSpawn);
event.register_mc_event(false,"playerDimensionChange",undefined,playerDiChanged);

//注册命令
command.register_command("unsleep" , "在聊天栏输出未睡眠的玩家列表" , (player , args) => {
  let text = [];
  for(let p of mc.get_all_players()){
    if(!p.isSleeping){text.push(get_player_name(p));}
  }
  text = "[辅助系统]未睡眠的玩家：" + tool.array2line(text);
  mc.chat(text , [player]);
});
command.register_command("die" , "玩家自杀" , (player , args) => {
  player.kill();
});

function beforeExplosion(event) {
  const entity = event.source;
  let blocks = event.getImpactedBlocks();

  if (!tool.un(entity) && config.game.creeper && entity.typeId === "minecraft:creeper") {
    event.setImpactedBlocks([]);
    return;
  }
}

function beforeItemUse(event) {
  const item = event.itemStack
  const player = event.source

  if (item.typeId === "minecraft:fire_charge") {
    if (config.game.fb) {
      system.run(() => {
        if (player.getGameMode() !== "Creative") {
          const slot = player.slots.getSlot(player.selectedSlotIndex);
          if (slot.amount === 1) {
            slot.setItem();
          } else {
            slot.amount = slot.amount - 1;
          }
        }

        const lo = player.getHeadLocation();
        lo.x += player.getViewDirection().x;
        lo.z += player.getViewDirection().z;
        var ball = player.dimension.spawnEntity("minecraft:small_fireball", lo);
        ball.is_throw = player;
        ball.getComponent("minecraft:projectile").shoot(player.getViewDirection(), {
          uncertainty: false
        })
      })
    }
  }
}

function beforeEntityRemove(event) {
  const entity = event.removedEntity
  if (entity.typeId === "minecraft:small_fireball") {
    if (tool.is_object(entity.is_throw)) {
      var di = entity.dimension;
      var loc = entity.location;
      var source = entity.is_throw;
      system.run(() => {
        di.createExplosion(loc, 1, {
          breaksBlocks: true,
          causesFire: true,
          source: source
        })
      })
    }
  }
}

function sign_test(event){
    const player = event.player;
    const block = event.block;
    if (block.hasTag("text_sign") && config.game.sign) {
      if (Date.now() - to_number(player.last_edit_sign) < 800) {

      } else {
        player.last_edit_sign = Date.now();
        mc.set_ActionBar(player, get_text("sign.tip"));
        event.cancel = true;
      }
    }
}

function playerSpawn(event){
    const player = event.player;
    if (event.initialSpawn === true) {
        if (config.game.r_in > 0) {
            player.addEffect("resistance", config.game.r_in * 20, {
                amplifier: 4,
                showParticles: false
            });
        }
    }
    else{
        if (config.game.r_rs > 0) {
            player.addEffect("resistance", config.game.r_rs * 20, {
                amplifier: 4,
                showParticles: false
            });
        }
    }
}

function playerDiChanged(event){
    const player = event.player;
    if (config.game.r_di > 0) {
        player.addEffect("resistance", config.game.r_di * 20, {
        amplifier: 4,
        showParticles: false
        });
    }
}

function settingBar(player,back = false){
    const ui = new infoBar();
    ui.title = "游戏辅助设置";
    ui.cancel = () => {
        event.emit_custom_event("setting_changed",{player : player , back : back});
    }
    ui.toggle("kill", "主菜单显示自杀按钮", config.game.kill);//TODO
    ui.toggle("creeper", "苦力怕爆炸不破坏地形", config.game.creeper);
    ui.toggle("sign", "编辑告示牌需要双击", config.game.sign);
    ui.toggle("fb", "可发射火焰弹", config.game.fb);
    ui.range("r_in", "进入游戏给予抗性提升5的时间", 0, 30, 1, config.game.r_in);
    ui.range("r_di", "维度改变给予抗性提升5的时间", 0, 30, 1, config.game.r_di);
    ui.range("r_rs", "重生给予抗性提升5的时间", 0, 30, 1, config.game.r_rs);
    ui.show(player,(r) => {
        config.game.kill = r.kill
        config.game.creeper = r.creeper
        config.game.sign = r.sign
        config.game.r_in = r.r_in
        config.game.r_di = r.r_di
        config.game.fb = r.fb
        config.game.r_rs = r.r_rs
        save_config();
        event.emit_custom_event("setting_changed",{player : player , back : back});
    });
}