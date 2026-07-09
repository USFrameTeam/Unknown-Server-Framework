import * as event from "./Basic/Event.js";
import { register_system , has_system , get_system, config } from "./Basic/Core.js";
import { data_format, get_data , save_data, ui_icon } from "./Basic/Data.js";
import * as tool from "./Basic/Tool.js";
import * as mc from "./Basic/Mc.js";
import { infoBar , btnBar } from "./Basic/ui.js";
import { format } from "./Basic/Text.js";

//TODO命令
const var_config_format = {
    global : {
        lock_type : [],
        default : {},
    },
    personal : {
        lock_type : [],
        default : {},
        bind : {},//绑定
    }
}

var global_vars = {};

load_vars();
load_config();

var save_job_id = mc.run_interval(save_all_vars,config.var.save * 20);
var var_config = {};

event.connect_custom_event("shut_down",save_all_vars);

//刷新计分板
mc.run_interval(() => {
    for(let id of var_config.personal.bind){
        const board = var_config.personal.bind[id];
        if(mc.has_score_board(board)){
            for(let player of mc.get_all_players()){
                mc.scoreboard_set(player , board , tool.to_number(player.vars[id], 0));
            }
        }
    }
} , 10);

event.connect_custom_event("world_load",(things) => {
    //注册设置
    if(has_system("setting")){
      get_system("setting").register_setting("var","自定义变量设置",settingBar);
    }

    for(let player of mc.get_all_players()){
        load_vars(player);
    }
    refresh_global_default_vars();

    logger.log(0,1,"————自定义变量系统已加载————");
});
event.connect_custom_event("player_load" , (options) => {
    const player = options.player;
    if(tool.un(player.lands)){
        load_vars(player);
    }
});

function load_vars(player = null){
    let need_continue = false;
    let index = 0;
    let goal_object = global_vars;
    if(tool.is_player(player)){
        player.vars = {};
        goal_object = player.vars;
    }
    while(need_continue){
        need_continue = false;
        const object = tool.to_object(tool.parse_json(get_data("vars." + String(index) , player)), {});
        index += 1;
        if(Object.keys(object).length > 0){
            tool.object_override(goal_object , object);
            need_continue = true;
        }
    }

    if(tool.is_player(player)){
        refresh_default_vars(player);
    }
}

function save_vars(player = null) {
    const indexs = Math.ceil(keys.length / 200);
    let goal_object = global_vars;
    if(tool.is_player(player)){
        goal_object = player.vars;
    }
    const keys = Object.keys(goal_object);
    for(let index = 0 ; index < indexs ; index ++){
        let data = {};
        for(let i = index * 200; i < Math.min(index * 200 + 200 , keys.length) ; i ++){
            data[keys[i]] = goal_object[keys[i]];
        }
        save_data("vars." + String(index) , tool.to_json(data) , player);
    }
}

function save_all_vars(){
    save_vars();
    for(let player of mc.get_all_players()){
        save_vars(player);
    }
}

function load_config(){
    var_config = tool.to_object(tool.parse_json(get_data("var_config")));
    tool.object_override(var_config , var_config_format);
}

function save_var_config(){
    save_data("var_config" , tool.to_json(var_config));
}

//Type 0-字符串 1-数字
function set_global_var(var_id , type = 0, value){
    if(tool.array_has(var_config.global.lock_type , var_id)){
        if((tool.is_string(global_vars[var_id])  && type === 1 ) || (tool.is_number(global_vars[var_id])  && type === 0 )){
            return false;
        }
    }
    switch(type){
        case 0:
            if(tool.is_string(value)){
                global_vars[var_id] = value;
                return true;
            }
        case 1:
            if(tool.is_number(value)){
                if(value.length > 128){value = value.slice(0,127);}
                global_vars[var_id] = value;
                return true;
            }else if(tool.is_string(value)){
                let number = tool.parse_number(value,undefined);
                if(tool.is_number(number)){
                    global_vars[var_id] = value;
                }
            }
    }
    return false;
}

function set_personal_var(player , var_id = "", type = 0, value){
    if(tool.array_has(var_config.personal.lock_type , var_id)){
        if((tool.is_string(player.vars[var_id])  && type === 1 ) || (tool.is_number(player.vars[var_id])  && type === 0 )){
            return false;
        }
    }
    switch(type){
        case 0:
            if(tool.is_string(value)){
                player.vars[var_id] = value;
                return true;
            }
        case 1:
            if(tool.is_number(value)){
                player.vars[var_id] = value;
                return true;
            }else if(tool.is_string(value)){
                let number = tool.parse_number(value,undefined);
                if(tool.is_number(number)){
                    player.vars[var_id] = value;
                }
            }
    }
    return false;
}

function set_var(var_id , type = 0, value = "" , player = null){
    if(player === null){
        set_global_var(var_id , type , value);
    }else{
        set_personal_var(player , var_id , type , value);
    }
}

function get_var_type(var_id , player = null){
    if(player === null){
        return tool.un(global_vars[var_id]) ? 0 : (tool.is_string(global_vars[var_id]) ? 1 : 2);
    }else{
        return tool.un(player.vars[var_id]) ? 0 : (tool.is_string(player.vars[var_id]) ? 1 : 2);
    }
}

function reset_var(var_id , player = null){
    if(player === null){
        if(!tool.un(global_vars[var_id])){
            delete global_vars[var_id];
            if(!tool.un(var_config.global.default[var_id])){
                global_vars[var_id] = var_config.global.default[var_id];
            }
        }
    }else{
        if(!tool.un(player.vars[var_id])){
            delete player.vars[var_id];
            if(!tool.un(var_config.personal.default[var_id])){
                player.vars[var_id] = var_config.personal.default[var_id];
            }
        }
    }
}

function get_var(var_id , type_force = false , player = null){
    let value = undefined;
    if(player !== null){
        value = global_vars[var_id];
    }else{
        value = player.vars[var_id];
    }
    if(!type_force && tool.un(value)){
        return "";
    }
    return value;
}

function refresh_default_vars(player){
    for(let id of Object.keys(var_config.personal.default)){
        if(tool.un(player.vars[id])){
            player.vars[id] = var_config.personal.default[id];
        }
    }
}
function refresh_global_default_vars(){
    for(let id of Object.keys(var_config.global.default)){
        if(tool.un(global_vars[id])){
            global_vars[id] = var_config.global_vars.default[id];
        }
    }
}

function settingBar(player , back = false){
    const ui = new btnBar();
    ui.title = "自定义变量设置";
    ui.body = "此处管理自定义变量及基本配置";
    let text = format("全局变量:\n锁定类型:[0]\n含默认值:[1]\n\n玩家变量:\n锁定类型[2]\n含默认值:[3]\n绑定到计分板:[4]",
        [
            tool.array2line(var_config.global.lock_type),
            tool.array2line(Object.keys(var_config.global.default)),
            tool.array2line(var_config.personal.lock_type),
            tool.array2line(Object.keys(var_config.personal.default)),
            tool.array2line(Object.keys(var_config.bind.default)),
        ]
    )
    ui.cancel = () => {
        event.emit_custom_event("setting_changed",{player : player , back : back});
    }
    ui.btns = [{
        text : "基本配置",
        icon : ui_icon.setting,
        func : () => {
            setConfigBar(player , back);
        }
    },{
        text : "变量设置",
        icon : ui_icon.add,
        func : () =>{
            editVarConfigBar(player , back);
        }
    }];

}

function editVarConfigBar(player , back){
    const ui1 = new infoBar();
    ui1.title = "编辑变量";
    ui1.cancel = () => {
        settingBar(player , back);
    }
    ui1.options("type" , "变量类型" , ["全局变量" , "玩家变量"] , 0);
    ui1.input("id" , "变量ID" , "输入要编辑的变量id" , "");
    ui1.show(player , (r) => {
        const type = r.type === 0 ? "global" : "personal";
        const id = r.id;
        const ui2 = new infoBar();
        ui2.title = "编辑变量";
        ui2.cancel = () => {
            settingBar(player , back);
        }
        ui2.toggle("lock" , "锁定变量类型(保持变量第一次设置时的类型,直至变量被重置)",tool.array_has(var_config[type].lock_type,id));
        let default_type = tool.un(var_config[type].default[id]) ? 0 : (tool.is_string(var_config[type].default[id]) ? 1 : 2);
        ui2.options("default_type" , "默认值类型" ,["无默认值" , "字符串" , "数字"] , default_type);
        ui2.input("default_value" , "默认值类型" ,"输入默认值" , default_type === 0 ? "" : String(var_config[type].default[id]));
        if(type === "personal"){
            ui2.toggle("bind" , "将自定义变量数值绑定到计分板的ID\n(不填则无绑定)(若变量为字符串则显示为0)",tool.un(var_config[type].bind[id]) ? "" : var_config[type].bind[id])
        }
        ui2.show(player , (r) => {
            if(r.lock){
                if(!tool.array_has(var_config[type].lock_type , id)){
                    var_config[type].lock_type.push(id);
                }
            }else{
                if(tool.array_has(var_config[type].lock_type , id)){
                    tool.array_clear(var_config[type].lock_type , id);
                }
            }
            switch(default_type){
                case 0:
                    if(!tool.un(var_config[type].default[id])){
                       delete var_config[type].default[id];
                    }
                    break;
                case 1:
                    var_config[type].default[id] = r.default_value;
                    break;
                case 2:
                    var_config[type].default[id] = tool.parse_number(r.default_value,0);
                    break;
            }
            if(type === "personal"){
                if(r.bind === ""){
                    if(!tool.un(var_config[type].bind[id])){
                        delete var_config[type].bind[id];
                    }else{
                        var_config[type].bind[id] = r.bind;
                    }
                }
            }
            save_var_config();
            settingBar(player , back);
        });

    });
}

function setConfigBar(player , back){
    const ui = new infoBar();
    ui.title = "领地设置";
    ui.cancel = () => {
       settingBar(player , back);
    }
    ui.toggle("save", "变量自动保存时长(单位:秒)", config.var.save);

    ui.show(player,(r) => {
        if(config.var.save !== r.save){
            mc.clear_job(save_job_id);
            save_job_id = mc.run_interval(save_all_vars , r.save * 20);
        }
        config.var.save = r.save;
        save_var_config();
        refresh_global_default_vars();
        for(let p of mc.get_all_players()){
            refresh_default_vars(p);
        }
        settingBar(player , back);
    });
}

register_system("var" , {
    set_var : set_var,
    set_personal_var : set_personal_var,
    set_global_var : set_global_var,
    get_var : get_var,
    get_var_type : get_var_type,
});