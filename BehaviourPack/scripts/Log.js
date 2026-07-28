import * as logger from "./Basic/Logger.js";
import * as tool from "./Basic/Tool.js";
import * as text from "./Basic/Text.js";
import { config , register_system } from "./Basic/Core.js";
import { system } from "@minecraft/server";
import { data_format } from "./Basic/Data.js";
import * as event from "./Basic/Event.js";
import * as mc from "./Basic/Mc.js";
import { get_id } from "./Basic/Player.js";


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

export function is_log_type_allowed(type){
    return tool.array_has(config.log.allow,type);
}

//注册日志
//传送
event.connect_custom_event("tp",after_tp);
event.connect_custom_event("anima_tp",after_tp);
function after_tp(options){
    if(!tool.is_player(options.entity)){return;}
    if(tool.to_bool(options.log,false)){
        const pos_text = tool.dimension_pos_to_text({
            dimension: options.di,
            location: { x:options.x , y:options.y, z:options.z }
        });
        push_log(0, "tp" ,`TP:${pos_text}`,tool.get_player_path(options.entity));
    }
}

//加入游戏
event.connect_custom_event("player_load" , (options) => {
    push_log(2 , "jl" , text.format("Join Game at [0]" , [tool.dimension_pos_to_text(options.player.location)]) , tool.get_player_path(options.player));
    const player = event.player;
    push_log(0 , "info" , {
        name: player.name,
        last_join_game_time: Date.now(),
        spawn_point: tool.dimension_pos_to_text(player.getSpawnPoint()),
        tags: player.getTags(),
        usfID: get_id(player),
        platform : text.tran_text(player , "/platform"),
        inputmode : text.tran_text(player , "/inputmode"),
    } , name , true);

});
//退出游戏
event.register_mc_event(true , "playerLeave" , undefined , (event) => {
    const player = event.player;
    const name = player.name;
    const path = tool.get_player_path(player);
    const loc = player.location;
    const spawn_pos = player.getSpawnPoint();
    mc.run(() => {
        push_log(2 , "jl" , text.format("Leave Game at [0]" , [tool.dimension_pos_to_text(loc)]) , path);
        push_log(0 , "info" , {
        name: name,
        last_leave_game_time: Date.now(),
        spawn_point: tool.dimension_pos_to_text(spawn_pos),
        tags: tags,
        current_position: tool.dimension_pos_to_text(pos),
      } , name , true);
    });
});


//推送日志
//type 0-日志 1-输出 2-日志+输出
export function push_log(type, text_type , _text, path = "" , use_json = false) {
  if (!log_config.able || !config.log.able) {
    return;
  }
  if(!is_log_type_allowed(text_type)){
    return;
  }
  if (!log_config.connected) {
    return;
  }
  switch (type) {
    case 0:
      type = "log";
      break;
    case 1:
      type = "print";
      break;
    case 2:
      type = "log_print";
      break;
  }
  _text = tool.clear_color(_text);
  const data = tool.get_date_object();
  logs.push({
    time: text.get_time_text(date),
    type: type,
    text: (use_json) ? tool.to_json(_text) : String(_text),
    path: path,
    use_json : use_json,
  });

}

export function push_long_log(type , player_name , block_id , pos_text){
    long_log[type][player_name] = to_object(long_log[type][player_name])
    long_log[type][player_name][block_id] = to_array(long_log[type][player_name][block_id])

    long_log[type][player_name][block_id].push(pos_text);
} 

import("@minecraft/server-net").then((server)=>{
    logger.log(0,1,"[日志系统]当前日志功能可用！请开启日志服务器！");
    log_config.able = true;
    websocket = server.websocket;
    system.runInterval(commit_log,20);
    system.runInterval(commit_long_log,20 * 30);
}).catch((err)=>{logger.log(0,1,"[日志系统]当前日志系统不可用，已关闭！");});

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

register_system("log" , {
    push_log : push_log,
    is_log_type_allowed : is_log_type_allowed,
})