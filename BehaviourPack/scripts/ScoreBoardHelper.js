import { infoBar , btnBar } from "./Basic/ui.js";
import * as event from "./Basic/Event.js";
import * as mc from "./Basic/Mc.js";
import { format } from "./Basic/Text.js";
import { ui_icon , get_data , save_data} from "./Basic/Data.js";
import * as tool from "./Basic/Tool.js";
import {has_system ,get_system} from "./Basic/Core.js";
import { playerChooser , tip } from "./Basic/UniversalUI.js";

const config_format = {
    default : {},
    show : [],
}
var config = {};

mc.run_interval(() => {
    const scoreboard = mc.get_score_board_class();
    for(let original_id of config.show){
        const object = scoreboard.getObjective(original_id);
        if(tool.un(object)){continue;}
        const new_object = scoreboard.getObjective(original_id + "_"); 
        if(tool.un(new_object)){
            new_object = scoreboard.addObjective(original_id + "_" , object.displayName);
        }else{
            for(let part of new_object.getParticipants()){
                new_object.removeParticipant(part);
            }
        }

        for(let player of mc.get_all_players()){
            if(object.hasParticipant(player)){
                new_object.setScore(player , object.getScore(player));
            }
        }
    }
} , 20);

event.connect_custom_event("player_load" , (options) => {
    const player = options.player;
    const scoreboard = mc.get_score_board_class();
    for(let key of Object.keys(config.default)){
        const object = scoreboard.getObjective(key);
        if(!tool.un(object)){
            if(!object.hasParticipant(player)){
                object.setScore(player , config.default[key]);
            }
        }
    }
});

event.connect_custom_event("world_load",(things) => {
    config = tool.to_object(tool.parse_json(get_data("scoreboards")));
    tool.object_override(config ,config_format);

    //注册设置
    if(has_system("setting")){
      get_system("setting").register_setting("scoreboard","计分板设置",scoreboardBar);
    }

    logger.log(0,1,"————计分板管理功能已加载————");
});

function save_config(){
    save_data(tool.to_json(config));
}

function scoreboardBar(player , back = false){
    const objects = mc.get_score_board_objects();
    const ui = new btnBar();
    ui.cancel = () => {
        event.emit_custom_event("setting_changed",{player : player , back : back});
    }
    ui.title = "计分板管理";
    ui.body = format("当前计分板个数:[0]" , [objects.length]);
    ui.btns = [{
        text : "添加计分板",
        icon : ui_icon.add,
        func : () => {
            addScoreboardBar(player , back);
        }
    }];

    for(let obj of objects){
        ui.btns.push({
            text : format("ID:[0]\n名称:[1]",[obj.id , obj.displayName]),
            op : {id : obj.id},
            func : (op) => {
                scoreboardSettingBar(player , op.id , back);
            }
        })
    }
    ui.show(player);
}

function scoreboardSettingBar(player , id , back = false){
    const ui = new btnBar();
    const object = mc.get_score_board_object(id);
    ui.title = format("计分板编辑 - [0]" , [object.displayName]);
    ui.cancal = () => {
        scoreboardBar(player , back);
    }
    ui.btns = [{
        text : "查看数据/特殊功能",
        icon : ui_icon.player,
        func : () => {
            scoreboardViewBar(player , object , back);
        }
    },{
        text : "设置分数",
        icon : ui_icon.brush,
        func : () => {
            scoreboardValueBar(player , object , back);
        }
    },{
        text : "删除",
        icon : ui_icon.delete,
        func : () => {
            mc.remove_score_board(id);
            if(!tool.un(config.default[id])){
                delete config.default[id];
            }
            tool.array_clear(config.show,id);
            save_config();
            scoreboardBar(player , back);
        }
    }]
    
}

function scoreboardViewBar(player , object , back){
    const ui = new infoBar();
    ui.cancel = () => {
        scoreboardSettingBar(player , object.id , back);
    }
    ui.title = "数据";
    const texts = [];
    for(let part of object.getParticipants()){
        texts.push(format("[[0]][1] - 分数:[2]",[
            ["玩家" , "文本" , "实体"][tool.array_index(["Player" , "FakePlayer" , "Entity"],part.type)] , part.displayName , part.getScore(part)
        ]));
    }
    ui.toggle("?" , tool.array2line(texts) , false);
    ui.toggle("default" , "使用默认值"  , !tool.un(config.default[object.id]));
    ui.input("default_value" , "默认值" , "请输入数字" , tool.to_number(config.default[object.id]));
    ui.toggle("show" , "是否剔除离线玩家(开启后,将自动创建一个原计分板id末尾加下划线的计分板，该计分板即是剔除离线玩家的计分板)" , tool.array_has(config.show,object.id));
    ui.show(player , (r) => {
        if(r.default){
            config.default[object.id] = tool.to_number(tool.parse_number(r.default_value));
        }else if(!tool.un(config.default[object.id])){
            delete config.default[object.id];
        }

        if(r.show && !tool.array_has(config.show,object.id)){
            config.show.push(object.id);
        }else{
            tool.array_clear(config.show , object.id);
        }

        save_config();
        scoreboardSettingBar(player , object.id , back);
    });
}

function scoreboardValueBar(player , object , back){
    const ui = new infoBar();
    ui.cancel = () => {
        scoreboardSettingBar(player , object.id , back);
    }
    ui.title = "设置分数";
    const participants = [];
    const texts = [];
    for(let player of mc.get_all_players()){
        if(!object.hasParticipant(player)){
            participants.push(player);
            texts.push(format("[玩家][0] - 无分数",[player.name]));
        }
    }
    for(let part of object.getParticipants()){
        participants.push(part);
        texts.push(format("[[0]][1] - 分数:[2]",[
            ["玩家" , "文本" , "实体"][tool.array_index(["Player" , "FakePlayer" , "Entity"],part.type)] , part.displayName , part.getScore(part)
        ]));
    }

    ui.options("index" , "选择操作对象" , texts , 0);
    ui.input("count" , "设置分数" , "请输入数字分数" , "");
    ui.show(player , (r) => {
        const participant = participants[r.index];
        const count = tool.parse_number(count , undefined);
        if(tool.is_number(count)){
            object.setScore(participant , count);
            scoreboardSettingBar(player , object.id , back);
        }else{
            tip(player , "您输入的分数不合法！" , () => {
                scoreboardSettingBar(player , object.id , back);
            })
        }
    })
}

function addScoreboardBar(player , back){
    const ui = new infoBar();
    ui.cancel = () => {
        scoreboardBar(player, back);
    }
    ui.title = "添加计分板";
    ui.input("id" , "计分板ID" , "请输入ID" , "");
    ui.input("name" , "计分板名称" , "请输入任意名称" , "");
    ui.options("display" , "展示位置" , ["无" , "玩家名称标签下方" , "玩家列表" , "侧边栏"],0);
    ui.options("order" , "排序" , ["无" , "玩家名称标签下方" , "玩家列表" , "侧边栏"],0);
    ui.toggle("order" , "展示时使用倒序"  , ["根据分数大小" , "首字母A-Z" , "首字母Z-A"]);
    ui.show(player , (r) => {
        const scoreboard = mc.get_score_board_class();
        let object;
        try{
            object = scoreboard.addObjective(r.id , r.name);
        }catch(e){}
        if(tool.un(object)){
            tip(player , "无法添加计分板！请尝试修改计分板ID！" , () => {
                scoreboardBar(player , back);
            });
            return;
        }else{
            if(r.display !== 0){
                scoreboard.setObjectiveAtDisplaySlot(["BelowName","List","Sidebar"][r.display -1],{
                    objective : object,
                    sortOrder : (r.order === 0) ? undefined : r.order,
                });
            }
            scoreboardBar(player , back);
        }
    });
    
}