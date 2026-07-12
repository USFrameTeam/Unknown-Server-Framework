import { clear_bars, infoBar } from "./Basic/ui.js";
import { system } from "@minecraft/server";
import * as tool from "./Basic/Tool.js";
import * as core from "./Basic/Core.js";
import {entity_run_command} from "./Basic/Mc.js";
import * as logger from "./Basic/Logger.js";
import * as event from "./Basic/Event.js";
import { format , tran_text} from "./Basic/Text.js";

/*
Command.js
功能：注册、运行自定义命令
*/

event.connect_custom_event("world_load",(things) => {
    //注册设置
    if(core.has_system("setting")){
          core.get_system("setting").register_setting("command","命令设置",settingBar);
    }

    logger.log(0,1,"————命令系统已加载————");
});

//command_signals : { 命令id : { func : function(player,args) 注册函数 , description : string 命令描述} }
var command_signals = {}
var mc_command = [];
var mc_command_enum = [];

export function register_mc_command(command_data , func ){
  mc_command.push({
    data : command_data,
    func : func
  });
}
export function register_mc_command_enum(id , enums){
  mc_command_enum.push({
    id : id,
    enums : enums,
  });
}

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;
    for(let data of mc_command_enum){
        registry.registerEnum(data.id , data.enums);
    }
    for(let data of mc_command){
        registry.registerCommand(data.data , data.func);
    }
})

export function register_command(command , description = "" , func = function(player , args){}){
    if(command_signals[command] === undefined || !tool.is_string(command)){
        logger.log(2,0,"命令已注册或id不合法，无法注册");
        return false;
    }
    command_signals[command] = {
      "func" : func,
      "description" : description,
    };
    return true;
}

//command内不应有+
//执行命令的函数会被传入： player - 命令执行玩家 ; args - 命令参数
export function run_command(player , command){
    clear_bars(player);
    const args = parse_command_args(command + " ");

    if (commands.length < 1) {
        return false;
    }

    const command_id = args[0]

    if(command_signals[command_id] === undefined){
        logger.log(2,0,"自定义命令[0]不存在，无法执行",[command]);
        return false;
    }
    if (!tool.array_has(core.config.commands, command_id) && command_id !== "usf") {
        return false;
    }

    command_signals[command_id].func(player , args);
}


function parse_command_args(command) {
    const commands = [];
    let is_in_quotes = false;
    let last_index = 0;
    const length = command.length;

    for (let i = 0; i < length; i++) {
      const char = command.charAt(i);

      if (char === '"') {
        is_in_quotes = !is_in_quotes;
      }

      if (char === ' ' && !is_in_quotes) {
        const part = command.slice(last_index, i).replace(/"/g, "");
        if (part) {
          commands.push(part);
        }
        last_index = i + 1;
      }
    }

    return commands;
}

function settingBar(player , back = false){
    const ui = new infoBar();
    ui.cancel = () => {
      event.emit_custom_event("setting_changed",{player : player , back : back});
    }
    for (let command_id of Object.keys(command_signals)) {
        ui.toggle(key, format("+[0]\n描述:[1]",[command_id , command_signals[command_id].description]), tool.array_has(config.commands, command_id));
    }
    ui.show(player,(r)=>{
      const valid_commands = [];
      for (let command_id of Object.keys(r)) {
        if(r[command_id]){
          valid_commands.push(command_id);
        }
      }
      core.config.commands = valid_commands;
      core.save_config();
      event.emit_custom_event("setting_changed",{player : player , back : back});
    })
}

core.register_system("command", {
  "egister_command" : register_command,
  "run_command" : run_command,
})

command.register_mc_command({
  description : "运行含转义的命令",
  permissionLevel : 1,
  name : "usf:tran_command",
  mandatoryParameters : [{
    name : "Entity",
    type : "EntitySelector",
  },{
    name : "Command",
    type : "String"
  }],
},(origin,args) => {
  let command = args[1];
  if(command[0] === "/"){
    command = command.slice(1);
  }
  let entity = args[0];
  if(tool.is_player(entity)){
    entity_run_command(entity , tran_text(entity , command , false));
  }else{
    entity_run_command(entity , command);
  }
});