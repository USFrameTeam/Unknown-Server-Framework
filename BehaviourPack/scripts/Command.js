import { clear_bars } from "./Basic/ui.js";
import * as tool from "./Basic/Tool.js";
import * as core from "./Basic/Core.js";
import * as logger from "./Basic/Logger.js";

//command_signals : { 命令id : 注册函数}
var command_signals = {}

export function register_command(command , func = function(args){}){
    if(command_signals[command] === undefined || !tool.is_string(command)){
        logger.log(2,0,"命令已注册或id不合法，无法注册");
        return false;
    }
    command_signals[command] = func;
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

    const command_name = args[0]

    if(command_signals[command_name] === undefined){
        logger.log(2,0,"自定义命令[0]不存在，无法执行",[command]);
        return false;
    }
    if (!tool.array_has(core.config.commands, command_name) && command_name !== "usf") {
        return false;
    }

    command_signals[command_name](player , args);
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