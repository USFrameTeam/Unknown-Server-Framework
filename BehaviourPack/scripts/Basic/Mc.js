import { ItemStack, world, system } from "@minecraft/server";
import * as logger from "./Logger.js";
import * as tool from "./Tool.js";
import * as text from "./Text.js";
import * as permission from "./Permission.js";
import { report_custom_event , emit_custom_event } from "./Event.js";

export function is_entity_valid(entity){
    if(!tool.is_entity(entity)){
        return false;
    }
    return entity.isValid;
}

export function get_all_players(){
    return world.getAllPlayers()
}

export function each_player(func = function(player){}){
    for(let player of get_all_players()){
        func(player);
    }
}

export function get_di(id) {
  return world.getDimension(id);
}

export function entity_run_command(entity, command) {
  if (!entity) return;
  try {
    entity.runCommand(command);
  } catch (err) { logger.log(0,1,"尝试在实体上执行指令失败:[0]",[command]) }
}

//force = true时会无视权限踢出
export function kick(player, reason = "", force = false) {
    if(!is_entity_valid(player)){return false;}
    if(!tool.is_player(player)){
        logger.log(1,2,"目标错误，无法踢出玩家！");
        return false;
    }
    if (!force && permission.get_op_level(player) > 0) return false;

    overworld.runCommand(`kick "${player.name}" ${reason}`);
    return true;
}

export function chat(message, targets = null, tran = true) {
    const players = is_array(targets) ? targets : get_all_players();
    for (const p of players) {
        let final_message = (tran) ? text.tran_text(p,message) : message;
        if (tool.is_player(p)) {
            p.sendMessage(final_message);
        }
    }
}

export function change_gamerule(rule , value){
    world.gameRules[rule] = value;
}

export function get_gamerule(rule){
    if(tool.un(world.gameRules[rule])){
        logger.log(2,1,"无法获取游戏规则[0]",[rule]);
        return false;
    }
    return world.gameRules[rule];
}

export function run_timeout(func , time){
    system.runTimeout(func,time);
}

/*
options:
    show : bool 是否展示"正在传送"
    anima : bool 是否使用动画传送(依赖外部实现)
    keep : bool 是否保持速度
    back : bool 是否记为返回点(依赖外部实现)
    log : bool 是否可记入日志(依赖外部实现)
    默认都为false
*/
export function tp_entity(entity, di, x, y, z, options) {
  if (!tool.is_entity(entity)){ return;}

  if(tool.is_player(entity)){
    if (tool.to_bool(options.show,false)) {
      show_title(entity, "正在传送...");
    }

    if (tool.to_bool(options.anima,false)) {
      emit_custom_event("anima_tp",{
        x : x,
        y : y,
        z : z,
        di : di,
        entity : entity
      });//待连接外部
      return;
    }

    if (tool.to_bool(options.back,false)) {
        entity.back_pos = [
            entity.dimension,
            entity.location.x,
            entity.location.y,
            entity.location.z
        ];
    }
  }

/*   const shouldLog = is_player(entity) && array_has(config.log.allow, "tp");
  const playerPath = shouldLog ? get_player_path(entity) : null;
 */
  system.run(() => {
    const location = { x, y, z };
    const tp_options = {
      dimension: di,
      keepVelocity: keep
    };
    entity.teleport(location, tp_options);
  });

/*   if (shouldLog) {
    const blockPos = get_block_pos_di({
      dimension: di,
      location: { x, y, z }
    });
    server_log(0, `TP:${blockPos}`, playerPath);
  } */

  options.is_player = tool.is_player(entity);
  options.entity = entity;
  options.x = x;
  options.y = y;
  options.z = z;
  options.di = di;
  emit_custom_event("tp" , options);
}

report_custom_event("tp");
report_custom_event("anima_tp");