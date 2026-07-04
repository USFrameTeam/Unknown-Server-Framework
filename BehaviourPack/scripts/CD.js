import * as mc from "./Basic/Mc.js";
import * as tool from "./Basic/Tool.js";
import { get_text , push_text } from "./Basic/Text.js";
import { config, get_system , has_system, register_system } from "./Basic/Core.js";
import { btnBar , infoBar } from "./Basic/ui.js";
import { register_global_ui , show_global_ui } from "./Basic/UniversalUI.js";
import { ui_icon } from "./Basic/Data.js";

/*
CD.js
功能：主菜单
*/

function cdBar(player , _options = {}) {
    //防止频繁触发主菜单
    if (Date.now() - tool.to_number(player.last_cd) < 1000) {
        return;
    } else {
        player.last_cd = Date.now();
    }

    const ui = new btnBar();
    ui.title = "主菜单";
    push_text("menu_text" , ["欢迎来到主菜单！"]);
    ui.body = tran_text(player, get_text("menu_text") , true);
    ui.busy = null;

    if(has_system("land")){
        if (player.landing.mode === 1) {
            if (player.isSneaking) {
                player.landing.mode = 0
                player.landing.points = []
                mc.chat("§e[领地系统]已取消创建领地!", [player])
            } else {
                if (player.landing.points.length === 2) {
                    //createLandBar(player) TODO
                } else {
                    mc.set_title(player, get_text("land.two"));
                }
            }
            return
        }
   
        //TODO
        /* if (player.in_land !== "") {
            var land = get_land(player.in_land)
            ui.btns.push({
            text: `领地:${land.name}\n领地主:${(is_bool(land.public) ? "公共领地" : get_name_by_id(land.creater))}`,
            icon: ui_icon.land,
            func: () => {
                viewLandBar(player, player, land.id)
            }
            })
        } */
    }

    if(has_system("pos")){
        ui.btns.push({
            text: "传送系统",
            icon: ui_icon.pos,
            func: () => {
                show_global_ui(player,"pos",{cancel = () => {
                    cdBar(player);
                }});
            }
        });
    }

    if(has_system("chat")){
        ui.btns.push({
            text: "聊天设置",
            icon: ui_icon.chat,
            func: () => {
                show_global_ui(player,"chat_setting",{cancel = () => {
                    cdBar(player);
                }});
            }
        });
    }
    
    if(has_system("land") && config.land.able){
        ui.btns.push({
            text: "领地系统",
            icon: ui_icon.land,
            func: () => {
                /* show_global_ui(player,"chat_setting",{cancel = () => {
                    cdBar(player);
                }}); */ // TODO
            }
        });
    }

    if(has_system("group") && config.group.able){
        ui.btns.push({
            text: "群组系统",
            icon: ui_icon.player,
            func: () => {
                /* show_global_ui(player,"chat_setting",{cancel = () => {
                    cdBar(player);
                }}); */ // TODO
            }
        });
    }

/*     if (config.daily.able) {
        var now = get_date_object_China_time()
        var date = new Date(to_number(player.info.daily, 0))
        if (date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth() || now.getDate() !== date.getDate()) {
        ui.btns.push({
            text: "签到",
            icon: pictures.gift,
            func: () => {
            var commands = to_array(parse_json(config.daily.command))
            for (var i = 0; i < commands.length; i++) {
                try {
                player.runCommand(commands[i])
                } catch (err) { }
            }
            player.info.daily = get_date_now_China_time()
            save_player_info(player)
            }
        })
        }
    } */ //签到 TODO

    if (has_system("shop") && config.store.able) {
        ui.btns.push({
        text: "商店系统",
        icon: ui_icon.villager,
        func: () => {
            //storeBar(player) TODO
        }
        });
    }

    if (has_system("ATM") && config.tran.able) {
        ui.btns.push({
        text: "转账机",
        icon: ui_icon.trade,
        func: () => {
            //tranBar(player); TODO
        }
        });
    }


    if (config.game.kill) {
        ui.btns.push({
            text: "自杀",
            icon: ui_icon.sword,
            func: () => {
                player.kill();
            }
        })
    }

    if (has_system("notification") && config.board.able) {
        ui.btns.push({
            text: "公告",
            icon: ui_icon.sign,
            func: () => {
                show_global_ui(player,"notification",{ show_cd : true });
            }
        });
    }

    if ( has_system("usf_manager") && get_op_level(player) >= 1 ) {
        ui.btns.push({
        text: "管理界面",
        icon: ui_icon.op,
        func: () => {
            show_global_ui(player,"pos",{cancel = () => {
                cdBar(player);
            }});
        }
        })
    }

    if(ui.btns.length === 0){
        push_text("cd_none","主菜单暂时无可用功能!");
        mc.chat(get_text("cd_none"),[player]);
        return;
    }
    ui.show(player);
}

register_system("cd" , {});
register_global_ui("cd" , cdBar);