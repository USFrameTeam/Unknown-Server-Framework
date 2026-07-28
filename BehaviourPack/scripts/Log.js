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
var log_config = {
  able: false,
  connect_time: 0,
  connected : false,
};


var long_logs = {...long_log_format};
var edited_signs = {};
var opened_containers = {};

export function is_log_type_allowed(type){
    return tool.array_has(config.log.allow,type);
}

//处理长日志
mc.run_interval(() => {
    //告示牌
    const pos_set = Object.keys(edited_signs);
    for (const pos of pos_set) {
        const sign_data = edited_signs[pos];
        const block = sign_data.block;
        let valid = false;

        try {
            if (block.typeId === sign_data.id) {
                const com = block.getComponent("minecraft:sign");
                sign_data.now = [com.getText("Front"), com.getText("Back")];
                valid = true;
            }else{
                valid = false;
            }
        } catch (err) { valid = false; }

        if (!valid) {
            for (let i = 0; i < sign_data.now.length; i++) {
                if (sign_data.before[i] !== sign_data.now[i]) {
                push_log(0,"sign",
                    `Sign Change${pos}:\nFrom:${sign_data.before[i]}\nTo:${sign_data.now[i]}`,
                    "Sign"
                );
                }
            }
            delete edited_signs[pos];
        }
    }
    //容器
    pos_set = Object.keys(opened_containers);
    for (const pos of pos_set) {
    const container_data = chest[pos];
    const block = container_data.block;
    let valid = false;

    try {
        if (block.typeId === container_data.typeId) {
            valid = true;
            const items = container_data.items;
            const new_items = {};
            const com = block.getComponent("minecraft:inventory").container;

            for (let i = 0; i < com.size; i++) {
                const item = com.getItem(i);
                if (!tool.un(item)) {
                const id = tool.shorter_minecraft(item.typeId);
                new_items[id] = tool.to_number(new_items[id]) + item.amount;
                }
            }
            container_data.items = {...new_items};

            let text = `${no_minecraft(block.typeId)}${pos} Changed:`;


            tool.object_override(new_items , items);
            for (const id of Object.keys(new_items)) {
                const old_amount = tool.to_number(items[id]);
                const new_amount = tool.to_number(new_items[id]);
                if(old_amount !== new_amount){
                    text += `${id}(${old_amount}=>${new_amount});`;
                }
            }
            push_log(0,"chest" , text , "Container");
        }   
    } catch (err) {}

    if (valid && block.dimension.getEntities({
          location: block.location,
          maxDistance: 8,
          type: "player"
        }).length === 0) {
      delete opened_containers[pos];
    }
    if(!valid){delete opened_containers[pos];}
  }
} , 3 * 20);

//注册日志
//传送
event.connect_custom_event("tp",after_tp);
event.connect_custom_event("anima_tp",after_tp);
function after_tp(options){
    if (!log_config.able || !config.log.able) {return;}
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
    if (!log_config.able || !config.log.able) {return;}
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
    if (!log_config.able || !config.log.able) {return;}
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
//放置破坏方块
event.register_mc_event(false,"playerPlaceBlock" , undefined , (event) => {
    if (!log_config.able || !config.log.able) {return;}
    const player = event.player;
    const block = event.block;
    push_long_log("pb" , player.name , tool.shorter_minecraft(block.typeId) , tool.get_block_pos_text_with_di(block));

    if (block.hasTag("text_sign")) {
        const com = block.getComponent("minecraft:sign");
        edited_signs[tool.get_block_pos_text_with_di(block)] = {
            block: block,
            id: block.typeId,
            player_name: player.name,
            before: [com.getText("Front"), com.getText("Back")],
            now: [com.getText("Front"), com.getText("Back")],
        }
        push_log(0 , "sign" , "Edit Sign at :" + tool.get_block_pos_text_with_di(block) , tool.get_player_path(player));
    }
});
event.register_mc_event(false,"playerBreakBlock" , undefined , (event) => {
    if (!log_config.able || !config.log.able) {return;}
    const player = event.player;
    const block = event.block;
    const broken = event.brokenBlockPermutation;
    const id = tool.shorter_minecraft(broken.type.id);
    push_long_log("bb" , player.name , id , tool.get_block_pos_text_with_di(block));
});
//方块交互
event.register_mc_event(false,"playerInteractWithBlock" , undefined , (event) => {
    if (!log_config.able || !config.log.able) {return;}
    const player = event.player;
    const block = event.block;
    const item = event.itemStack;
    //交互方块
    let text = `Interact with Block ${block.typeId} at ${tool.get_block_pos_text_with_di(block)};`;
    if(tool.is_object(item)){
        text += "With item:" + item.typeId;
    }
    push_log(0 , "ib" , text , tool.get_player_path(player));
    //编辑告示牌
    if (block.hasTag("text_sign")) {
        const com = block.getComponent("minecraft:sign");
        edited_signs[tool.get_block_pos_text_with_di(block)] = {
            block: block,
            id: block.typeId,
            player_name: player.name,
            before: [com.getText("Front"), com.getText("Back")],
            now: [com.getText("Front"), com.getText("Back")],
        }
        push_log(0 , "sign" , "Edit Sign at :" + tool.get_block_pos_text_with_di(block) , tool.get_player_path(player));
    }
    //容器
    const com = block.getComponent("minecraft:inventory");
    if (!tool.un(com)) {
        com = com.container;
        const items = {};
        for (let i = 0; i < com.size; i++) {
            const item = com.getItem(i);
            if (!tool.un(item)) {
                items[tool.shorter_minecraft(item.typeId)] = tool.to_number(items[tool.shorter_minecraft(item.typeId)]) + item.amount;
            }
        }
        opened_containers[tool.get_block_pos_text_with_di(block)] = tool.to_object( opened_containers[tool.get_block_pos_text_with_di(block)], {
            "block": block,
            "items": items,
            "typeId": block.typeId,
        });
        push_log(0,"chest", `Open Container:${tool.shorter_minecraft(block.typeId)}${tool.get_block_pos_text_with_di(block)}`, get_player_path(player));
    }
});

//维度改变
event.register_mc_event(false , "playerDimensionChange" , undefined , (event) => {
    if (!log_config.able || !config.log.able) {return;}
    const player = event.player;
    const to = event.toDimension;
    const from = event.fromDimension;
    push_log(0 , "di" , `Dimension Change:from${from.name} to ${to.name}` , tool.get_player_path(player));
});
//物品改变
event.register_mc_event(false , "playerInventoryItemChange" , undefined , (event) => {
    if (!log_config.able || !config.log.able) {return;}
    const player = event.player;
    const old_item = event.beforeItemStack;
    const new_item = event.itemStack;
    const _text = "Player inventory changed:";
    if(tool.un(old_item) && tool.un(new_item)){return;}
    if(tool.un(old_item)){
        _text += text.format("Empty=>[0]([1])",[tool.shorter_minecraft(new_item.typeId) , new_item.amount]);
    }else if(tool.un(new_item)){
        _text += text.format("[0]([1])=>Empty",[tool.shorter_minecraft(old_item.typeId) , old_item.amount]);
    }else{
        _text += text.format("[0]([1])=>[2]([3])",[tool.shorter_minecraft(old_item.typeId) , old_item.amount , tool.shorter_minecraft(new_item.typeId) , new_item.amount]);
    }
    push_log(0,"bag",_text , tool.get_player_path(player));
});
//杀死生物、死亡
event.register_mc_event(false , "entityDie" , undefined , (event) => {
    if (!log_config.able || !config.log.able) {return;}
    const entity = event.deadEntity;
    const source = event.damageSource;
    const cause = source.cause;
    const hurt_entity = source.damagingEntity;

    
    if(tool.is_player(entity)){
        let text = `Died at ${tool.get_entity_location_text(entity)}`;

        if (!tool.un(hurt_entity)) {
            if (tool.is_player(hurt_entity)) {
                text += ` By ${hurt_entity.name}`;
            }else{
                text += ` By ${tool.shorter_minecraft(hurt_entity.typeId)}`;
            }
        }
        text += `(Cause:${cause})`;
        push_log(0 , "die" , text , tool.get_player_path(entity));
    }

    if (!tool.un(hurt_entity) && tool.is_player(hurt_entity)) {
        let text = "Kill ";
        text += tool.is_player(entity) ? entity.name : tool.shorter_minecraft(entity.typeId);
        text += ` at ${tool.get_entity_location_text(entity)}`;
        push_log(0 , "kill" , text , tool.get_player_path(hurt_entity));
    }
});
//游戏模式改变
event.register_mc_event(false , "playerGameModeChange" , undefined , (event) => {
    if (!log_config.able || !config.log.able) {return;}
    push_log(0,"gm" , `GameMode changed:${event.toGameMode}` , tool.get_player_path(event.player));
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
    if(!is_log_type_allowed(type)){
        return;
    }
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