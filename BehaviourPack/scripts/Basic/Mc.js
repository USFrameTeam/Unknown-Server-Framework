import { ItemStack, world, system } from "@minecraft/server";
import * as logger from "./Logger.js";
import * as tool from "./Tool.js";
import * as permission from "./Permission.js";

export function is_entity_valid(entity){
    if(!tool.is_entity(entity)){
        return false;
    }
    return entity.isValid();
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