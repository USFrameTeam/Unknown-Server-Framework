import { register_global_ui , show_global_ui , tip , chooseBar , has_global_ui} from "./Basic/UniversalUI.js";
import { btnBar , infoBar } from "./Basic/ui.js";
import { get_id , get_name_by_id, get_player_name} from "./Basic/Player.js";
import { get_op_level , ops , owners , save_ops , save_owners} from "./Basic/Permission.js";
import { format } from "./Basic/Text.js";
import * as data from "./Basic/Data.js";
import * as mc from "./Basic/Mc.js";
import * as event from "./Basic/Event.js";
import { register_system } from "./Basic/Core.js";
import { is_function } from "./Basic/Tool.js";

/*Usf.js
功能：
1.定义管理界面
2.管理OP权限
*/

function usfBar(player , options){
    if(get_op_level(player) === 0){return;}

    var ui = new btnBar();
    ui.busy = null;
    ui.title = "USF管理界面";
    ui.body = "欢迎使用USF管理功能";
    if(is_function(options.cancel)){
        ui.cancel = ()=>{
            options.cancel();
        }
    }
    ui.btns = [{
        text: "管理员功能",
        icon: data.ui_icon.manager,
        func: () => {
            managerBar(player);
        }
    },{
        text: "插件设置",
        icon: data.ui_icon.setting,
        func: () => {
            show_global_ui(player , "setting");
        }
    },{
        text: "OP管理",
        icon: data.ui_icon.op,
        func: () => {
            opBar(player);
        }
    }];

    if(has_global_ui("whitelist")){
        ui.btns.push({
            text: "白名单管理",
            icon: data.pictures.pickaxe,
            func: () => {
                show_global_ui(player , "whitelist");
            }
        })
    }

    ui.show(player);
    event.emit_custom_event("usf_manager_bar_showed",{"player" : player});
}

function addOpBar(player){
    var names = [];
    var players = [];
    for (var p of mc.get_all_players()) {
        if (get_op_level(p) === 0) {
        names.push(get_player_name(p));
        players.push(p);
        }
    }
    if (ps.length === 0) {
        tip(player, "当前没有可添加的玩家！", () => {
            opBar(player);
        });
        return;
    }

    var ui = new infoBar();
    ui.cancel = () => {
        opBar(player);
    }
    ui.title = "添加op";
    ui.options("id", "选择玩家", names, 0);
    ui.show(player, (r) => {
        ops.push(get_id(players[r.id]));
        save_ops();
        opBar(player);
    });
}

function deleteOpBar(player){
    var names = [];
    for (var id of ops) {
        names.push(String(id) + `(${get_name_by_id(id)})`);
    }

    var ui = new infoBar();
    ui.cancel = () => {
        opBar(player);
    }
    ui.title = "删除OP";
    ui.options("id", "选择玩家", names, 0)
    ui.show(player, (r) => {
        ops.splice(r.id, 1);
        save_ops();
        opBar(player);
    });
}

function deleteOwnerBar(player){
    let names = [];
    for (let i = 0; i < owners.length; i++) {
        names.push(format("[0]([1])",[owners[i] , get_name_by_id(owners[i])]));
    }
    chooseBar(player, "选择要删除的Owner", names, (r) => {
    let ids = [];
    //统计要删除的Owner
    for (let id of r) {
        ids.push(owners[id])
    }
    //删除Owner
    for (let id of ids) {
        owners.splice(owners.indexOf(id), 1);
    }
    save_owners();
    opBar(player);
    })
}

function opBar(player , _options){
    if (get_op_level(player) === 0) {
        return;
    }
    var ui = new btnBar();
    ui.title = "OP管理";
    ui.cancel = () => {
        usfBar(player);
    }

    var text = "服务器OP:\n";
    for (var id of ops) {
        text += `${id}(${get_name_by_id(id)})` + "\n";
    }
    text += "服务器owners:\n"
    for (var owner_id of owners) {
        text += `${owner_id}(${get_name_by_id(owner_id)})` + "\n";
    }

    ui.body = text;
    ui.btns.push({
        text: "添加op",
        icon: data.ui_icon.add,
        func: () => {
            addOpBar(player);
        }
    });

    if (ops.length > 0) {
        ui.btns.push({
        text: "删除op",
        icon: ui_icon.delete,
        func: () => {
            deleteOpBar(player);
        }
        })
    }

    if (get_owners().length > 0 && get_op_level(player) === 2) {
        ui.btns.push({
        text: "删除owner",
        icon: ui_icon.delete,
        func: () => {
            deleteOwnerBar(player);
        }
        })
    }
    ui.show(player);
}


register_global_ui("usf" , usfBar);
register_global_ui("op" , opBar);
event.report_custom_event("usf_manager_bar_showed");
register_system("usf_manager",{});