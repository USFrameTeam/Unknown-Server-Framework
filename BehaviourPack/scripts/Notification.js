import { btnBar ,infoBar , arrayEditor} from "./Basic/ui.js";
import { ui_icon , get_data , save_data , pictures ,clear_data} from "./Basic/Data.js";
import * as tool from "./Basic/Tool.js";
import { config ,has_system ,get_system , save_config , register_system} from "./Basic/Core.js";
import * as event from "./Basic/Event.js";
import { tran_text } from "./Basic/Text.js";
import {register_global_ui, show_global_ui} from "./Basic/UniversalUI.js";
import { chat } from "./Basic/Mc.js";
/*
Notification.js
功能：全服公告
*/

var notifications = [];

event.connect_custom_event("world_load",(things) => {
    //注册设置
    if(has_system("setting")){
      get_system("setting").register_setting("notification","公告设置",notificationManagerBar);
    }

    load_notifications();
    logger.log(0,1,"————公告系统已加载————");
});

function notificationManagerBar(player , back = false) {
  var ui = new btnBar();
  ui.title = "公告设置";
  ui.body = ["此处管理服务器的公告板",
    "可以点击\"添加公告\"新建公告",
    "点击公告可以预览、编辑",
    "配置处可以修改公告基本设置",
  ]
  ui.cancel = () => {
    event.emit_custom_event("setting_changed" , {"player" : player , "back" : back});
  }
  ui.btns = [{
    text: "配置",
    icon: ui_icon.sign,
    func: () => {
      configEditBar(player , back);
    }
  },
  {
    text: "添加公告",
    icon: ui_icon.add,
    func: () => {
      notificationEditBar(player , `board${Date.now()}` , back);
    }
  }
  ];

  for (var key of Object.keys(notifications)) {
    var text = (notifications[key].able) ? "§2[启用]§r" : "§4[禁用]§r";
    if (notifications[key].able && notifications[key].up) {
      text += "§n[顶置]§r";
    }
    ui.btns.push({
      text: text + notifications[key].name,
      icon: (tool.is_string(notifications[key].icon)) ? pictures[notifications[key].icon] : null,
      func: (op) => {
        notificationEditBar(player, op.id , back);
      },
      op: {
        "id": key,
      }
    });
  }
  ui.show(player);
}

function notificationEditBar(player, id , back) {
  const notification = tool.to_object(notifications[id]);
  if (Object.keys(notification).length === 0) {
    data = {
      able: true,
      texts: [],
      up: false,
      name: "",
      icon: null
    }
  }
  var ui = new infoBar();
  ui.title = "公告信息配置";
  ui.toggle("able", "[禁用 | 启用]", notification.able);
  ui.input("name", "公告显示名称", "输入名称", notification.name);
  add_pictures_choice(ui, "选择公告的图标", notification.icon);
  ui.toggle("up", "顶置", notification.up);
  ui.toggle("delete", "删除", false);

  ui.cancel = () => {
    notificationManagerBar(player,back);
  }

  ui.show(player, (r) => {
    if (r["delete"] === true) {
      clear_data(id);
      const ids = get_notifications_ids();
      tool.array_clear(ids, id);
      save_data("board_ids", tool.to_json(ids));
      delete notifications[id];
      notificationManagerBar(player,back);
    } else {
      notification.name = r.name
      notification.up = r.up
      notification.able = r.able
      notification.icon = r.icon
      save_data(id, tool.to_json(notification));
      var ids = get_notifications_ids();
      if (tool.array_has(ids, id) === false) {
        ids.push(id);
        save_data("board_ids", tool.to_json(ids))
      }
      
      const editor = new arrayEditor();
      editor.look = () => {
        return tran_text(player, notification.texts);
      }
      editor.edit(player, notification.texts)
      editor.back = () => {
        save_data(id, tool.to_json(notification));
        notificationManagerBar(player,back);
      }
    }
  })
}

function configEditBar(player,back){
    var names = ["无"];
    var ids = Object.keys(notifications);
    for (var key of ids) {
        names.push(notifications[key].name);
    }
    ids = [""].concat(ids);
    
    const ui = new infoBar();
    ui.title = "公告配置";
    ui.toggle("able", "公告[关闭 | 开启]", config.board.able);

    ui.options("_", "默认公告", names, (config.board["_"] === "") ? 0 : Math.max(tool.array_index(ids, config.board["_"]),0));
    ui.match(ids);

    ui.options("first", "发给新成员", names, array_index(ids, config.board.first))
    ui.match(ids);
    ui.show(player, (r) => {
        config.board["_"] = r["_"]
        config.board["first"] = r["first"]
        config.board.able = r.able
        save_config()
        notificationManagerBar(player,back);
    });
}

/* id = null 要显示的公告id,为null则打开默认公告
show_cd = true 是否显示主菜单
fisrt = false 是否优先打开新成员公告
*/
function notificationBar(player,options) {
    if (config.board.able === false) {
        return;
    }

    const id = (tool.is_string(options.id)) ? options.id : null;
    const show_cd = tool.to_bool(options.show_cd,false);
    const first = tool.to_bool(options.first,false);

    let ids = Object.keys(notifications);
    for (var id of ids) {
        if (notifications[id].able === false) {
            tool.array_clear(ids, id);
        }
    }

    if(ids.length === 0){
        chat("[公告系统]暂无公告!",[player]);
        return;
    }

    let notification = null;
    let current_id = id;
    if (id === null) {
        if (first && tool.is_object(notifications[config.board.first])) {
            notification = notifications[config.board.first];
            current_id = config.board.first;
        }
        if (notification === null && tool.is_object(notifications[config.board["_"]])) {
            notification = notifications[config.board["_"]];
            current_id = config.board["_"];
        }
    } else {
        notification = notifications[id];
    }


    if (notification === null) {
        var i = ids[tool.random_int(ids.length)];
        notification = notifications[i];
        current_id = i;
    }

    const ui = new btnBar();
    ui.busy = null;
    ui.title = notification.name;
    ui.body = tran_text(player, notification.texts, true);
    if (has_system("cd") && show_cd) {
        ui.btns = [{
            text: "主菜单",
            icon: ui_icon.craft_table,
            func: () => {
                show_global_ui(player,"cd");
            }
        }]
    }

    for (var i = 0; i < ids.length; i++) {
        var this_id = ids[i];
        if (this_id !== current_id && notifications[this_id].able) {
        ui.btns.push({
            text: (notifications[this_id].up ? "§n[顶置]§r" : "") + notifications[this_id].name,
            icon: (tool.is_string(notifications[this_id].icon)) ? pictures[notifications[this_id].icon] : null,
            func: (op) => {
                notificationBar(player , {
                    "id" : op.this_id,
                    "show_cd" : show_cd,
                    "first" : false,
                })
            },
            op: {
                "this_id": this_id
            }
        })
        if (notifications[this_id].up) {
            ui.btns.splice(0, 0, ui.btns.pop())
        }
        }
    }

    if (ui.btns.length === 0) {
        ui.btns.push({
        text: "关闭",
        icon: ui_icon.delete,
        func: () => { }
        })
    }
    ui.show(player);
}

function load_notifications() {
  const ids = get_notifications_ids();

  for (let id of ids) {
    const data = get_data(id);
    if (data !== "") {
      notifications[id] = tool.to_object(tool.parse_json(data));
    }
  }
}

function get_notifications_ids() {
  return tool.to_array(tool.parse_json(get_data("board_ids")), []);
}

register_global_ui("notification" , notificationBar);
register_system("notification",{});
