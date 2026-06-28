import { world, system } from "@minecraft/server";
import * as tool from "./Tool.js";
import * as logger from "./Logger.js";

const mc_after_events = [ "afterEvents",
    "entityHurt","itemUse","entityDie","playerDimensionChange","entityHitEntity",
    "playerGameModeChange","playerInteractWithBlock","playerSpawn","playerPlaceBlock",
    "playerBreakBlock","entitySpawn","worldLoad","weatherChange","gameRuleChange",
    "scriptEventReceive","blockContainerClosed","blockContainerOpened","blockExplode",
    "entityHeal","entityHealthChanged","entityItemDrop","entityItemPickup",
    "playerHotbarSelectedSlotChange","playerInventoryItemChange",
]
const mc_before_events = [ "beforeEvents",
    "entityRemove","explosion","chatSend","playerLeave","playerInteractWithBlock",
    "playerInteractWithEntity","playerPlaceBlock","itemUse","playerBreakBlock",
    "entityHurt","entityHeal","entityItemPickup","playerGameModeChange"
]


var custom_events = [];
var custom_event_signals = {}
//向event系统注册事件，非必要但推荐
export function report_custom_event(event_id){
    if(!tool.is_string(event_id) || event_id === ""){
        logger.log(2,1,"无法正常注册未知id的自定义事件！");
        return false;
    }
    if(!tool.array_has(custom_events,event_id)){
        custom_events.push(event_id);
    }
    return true;
}
//订阅自定义事件
export function connect_custom_event(event_id , func = function(things){}){
    if(tool.un(custom_event_signals[event_id])){
        custom_event_signals[event_id] = [func];
    }else{
        custom_event_signals[event_id].push(func);
    }
}
//自定义事件只能携带一个参数，请统一使用object类型来传入参数（哪怕无参数也传一个空object或undefined)
export function emit_custom_event(event_id , things){
    if(!tool.is_array(custom_event_signals[event_id])){return;}
    for(let func of custom_event_signals[event_id]){
        func(things);
    }
}


export function register_mc_event(is_before , event_id , option , func = function(event){}){
    let event_type = (is_before) ? mc_before_events[0] : mc_after_events[0];
    if((is_before && !tool.array_has(mc_before_events,event_id)) || !is_before && !tool.array_has(mc_after_events,event_id)){
        logger.log(0,2,"尝试注册的事件[0]不存在",[event_id])
        return false;
    }

    if(tool.un(option)){
        world[event_type][event_id].subscribe(func)
    }else{
        world[event_type][event_id].subscribe(func,option)
    }
    return true;
}