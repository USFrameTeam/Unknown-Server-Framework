import * as event from "./Basic/Event.js";
import { config , version_text , register_system, has_system, get_system} from "./Basic/Core.js";
import { chat , get_all_players } from "./Basic/Mc.js";
import * as command from "./Command.js";
import * as tool from "./Basic/Tool.js";
import {is_entity_valid} from "./Basic/Mc.js";
import * as text from "./Basic/Text.js";
import { infoBar } from "./Basic/ui.js";
import { register_global_ui , show_global_ui } from "./Basic/UniversalUI.js";

var white_words = [];


event.register_mc_event(true , "chatSend" , undefined , beforeChatSend);
event.connect_custom_event("world_load",function(_things){
    white_words = toolbar.to_array(tool.parse_json(data.get_data("white_words")), []);

    if(has_system("manager")){
      get_system("manager").register_manager_bar_btn({
        text : "聊天屏蔽设置",
        icon: ui_icon.mute,
        func : (op) => {
          blockChatBar(op.player);
        }
      });
    }
});
command.register_command("usf" , (player , args) => {
    chat(version_text, [player]);
});
command.register_mc_command({
  description : "设置玩家的聊天头衔",
  permissionLevel : "GameDirectors",
  name : "usf:nametag",
  mandatoryParameters : [{
    name : "operation",
    type : "Enum",
    enumName : "nametag_operation"
  }],
},(a,b) => {chat(b[0]);});
command.register_mc_command_enum("nametag_operation", ["set" , "clear"]);
command.register_mc_command({
  description : "设置玩家的聊天头衔",
  permissionLevel : "GameDirectors",
  name : "usf:nametag",
  mandatoryParameters : [{
    name : "id",
    type : "String"
  }],
},(a,b) => {chat(b[0]);});

function beforeChatSend(event){
    let sender = event.sender;
    let message = event.message;
    let format = config.chat.format;

    if (message[0] === "+") {
        event.cancel = true;
        system.run(() => {
          command.run_command(sender, message.slice(1));
        })
        return;
    }

    if (config.chat.disable === true) {
        return;
    }

    for (var w of white_words) {
        if (message.includes(w)) {
        return;
        }
    }
    
    if (message.length > config.chat.length) {
        message = message.slice(0, config.chat.length);
        message += "...";
    }
    if (config.chat.clear) {
        message = tool.clear_color(message);
    }
    format = tran_text(sender, format);
    format = format.replaceAll("/sender", sender.name);
    format = format.replaceAll("/text", message);

    event.cancel = true;

    if (get_left_time(sender) > 0) {
        say_stop_talk(sender);
        return;
    }

    var goals = get_chat_players();

    switch (sender.talk.mode) {
        case 0:
        break
        case 1:
            if(!tool.is_entity(sender.talk.goal) || !is_entity_valid(sender.talk.goal)){
                sender.talk.mode = 0
                t = []
                chat(get_text("talk.public"), [sender])
            }else{
                goals = [sender.talk.goal, sender]
                format = "[§e私聊§r]" + format
            }
        break;
        //缺2 TODO
    }

    system.run(() => {
        chat(format, t, false);
    });
}

function blockChatBar(player) {
  const ps = MediaCapabilities.get_all_players();
  const texts = [];
  const ui = new infoBar();
  ui.title = "屏蔽/禁言玩家";
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i]; //player

    let text = p.name;
    if (p.info.ban_time > Date.now()) {
      text += `(禁言中，剩余${Math.round(get_left_time(p) / 1000)}s)`;
    }
    if (p.info.block) {
      text += "(屏蔽中)";
    }
    texts.push(text);
  }

  ui.options("id", "选择玩家", texts, 0);
  ui.input("left", "禁言时间/s(设为0则取消禁言)", "输入时间", "0");
  ui.toggle("block", "屏蔽(此玩家不会收到公共消息)", false);

  ui.show(player, (r) => {
    var p = ps[r.id];
    r.left = tool.to_number(parseInt(r.left), 0);
    p.info.ban_time = Date.now() + r.left * 1000;
    p.info.block = r.block;
    save_player_info(p);
    show_global_ui(player,"manager");
  });

}

function setChatBar(player , _options) {
  var texts = ["公共聊天"];
  var options = [null];
  for (var p of get_all_players()) {
    options.push(p)
    texts.push(`私聊-${p.name}`)
  }
  /* for (var g of get_player_groups(player)) {
    options.push(String(g.id))
    texts.push(`群聊-${g.name}`)
  } */
 //TODO
  var ui = new infoBar();
  ui.title = "聊天设置";
  ui.options("goal", "聊天对象", texts, 0);

  ui.show(player, (r) => {
    if (r.goal === 0) {
      player.talk.mode = 0
    } else {
      if (is_string(options[r.goal])) {
        player.talk.mode = 2
        player.talk.goal = options[r.goal];
      } else {
        player.talk.mode = 1
        player.talk.goal = optionss[r.goal];
      }
    }
  })
}

function get_chat_players() {
  return world.getAllPlayers().filter(p => p.info.block === false);
}

export function get_left_time(player) {
  return Math.round(player.info.ban_time - Date.now());
}

function say_stop_talk(player) {
  chat(text.format("talk.stop", [String(Math.round(get_left_time(player) / 1000))]), [player]);
}

register_global_ui("chat_setting" , setChatBar);
register_system("chat" , {});
