import * as text from "./Basic/Text.js";
import * as mc from "./Basic/Mc.js";
import * as core from "./Basic/Core.js";
import * as tool from "./Basic/Tool.js";
import * as event from "./Basic/Event.js";
import { infoBar } from "./Basic/ui.js";
import { register_mc_command } from "./Command.js";

/*
PlayerName.js
功能：管理玩家名称（头顶上/聊天名称)
*/

text.register_symbol(false,"list",true,"玩家列表",(_player) => {
    let list = "";
    for(let player of mc.get_all_players()){
      list += "," + get_player_nametag(player);
    }
    return list.slice(1);
});
text.register_symbol(false,"unsleep",true,"未睡觉的玩家列表",(_player) => {
    let list = "";
    for(let player of mc.get_all_players()){
        if(player.isSleeping){
            list += "," + get_player_nametag(player);
        }
    }
    return list.slice(1);
});

event.register_mc_event(false,"playerSpawn",undefined,(event) =>{
    const player = event.player;
    refresh_player_nametag(player);
});
event.register_mc_event(false,"worldLoad",undefined,(event) =>{
    for(let player of mc.get_all_players()){
        refresh_player_nametag(player);
    }

    //注册设置
    if(core.has_system("setting")){
        core.get_system("setting").register_setting("name_format","玩家名称设置",settingBar);
    }
});

command.register_mc_command({
  description : "设置玩家的名称格式(可覆盖聊天设置)",
  permissionLevel : 1,
  name : "usf:name",
  mandatoryParameters : [{
    name : "Player",
    type : "PlayerSelector"
  }],
  optionalParameters : [{
    name : "format",
    type : "String"
  }],
},(origin,args) => {
    if(args.length === 1){
        const player = args[0];
        player.info.name = "";
        refresh_player_nametag(player);
    }
    if(args.length === 2){
        const player = args[0];
        const name = args[1];
        player.info.name = name;
        refresh_player_nametag(player);
    }
});

function settingBar(player , back = false){
    const ui = new infoBar();
    ui.title = "玩家名称设置";
    ui.cancel = () =>{
        event.emit_custom_event("setting_changed" , {"player" : player , "back" : back});
    }
    let _text = text.get_symbol_description() + "\n\n玩家名格式设置";
    ui.toggle("able", _text + "[禁用|启用]", core.config.name.able);
    ui.input("format", text, "输入内容", core.config.name.format);
    ui.show(player , (r) => {
        core.config.name.format = r.format;
        core.config.name.able = r.able;
        core.save_config();
        for(let player of mc.get_all_players()){
            refresh_player_nametag(player);
        }
        event.emit_custom_event("setting_changed" , {"player" : player , "back" : back});
    })
}

function get_player_nametag(player){
    if(tool.is_player(player)){
        if(core.config.name.able){
            let name = tool.to_string(player.info.name);
            if(name !== ""){
                return text.tran_text(player, config.name.format);
            }
            return text.tran_text(player, name);
        }return player.name;
    }return "";
}

function refresh_player_nametag(player) {
    if (!config.name.able) {
        return;
    }
    const nametag = tool.to_string(player.info.name);

    if (nametag !== "") {
        player.nameTag = text.tran_text(player, nametag);
        return;
    }else{
        player.nameTag = text.tran_text(player, config.name.format);
    }
}

core.register_system("player_name" , {
    get_player_nametag : get_player_nametag,
})