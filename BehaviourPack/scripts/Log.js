import * as logger from "./Basic/Logger.js";
import * as tool from "./Basic/Tool.js";
import * as text from "./Basic/Text.js";
import { config } from "./Basic/Core.js";
import { system } from "@minecraft/server";


var logs = [];
var websocket;
var websocket_client;

/*
bb : {
    player_name : {
        block_id  : [ block_pos ]
    }
}
*/
const long_log_format = {
  "bb": {},
  "pb": {}
};
const long_log_prefix = {
    "bb" : "Break ",
    "pb" : "Place ",
}
var long_logs = {...long_log_format};


var log_config = {
  able: false,
  connect_time: 0,
  connected : false,
};

//推送日志
//type 0-日志 1-输出 2-日志+输出
export function push_log(type, text, path) {
  if (!log_config.able || !config.log.able) {
    return
  }
  if (!log_config.connected) {
    return
  }
  switch (type) {
    case 0:
      type = "log";
      break
    case 1:
      type = "print";
      break
    case 2:
      type = "log_print";
      break
  }
  text = tool.clear_color(text);
  const data = tool.get_date_object();
  logs.push({
    time: text.get_time_text(date),
    type: type,
    text: String(text),
    path: path
  });

}

export function push_long_log(type , player_name , block_id , pos_text){
    long_log[type][player_name] = to_object(long_log[type][player_name])
    long_log[type][player_name][block_id] = to_array(long_log[type][player_name][block_id])

    long_log[type][player_name][block_id].push(pos_text);
} 

import("@minecraft/server-net").then((server)=>{
    logger.log(0,1,"当前日志功能可用！请开启日志服务器！");
    log_config.able = true;
    websocket = server.websocket;
    system.runInterval(commit_log,20);
    system.runInterval(commit_long_log,20 * 30);
}).catch((err)=>{});

function commit_log(){
    if(!log_config.connected){
        if(Date.now() - log_config.connect_time > config.log.down * 1000){
            websocket.connect(config.log.address).then((client) => {
                if(client.isOpen){
                    log_config.connected = true;
                    websocket_client = client;
                }
            });
            log_config.time = Date.now();
            return;
        }else{
            return;
        }
    }

    //判断是否已经断联
    if(tool.un(websocket_client) || !websocket_client.isOpen){
        log_config.connected = false;
        return; 
    }

    for(var log of logs){
        websocket_client.send(tool.to_json(log));
    }
    logs = []
}

function commit_long_log(){
    if(tool.un(websocket_client) || !websocket_client.isOpen){
        log_config.connected = false;
        long_logs = {...long_log_format};
        return; 
    }

    for(var type of Object.keys(long_logs)){
        for(let player_name of long_logs[type]){
            for(var block_id of Object.keys(long_logs[type][player_name])){
                var block_pos = long_logs[type][name][block_id];
                var text = "Break " + block_id + "*" + String(block_pos.length) + " :";
                for(var pos of block_pos){
                    text += pos
                }
                push_log(0,text,tool.get_player_path({name:player_name}));
            }
        }   
    }
    long_logs = {...long_log_format};
}