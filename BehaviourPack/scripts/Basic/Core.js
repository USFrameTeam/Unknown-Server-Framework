import { world, system } from "@minecraft/server";
import * as text from "./Text.js";
import * as logger from "./Logger.js";
import * as permission from "./Permission.js";
import * as tool from "./Tool.js";
import * as event from "./Event.js";
import * as mc from "./Mc.js";

export const version_code = "0.9.0E";
export const version_text = `欢迎使用无名氏服务器框架\n插件版本:${version_code}\n作者：EarthDLL(USFrameTeam)，感谢所有社区贡献者的贡献\n快速适配版本，如有Bug，及时反馈`;

export var config = {};
var systems = {};

//设定插件是否进行初始化
var reloaded = false;

var overworld;
var end;
var nether;
var dimensions;

system.run(() => {
  overworld = world.getDimension("minecraft:overworld");
  nether = world.getDimension("minecraft:nether");
  end = world.getDimension("minecraft:the_end");

  //给予三个维度名字
  overworld.name = text.get_text("overworld.name");
  end.name = text.get_text("end.name");
  nether.name = text.get_text("nether.name");
  dimensions = [overworld, nether, end];
});

event.report_custom_event("world_load");
event.connect_custom_event("player_join",function(event){
  if (permission.get_owners().length === 0) {
      mc.chat(text.get_text("tip.init"), [player], false);
  }
})

function reload_all() {
  //初始化权限内容
  if (Date.now() - parse_number(get_data("reset")) <= 30000) {
    permission.reset_owners();
    logger.log(0,2,"最高管理员已被重置!");
  }
  permission.get_owners();
  permission.load_ops();
  
  //配置内容
  config = parse_json(get_data("config"));
  tool.object_override(config, usf_config);

  event.emit_custom_event("world_load",{})
}

export function save_config() {
  save_data("config", to_json(config));
}

//播报日志
logger.reporter_register((message , is_global) => {
  var report_goals = mc.get_all_players();
  if(!is_global){
    report_goals = report_goals.filter((p) => { return permission.get_op_level(p) >= 1;});
  }
  mc.chat(message , report_goals , false)
});

//注册系统相关
/*
将各个功能的暴露函数封装到funcs里面
*/
export function register_system(system_id = "system", funcs = {}){
    systems[system_id] = funcs;
}

export function has_system(system_id = ""){
    return (!tool.un(systems[system_id]));
}

export function get_system(system_id = ""){
    return systems[system_id];
}