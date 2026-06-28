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