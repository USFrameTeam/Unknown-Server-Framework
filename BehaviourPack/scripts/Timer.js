import * as mc from "./Basic/Mc.js";
import * as command from "./Command.js";
import * as event from "./Basic/Event.js";
import * as tool from "./Basic/Tool.js";
import { get_data, save_data } from "./Basic/Data.js";
import { get_system } from "./Basic/Core";

var global_timer = {};

command.register_mc_command_enum("TimerPosition" , ["level" , "scoreboard" , "var"]);
command.register_mc_command_enum("LevelType" , ["leave_keep" , "leave_pause" , "leave_delete"]);
command.register_mc_command({
  description : "创建计时器",
  permissionLevel : 1,
  name : "usf:timer_create",
  mandatoryParameters : [
    {
    name : "Player",
    type : "PlayerSelector"
  },{
    name : "TimerID",
    type : "String",
  },{
    name : "Position",
    enumName : "TimerPosition",
    type : "Enum"
  },,{
    name : "PostionID",
    type : "String"
  },{
    name : "LevelType",
    enumName : "LevelType",
    type : "Enum"
  },{
    name : "Time",
    type : "Integer"
  }],
},(origin,args) => {
    const entity = args[0];
    const id = args[1];
    const data = {
        position_id : args[3],
        position : args[2],
        leave_type : args[4],
        timer_type : (args[5] > 0) ? "down" : "up",
        current_time : (args[5] > 0) ? args[5] : 0,
        pause : false,
    }
    if(data.position !== "var"){
        data.index = 0;
    }
    if(!(id[0] === "G" || id[0] === "g")){
        entity.timer[id] = data;
    }
    if((id[0] === "G" || id[0] === "g") && data.position === "var"){
        global_timer[id] = data;
    }
});
command.register_mc_command_enum("TimerOperation" , ["delete" , "pause" , "continue" , "delete_all" , "delete_all_global"]);
command.register_mc_command({
  description : "操作计时器",
  permissionLevel : 1,
  name : "usf:timer_operate",
  mandatoryParameters : [
    {
    name : "Player",
    type : "PlayerSelector"
  },{
    name : "Operation",
    enumName : "TimerOperation",
    type : "Enum"
  },],
  optionalParameters:[{
    name : "TimerID",
    type : "String",
  },],
},(origin,args) => {
    const player = args[0];
    const timer_id = (args.length === 3) ? args[2] : "";
    switch(args[1]){
        case "delete":
            if(timer_id !== ""){
                if(tool.is_object(player.timer[timer_id])){
                    delete player.timer[timer_id];
                }else if(tool.is_object(global_timer[timer_id])){
                    delete global_timer[timer_id];
                }
            }
            break;
        case "pause":
            if(timer_id !== ""){
                if(tool.is_object(player.timer[timer_id])){
                    player.timer[timer_id].pause = true;
                }else if(tool.is_object(global_timer[timer_id])){
                    global_timer[timer_id].pause = true;
                }
            }
            break;
        case "continue":
            if(timer_id !== ""){
                if(tool.is_object(player.timer[timer_id])){
                    player.timer[timer_id].pause = false;
                }else if(tool.is_object(global_timer[timer_id])){
                    global_timer[timer_id].pause = false;
                }
            }
            break;
        case "delete_all":
            player.timer = {};
            break;
        case "delete_all_global":
            global_timer = {};
            break;
    }
});

event.connect_custom_event("world_load",(things) => {
    global_timer = tool.to_object(tool.parse_json(get_data("timers")));

    logger.log(0,1,"————计时器系统已加载————");
});

event.connect_custom_event("shut_down" , (_things) => {
    for(let id of Object.keys(global_timer)){
        if(global_timer[id].leave_type === "leave_delete"){
            delete global_timer[id];
        }
        if(global_timer[id].leave_type === "leave_pause"){
            global_timer[id].pause = true;
        }
    }
    save_data("timers" , tool.to_json(global_timer));
});

event.register_mc_event(true , "playerLeave" , undefined , (event) => {
    const player = event.player;
    if(tool.is_object(player.timer)){
        for(let id of Object.keys(player.timer)){
            if(player.timer[id].leave_type === "leave_delete"){
                delete player.timer[id];
            }
            if(player.timer[id].leave_type === "leave_pause"){
                player.timer[id].pause = true;
            }
        }
        save_data("timers" , tool.to_json(player.timer) , player);
    }
});

event.connect_custom_event("player_join" , (options) => {
    const player = options.player;
    player.timer = tool.to_object(tool.parse_number(get_data("timers" , player)));
});

mc.run_interval(() => {
    for(let player of mc.get_all_players()){
        const timer = tool.to_object(player.timer);
        for(let id of timer){
            deal_timer(false , id , player);
        }
    }
},2);

function deal_timer(is_global , id , player = null){
    const timer_config = (is_global) ? global_timer[id] : player.timer[id];
    if(timer_config.pause){return;}
    switch(timer_config.position){
        case "scoreboard":
            if(mc.has_score_board(timer_config.position_id)){
                timer_config.index += 1;
                if(timer_config.index === 10){
                    timer_config.index = 0;
                    timer_config.current_time += (timer_config.timer_type === "up" ? 1 : -1);
                    mc.scoreboard_set(player , timer_config.position_id , timer_config.current_time);
                    if(timer_config.timer_type === "down" && timer.current_time === 0){
                        delete player.timer[id];
                    }
                }
            }
            break;
        case "level":
            timer_config.index += 1;
            if(timer_config.index === 10){
                timer_config.index = 0;
                timer_config.current_time += (timer_config.timer_type === "up" ? 1 : -1);
                player.resetLevel();
                player.addLevels(timer_config.current_time);
                if(timer_config.timer_type === "down" && timer.current_time === 0){
                    delete player.timer[id];
                }
            }
            break;
        case "var":
            timer_config.current_time += (timer_config.timer_type === "up" ? 1 : -1);
            if(is_global){
                get_system("var").set_global_var(timer_config.position_id , 1 , timer_config.current_time);
            }else{
                get_system("var").set_personal_var(player , timer_config.position_id , 1 , timer_config.current_time);
            }
            if(timer_config.timer_type === "down" && timer.current_time === 0){
                delete player.timer[id];
            }
            break;
    }
}
