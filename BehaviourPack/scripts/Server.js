import * as mc from "./Basic/Mc.js";
import * as tool from "./Basic/Tool.js";
import * as logger from "./Basic/Logger.js";
import { config, get_system , has_system, register_system } from "./Basic/Core.js";
import { infoBar } from "./Basic/ui.js";
import { register_global_ui , show_global_ui , tip } from "./Basic/UniversalUI.js";
import { format } from "./Basic/Text.js";
import { register_mc_command } from "./Command.js";

/*
Server.js
作用：管理白名单
*/

var module;
var while_list;
var is_valid = false;

import("@minecraft/server-admin").then((server)=>{
    logger.log(0,1,"[管理系统]白名单编辑功能已开启！");
    module = server;
    while_list = server.dedicatedServer.allowList;
    is_valid = true;
    register_global_ui("whitelist" , whiteListEditBar);
}).catch((err)=>{});

register_mc_command({
  description : "将玩家转移到另一个服务器",
  permissionLevel : 1,
  name : "usf:transfer",
  mandatoryParameters : [{
    name : "Player",
    type : "PlayerSelector"
  },{
    name : "IP",
    type : "String"
  },{
    name : "Port",
    type : "Integer"
  },]
},(origin,args) => {
    let player = args[0];
    if(tool.is_player(player)){
        let ip = args[1];
        let port = tool.to_number(args[2] , -1);
        if( port > 0 && port < 65535 && tool.is_string(ip)){
            try{
                module.transferPlayer(player, {
                    hostname : ip,
                    port : port
                });
            }catch(e){logger.log(2,1,"[玩家转移]无法将玩家转移至另一服务器!错误原因:[0]",[String(e)]);}
        }else{
            logger.log(2,1,"[玩家转移]无法将玩家转移至另一服务器!错误原因:您输入的ip或端口有误!");
        }
    }
})

function whiteListEditBar(player , options = {}){
    const ui = new infoBar();
    ui.title = "白名单管理";
    ui.cancel = () => {
        show_global_ui(player , "usf");
    };
    ui.input("id" , "输入需要操作的完整玩家ID" , "如:Notch" , "");
    ui.options("op" , "操作"  , ["查询" , "添加" , "删除"] , 0);
    ui.show(player , (r) => {
        const id = r.id;
        switch(r.op){
            case 0:
                tip(player , format("查询结果:[0]" , [while_list.contains(id) ? "该玩家在白名单内" : "该玩家不在白名单内"]) , () => {
                    whiteListEditBar(player);
                } );
                break;
            case 1:
                let text = "玩家已被添加至白名单!";
                try{
                    while_list.add(id);
                }catch(e){ text = "无法将该玩家添加至白名单!";}
                tip(player , text , () => {
                    whiteListEditBar(player);
                });
                break;
            case 2:
                let text = "玩家已从白名单中移除!";
                try{
                    while_list.remove(id);
                }catch(e){ text = "移除失败!";}
                tip(player , text , () => {
                    whiteListEditBar(player);
                });
                break;
        }
    });
}


