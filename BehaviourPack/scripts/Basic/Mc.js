import { ItemStack, world, system ,EntityTypes , ItemTypes , BlockTypes} from "@minecraft/server";
import { debugDrawer , DebugBox , DebugCylinder }from "@minecraft/debug-utilities";
import * as logger from "./Logger.js";
import * as tool from "./Tool.js";
import * as text from "./Text.js";
import * as permission from "./Permission.js";
import { report_custom_event , emit_custom_event , register_mc_event } from "./Event.js";
import { forEach } from "core-js/core/array";
import { get_player_name } from "./Player.js";

//注册一些转义
text.register_symbol(false,"weather",true,"当前天气",(player)=>{
    return text.tran_text("Weather." + world.getDimension("minecraft:overworld").getWeather());
});
text.register_symbol(false,"id",false,"玩家id",(player)=>{
    return tool.to_string(tool.to_object(player).name);
});
text.register_symbol(false,"name",false,"玩家自定义格式的名称",(player)=>{
    return tool.is_player(player) ? get_player_name(player) : "";
});
text.register_symbol(false,"all_time",true,"游戏已运行的时间/s",(player)=>{
    return `${Math.round(system.currentTick / 20)}s`;
});
text.register_symbol(false,"worldspawn",true,"世界出生点",(player)=>{
    return tool.pos_string(world.getDefaultSpawnLocation());
});
text.register_symbol(false,"date",true,"日期",(player)=>{
    const d = tool.get_date_object();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const date = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}.${month}.${date}`;
});
text.register_symbol(false,"time",true,"时间",(player)=>{
    const d = tool.get_date_object();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
});


export function is_entity_valid(entity){
    if(!tool.is_entity(entity)){
        return false;
    }
    return entity.isValid;
}

export function get_all_players(){
    return world.getAllPlayers().filter((p) => { return tool.un(p.headRotation);});
}

export function get_block(di, lo) {
  var block = undefined
  try {
    block = di.getBlock(lo)
  } catch (err) { }
  return block
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
  if (!tool.is_entity(entity)){ return;}
  try {
    entity.runCommand(command);
  } catch (err) { logger.log(0,1,"尝试在实体上执行指令失败:[0]",[command]) }
}

export function has_entity_type(id){
  return !tool.un(EntityTypes.get(id));
}
export function has_item_type(id){
  return !tool.un(ItemTypes.get(id));
}
export function has_block_type(id){
  return !tool.un(BlockTypes.get(id));
}

export function get_structure_manager(){
  return world.structureManager;
}

export function has_score_board(scoreboard_id){
  return !tool.un(world.scoreboard.getObjective(scoreboard_id));
}

export function get_score_board_object(scoreboard_id){
  return world.scoreboard.getObjective(scoreboard_id);
}

export function remove_score_board(scoreboard_id){
  return world.scoreboard.removeObjective(scoreboard_id);
}

export function get_score_board_objects(){
  return world.scoreboard.getObjectives();
}

export function get_score_board_class(){
  return world.scoreboard;
}

export function get_player_hand_item(player) {
  return player.slots.getItem(player.selectedSlotIndex);
}

export function scoreboard_set(entity , scoreboard_id, score) {
  if(!has_score_board(scoreboard_id)){return false;}
  try{
    world.scoreboard.getObjective(scoreboard_id).setScore(entity, score);
    return true;
  }catch(e){}
  return false;
}

export function scoreboard_add(entity , scoreboard_id, score) {
  if(!has_score_board(scoreboard_id)){return false;}
  try{
    world.scoreboard.getObjective(scoreboard_id).setScore(entity, Math.floor(scoreboard_get(entity , scoreboard_id) + score));
    return true;
  }catch(e){}
  return false;
}

export function scoreboard_remove(entity , scoreboard_id) {
  if(!has_score_board(scoreboard_id)){return false;}
  try{
    world.scoreboard.getObjective(scoreboard_id).removeParticipant(entity);
    return true;
  }catch(e){}
  return false;
}
export function scoreboard_set_display(postion = "List" , scoreboard_id = "") {
  if(!has_score_board(scoreboard_id)){return false;}
  try{
    world.scoreboard.setObjectiveAtDisplaySlot(postion, {
      objective: world.scoreboard.getObjective(scoreboard_id),
    });
    return true;
  }catch(e){}
  return false;
}

export function scoreboard_entitys(scoreboard_id) {
  if(!has_score_board(scoreboard_id)){return [];}
  try{
    return world.scoreboard.getObjective(scoreboard_id).getParticipants();
  }catch(e){}
  return [];
}

export function scoreboard_get(entity , scoreboard_id) {
  if(!has_score_board(scoreboard_id)){return false;}
  let score = 0;
  try {
    score = world.scoreboard.getObjective(scoreboard_id).getScore(player);
  } catch (err) { }
  return tool.to_number(score);
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
    const players = tool.is_array(targets) ? targets : get_all_players();
    for (const p of players) {
        let final_message = (tran) ? text.tran_text(p,message) : message;
        if (tool.is_player(p)) {
            p.sendMessage(final_message);
        }
    }
}

export function set_ActionBar(player, message , tran = false) {
  const content = tran ? text.tran_text(player, message) : message;
  try {
    player.onScreenDisplay.setActionBar(content);
  } catch (err) {
  system.run(()=>{
    player.runCommand(`titleraw @s actionbar {"rawtext": [{"text":"${content}"}]}`);
    });
  }
}

export function set_title(player, message) {
  if (!tool.is_player(player)) return;

  try {
    player.onScreenDisplay.setTitle(text.tran_text(player, message));
  } catch (err) { }
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

export function run_interval(func , time){
    return system.runInterval(func,time);
}

export function run(func){
    system.run(func);
}

export function clear_job(id){
  system.clearRun(id);
}


export function get_game_mode(player) {
  const modes = {
    "Survival" : 0,
    "Creative": 1,
    "Adventure": 2,
    "Spectator": 3
  };

  return modes[player.getGameMode()];
}

export function set_game_mode(player, mode) {
  const modes = ["Survival", "Creative", "Adventure", "Spectator"];
  const to_mode = modes[mode];

  if (tool.is_string(to_mode)) {
    player.setGameMode(to_mode);
  }
}

export function get_current_ticks(){
  return system.currentTick;
}

export function create_box_shape( di , from , to , goals = [] , color = {
  red : 0,
  green : 0.9333,
  blue : 1.0,
  alpha : 0.19,
}){
    let center = {
      dimension : di,
      x : (from.x + to.x) / 2,
      y : (from.y + to.y) / 2,
      z : (from.z + to.z) / 2,
    }
    let shape = new DebugBox(center);
    shape.bound = {
      x : Math.abs(from.x - to.x) + 1,
      y : Math.abs(from.y - to.y) + 1,
      z : Math.abs(from.z - to.z) + 1,
    }
    shape.color = color;
    shape.visibleTo = goals;
    debugDrawer.addShape(shape , di);
    return shape;
}

export function create_cylinder_shape( di , center , raduis , high ,  goals = [] , color = {
  red : 0,
  green : 0.9333,
  blue : 1.0,
  alpha : 0.19
}){
    let shape = new DebugCylinder(center);
    shape.height = high;
    shape.radii = { x : raduis , y : raduis};
    shape.numSegments = 64;
    shape.color = color;
    shape.visibleTo = goals;
    debugDrawer.addShape(shape , di);
    return shape;
}

export function remove_shape(shape){
    debugDrawer.removeShape(shape);
}

/*
options:
    show : bool 是否展示"正在传送"
    keep : bool 是否保持速度
    back : bool 是否记为返回点
    log : bool 是否可记入日志(依赖外部实现)
    默认都为false
*/
export function tp_entity(entity, di, x, y, z, options = {}) {
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
  system.run(() => {
    const location = { x, y, z };
    const tp_options = {
      dimension: di,
      keepVelocity: keep
    };
    entity.teleport(location, tp_options);
  });

  options.entity = entity;
  options.x = x;
  options.y = y;
  options.z = z;
  options.di = di;
  emit_custom_event("tp" , options);
}

report_custom_event("tp");
report_custom_event("anima_tp");

export {
  ItemStack,
}