import { world , system } from "@minecraft/server";
import { format } from "./Text.js";
import * as tool from "./Tool.js";

const hint_map = ["§f[信息]§r","§c[错误]§r","§e[警告]§r"];

var log_reporters = [];
export var history_logs = [];


/*
Logger本身不播报日志，此处注册播报日志的函数
func将被传入两个参数：
message : String (日志消息)
is_global : bool (该日志是否需要全局播报)
*/
export function reporter_register(func){
  if(tool.is_function(func)){
    log_reporters.push(func);
    return true;
  }
  return false;
}

//Level 0-仅输出控制台 1-控制台+OP提示 2-全局
//Type 0-信息 1-警告 2-错误
export function log(type = 0, level = 0 ,text, replacer = []) {
  text = format(tool.to_string(text), replacer);
  const hint = tool.array_get(hint_map , type);
  const final_text = "§3[USFLog]§r" + hint + text;
  system.run(()=>{
    if (level >= 1) {
      for(let func of log_reporters){
        func(final_text , (level === 2));
        //func(文字,是否是全局广播)
      }
    }
    console.warn(tool.clear_color(final_text));
    history_logs.push(final_text);
    if(history_logs.length > 50){
      history_logs.shift();
    }
  });
  
}