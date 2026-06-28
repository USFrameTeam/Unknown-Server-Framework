import * as event from "./Basic/Event.js";
import { config , version_text } from "./Basic/Core.js";
import { chat , get_all_players } from "./Basic/Mc.js";
import * as command from "./Command.js";
import * as tool from "./Basic/Tool.js";
import {is_entity_valid} from "./Basic/Mc.js";
import * as text from "./Basic/Text.js";
import { infoBar } from "./Basic/ui.js";

var white_words = [];


event.register_mc_event(true , "chatSend" , undefined , beforeChatSend);
event.connect_custom_event("world_load",function(_things){
    white_words = toolbar.to_array(tool.parse_json(data.get_data("white_words")), []);
});
command.register_command("usf" , (player , args) => {
    chat(version_text, [player]);
});

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
        //缺2
    }

    system.run(() => {
        chat(format, t, false);
    });
}

function setChatBar(player) {
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