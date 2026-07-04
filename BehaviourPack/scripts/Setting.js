import { register_system } from "./Basic/Core.js";
import * as event from "./Basic/Event.js";
import { btnBar } from "./Basic/ui.js";
import { register_global_ui, show_global_ui } from "./Basic/UniversalUI.js";
import * as tool from "./Basic/Tool.js";
import * as logger from "./Basic/Logger.js";

/*
Setting.js
作用：
设置界面管理
*/

//结构 ： { type : "类型" , "name" : "按钮名称" , func : function(player){}}
var settings = [];

export function register_setting(type , name , func = function(player){}){
    settings.push({
        name : name,
        type : type,
        func : func
    });
}

//things.back = bool 定义关闭页面是否返回usf管理页面
function settingBar(player , things = {}){
    if(settings.length === 0){
        return;
    }

    const ui = new btnBar();
    ui.title = "插件设置";
    ui.body = ["欢迎使用USF","此处管理插件所有功能"];
    if(tool.to_bool(things.back,false)){
        ui.cancel = () => {
            show_global_ui(player,"usf",{});
        }
    }
    for(let setting of settings){
        ui.btns.push({
            text : setting.name,
            op : { func : setting.func},
            func : () => {
                op.func(player,tool.to_bool(things.back,false));
            }
        })
    }
    ui.show(player);
}

event.connect_custom_event("sitting_changed",(op) => {
    settingBar(player , { back : op.back });
})

//事件sitting_changed
//由其他文件发出,引导页面返回,发出信号应当带参数{player : 玩家 , back : bool}，退回对应类型的设置界面
event.report_custom_event("sitting_changed");
register_global_ui("setting",settingBar);
register_system("setting",{
    "register_setting" : register_setting,
});

logger.log(0,1,"————设置系统已加载————");
