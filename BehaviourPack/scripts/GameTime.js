import * as event from "./Basic/Event.js";
import * as mc from "./Basic/Mc.js";
import * as tool from "./Basic/Tool.js";
import { save_data , get_data , ui_icon } from "./Basic/Data.js";
import { get_name_by_id , get_id } from "./Basic/Player.js";
import { get_op_level } from "./Basic/Permission.js";
import { get_text, push_text } from "./Basic/Text.js";
import { config , save_config ,has_system , get_system } from "./Basic/Core.js";
import {  confirm , tip } from "./Basic/UniversalUI.js";
import { infoBar , btnBar } from "./Basic/ui.js";
import * as logger from "./Basic/Logger.js";

event.connect_custom_event("world_load",(things) => {
    //注册设置
    if(has_system("setting")){
      get_system("setting").register_setting("game_time","游戏时间统计设置",settingBar);
    }

    logger.log(0,1,"————时间统计已加载————");
});


var cache_time = 0;
system_ids.time = system.runInterval(() => {
    if (!config.time.able) {
        return;
    }
    const type = config.time.type;

    if (!mc.has_score_board("time_show")) {
        world.scoreboard.addObjective("time", type === 0 ? "游戏时间/秒" : "游戏时间/分钟");
    }
    if (!mc.has_score_board("time")) {
        world.scoreboard.addObjective("time", "游戏时间");
    }

    if (timeType === 0) {
        for(let p of mc.get_all_players()){
            mc.scoreboard_add(p , "time" , 1);
        }
    }
    else{
        cache_time += 1;
        if (cache_time % 60 === 0) {
            for(let p of mc.get_all_players()){
                mc.scoreboard_add(p , "time" , 1);
            }
        }
    }

    for(let p of mc.scoreboard_entitys("time_show")){
        mc.scoreboard_remove(p , "time_show");
    }
    for(let p of mc.get_all_players()){
        mc.scoreboard_set(p , "time_show" , mc.scoreboard_get(player , "time"));
    }

    if (config.time.show) {
        mc.scoreboard_set_display("List" , "time_show");
    }
}, 20);

function settingBar(player,back = false){
    const ui = new infoBar();
    ui.cancel = () => {
        event.emit_custom_event("setting_changed",{player : player , back : back});
    }
    ui.title = "游戏时间统计";
    ui.toggle("able", "游戏时间统计[关闭 | 开启]\n游戏时间的记分板id为time\n显示时间的记分板id为time_show", config.time.able);
    ui.options("type", "统计时间", ["每秒", "每分钟"], config.time.type);
    ui.toggle("show", "显示时间并锁定在玩家列表", config.time.show);
    ui.show(player,(r) => {
        config.time.able = r.able;
        config.time.type = r.type;
        config.time.show = r.show;
        save_config();
        event.emit_custom_event("setting_changed",{player : player , back : back});
    });
}