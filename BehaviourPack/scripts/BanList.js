import * as data from "./Basic/Data.js";
import * as logger from "./Basic/Logger.js";
import * as tool from "./Basic/Tool.js";
import * as event from "./Basic/Event.js";
import * as mc from "./Basic/Mc.js";
import { get_system } from "./Basic/Core.js";
import { get_text } from "./Basic/Text.js";
import { get_name_by_id , get_id } from "./Basic/Player.js";
import { playerChooser , confirm } from "./Basic/UniversalUI.js";
import { arrayEditor } from "./Basic/ui.js";

var ban_list = []

event.register_mc_event(false,"worldLoad",undefined,function(event){
    load_ban_list();
    text.push_text("kick_message","您已被封禁，请联系服务器管理员解禁后重试！");
});

event.register_mc_event(false,"playerSpawn",undefined,function(event){
  const player = event.player;
  if(tool.array_has(ban_list,player.name) || tool.array_has(ban_list,get_id(player))){
    mc.kick(player,get_text("kick_message"),false);
  }
});

export function load_ban_list() {
  ban_list = tool.to_array(tool.parse_json(data.get_data("ban")),[]);
}

export function save_ban_list(){
    save_data("ban", tool.to_json(ban_list));
}

export function banListCheck(player) {
  var ui = new btnBar()
  ui.title = "封禁列表管理"
  ui.body = ["管理封禁列表",
    "(注：玩家名与玩家id皆有效)",
    "封禁列表:"
  ]

  for (let id of ban_list) {
    ui.body.push(`${get_name_by_id(id)}(${id})`);
  }

  ui.btns = [{
    text: "添加并立即踢出在线玩家",
    icon: data.ui_icon.add,
    func: () => {
        playerChooser(player, mc.get_all_players(), (players) => {
            let success_list = [];
            for (let p of players) {
                if(mc.is_entity_valid(p)){
                    if(mc.kick(player,get_text("kick_message"),false)){
                        ban_list.push(String(get_id(p)));
                        success_list.push(p.name);
                    }
                }
            }
            data.save_data("ban", tool.to_json(ban_list));
            confirm(player,[
                "(部分玩家因退出游戏、含有OP权限等原因未加入封禁列表)",
                "下列玩家已加入封禁列表:"
            ].concat(success_list),() => {
                banListCheck(player);
            });
      })
    }
  }]

  if (ban_list.length > 0) {
    ui.btns.push({
      text: "移除玩家",
      icon: data.ui_icon.delete,
      func: () => {
            var ui = new infoBar()
            ui.title = "移除玩家"
            for (var id of ban_list) {
            ui.toggle(id, `${get_name_by_id(id)}(${id})`, false);
            }
            ui.show(player, (r) => {
            for (var k of Object.keys(r)) {
                if (r[k] === true) {
                array_clear(ban_list, k);
                }
            }
            save_data("ban", to_json(ban_list));
            banListCheck(player);
            })
      }
    })
  }

  ui.btns.push({
    text: "编辑列表",
    icon: data.ui_icon.edit,
    func: () => {
      var editor = new arrayEditor();
      editor.back = () => {
        save_data("ban", to_json(ban_list));
        banListCheck(player);
      }
      editor.edit(player, ban_list);
    }
  })

  ui.show(player);
}

get_system("manager").register_manager_bar_btn({
    text: "封禁列表管理",
    icon: data.ui_icon.stop,
    func: (op) => {
      banListCheck(op.player);
    }
});