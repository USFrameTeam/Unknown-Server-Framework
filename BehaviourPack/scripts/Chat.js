import * as event from "./Basic/Event.js";
import { config , version_text , register_system, has_system, get_system , exported_datas , save_config} from "./Basic/Core.js";
import { chat , get_all_players } from "./Basic/Mc.js";
import * as command from "./Command.js";
import * as tool from "./Basic/Tool.js";
import {is_entity_valid} from "./Basic/Mc.js";
import * as text from "./Basic/Text.js";
import * as data from "./Basic/Data.js";
import { infoBar , arrayEditor} from "./Basic/ui.js";
import { register_global_ui , show_global_ui , confirm, playerChooser } from "./Basic/UniversalUI.js";
import * as logger from "./Basic/Logger.js";
import { get_player_by_id, get_player_name } from "./Basic/Player.js";

var white_words = [];

event.register_mc_event(true , "chatSend" , undefined , beforeChatSend);
event.connect_custom_event("world_load",function(_things){
    white_words = tool.to_array(tool.parse_json(data.get_data("white_words")), []);

    if(has_system("manager")){
      get_system("manager").register_manager_bar_btn({
        text : "聊天屏蔽设置",
        icon: ui_icon.mute,
        func : (op) => {
          blockChatBar(op.player);
        }
      });
    }

    //注册设置
    if(has_system("setting")){
      get_system("setting").register_setting("chat","聊天设置",settingBar);
      get_system("setting").register_setting("white","聊天过滤词设置",editWhiteWords);
      get_system("setting").register_setting("custom_chat","自定义聊天室",chatByBoardBar);
    }
    
    logger.log(0,1,"————聊天系统已加载————");
});

event.connect_custom_event("player_join" , (options) => {
    player.talk = {
      mode: 0,
      id: "",
    };
});
//注册命令
command.register_command("usf" , (player , args) => {
    chat(version_text, [player]);
});
command.register_mc_command({
  description : "设置玩家的聊天头衔",
  permissionLevel : 1,
  name : "usf:nametag",
  mandatoryParameters : [{
    name : "Player",
    type : "PlayerSelector"
  }],
  optionalParameters : [{
    name : "Prefix",
    type : "String"
  }],
},(origin,args) => {
    if(args.length === 1){
      const player = args[0];
      set_chat_tag(player);
    }
    if(args.length === 2){
      const player = args[0];
      const tag = args[1];
      set_chat_tag(player,tag);
    }
});

text.register_symbol(false,"list",true,"玩家列表",(_player) => {
    let list = "";
    for(let player of get_all_players()){
      list += get_player_name(player);
    }
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
    
    let sender_name = get_player_name(sender);
    
    format = tran_text(sender, format);
    format = format.replaceAll("/text", message);
    format = format.replaceAll("/sender", sender_name);

    event.cancel = true;

    if (get_left_time(sender) > 0) {
        say_stop_talk(sender);
        return;
    }

    var goals = get_chat_players();

    switch (sender.talk.mode) {
        case 0:
        break;
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
        case 2:
          const group = get_system("group").get_group(sender.talk.goal);
          if (get_system("group").is_group_valid(group) && get_system("group").get_group_level(sender , group) > 0) {
            t = [];
            for (let p_id of group.member) {
              t.push(get_player_by_id(p_id));
            }
            t.push(get_player_by_id(group.creater));
            tool.array_clear(t, null);

            get_system("group").push_group_mess(group , mess);

            format = `[§e${group.name}§r]` + format;

          } else {
            t = [];
            chat(text.get_text("talk.public.group"), [sender]);
          }
          break;
    }

    if(config.custom_chat.able){
      const value = get_system("var").get_var("chat" , false , sender);
      if(value !== ""){
        t = [sender];
        for(let p of get_all_players()){
          if(value === get_system("var").get_var("chat" , false , p)){
            t.push(p);
          }
        }
      }
    }

    system.run(() => {
        chat(format, t, false);

        if(has_system("log")){
          get_system("log").push_log(2 , "chat" , format , "Chat");
        }
    });

}

function blockChatBar(player) {
  const ps = MediaCapabilities.get_all_players();
  const texts = [];
  const ui = new infoBar();
  ui.title = "屏蔽/禁言玩家";
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i]; //player

    let text = get_player_name(p);
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
    texts.push(`私聊-${get_player_name(p)}`)
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
      player.talk.mode = 0;
    } else {
      if (is_string(options[r.goal])) {
        player.talk.mode = 2;
        player.talk.goal = options[r.goal];
      } else {
        player.talk.mode = 1;
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

function set_chat_tag(player , tag = undefined) {
  save_data("chat_tag", (tool.is_string(tag)) ? tag : "" , player);
}

function get_chat_tag(player) {
  const tag = data.get_data("chat_tag", player);
  if (tag === "") {
    return config.chat.tag === "" ? player.dimension.name : config.chat.tag;
  }
  return tag + "§r";
}

function settingBar(player,back = false){
    const ui = new infoBar();
    ui.title = "聊天设置";
    ui.cancel = () => {
        event.emit_custom_event("setting_changed",{player : player , back : back});
    }

    ui.input("format", text.get_symbol_description() + "聊天信息格式(/sender为发送者;/text为聊天消息)", "输入内容", config.chat.format);
    ui.toggle("clear", "禁用彩色字符", tool.to_bool(config.chat.clear));
    ui.input("length", "消息长度限制(最大长度)", "长度", String(config.chat.length));
    ui.input("tag", "玩家默认头衔(无则显示为维度)", "输入头衔", config.chat.tag);
    ui.toggle("disable", "§e强行禁用USF聊天系统§r(+命令仍能使用)", tool.to_bool(config.chat.disable));

    

    ui.show(player,(r) => {
        config.chat.format = r.format;
        config.chat.clear = r.clear;
        config.chat.length = tool.to_number(tool.parse_number(r.length),1024);
        config.chat.tag = r.tag;
        config.chat.disable = r.disable;
        save_config();
        event.emit_custom_event("setting_changed",{player : player , back : back});
    });
}

function chatByBoardBar(player) {
  var ui = new infoBar();
  ui.cancel = () => {;
    event.emit_custom_event("setting_changed",{player : player , back : back});
  }
  ui.title = "自定义聊天室";
  ui.toggle("able", "自定义聊天室\n启用后会根据玩家的自定义变量chat的值进行分类\n变量值相同的人进行单独群聊\n[禁用|启用]", config.custom_chat.able);
  ui.show(player, (r) => {
    config.custom_chat.able = r.able;
    save_config();
    event.emit_custom_event("setting_changed",{player : player , back : back});
  })
}

function save_white_words(){
	data.save_data("white_words", tool.to_json(white_words));
}

function editWhiteWords(player,back = false){
	confirm(player, [
        "提醒：每行输入一个白名单词，若聊天信息中包含任意一个词，usf将不处理此消息，可用于兼容其他模组的指令系统",
        "点击下方确认按钮前往编辑"
      ], (r) => {
        if (r) {
          const editor = new arrayEditor();
          editor.back = () => {
            save_white_words();
            event.emit_custom_event("setting_changed",{player : player , back : back});
          }
          editor.edit(player, white_words);
        } else {
          event.emit_custom_event("setting_changed",{player : player , back : back});
        }
      });
}

register_global_ui("chat_setting" , setChatBar);
register_system("chat" , {});

event.connect_custom_event("export" , ()=> {
	exported_datas.push({
		description : "聊天信息过滤词",
		id : "white_words",
		data : tool.to_json(white_words),
	});
});
event.connect_custom_event("import" , (data_set)=> {
	if(data_set.id !== "white_words"){return;}
	white_words = tool.to_array(tool.parse_json(data_set.data));
	save_white_words();
});