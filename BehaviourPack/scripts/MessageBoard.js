import * as event from "./Basic/Event.js";
import * as mc from "./Basic/Mc.js";
import * as tool from "./Basic/Tool.js";
import { save_data , get_data , ui_icon } from "./Basic/Data.js";
import { get_name_by_id , get_id, get_player_name } from "./Basic/Player.js";
import { get_op_level } from "./Basic/Permission.js";
import { get_text, push_text } from "./Basic/Text.js";
import { config , save_config ,has_system , get_system } from "./Basic/Core.js";
import {  confirm , tip } from "./Basic/UniversalUI.js";
import { infoBar , btnBar } from "./Basic/ui.js";
import * as logger from "./Basic/Logger.js";

/*
MessageBoard.js
功能：留言板
*/

event.connect_custom_event("world_load",(things) => {
    //注册设置
    if(has_system("setting")){
      get_system("setting").register_setting("message_board","留言板设置",settingBar);
    }

    logger.log(0,1,"————留言板已加载————");
});

event.register_mc_event(true , "playerInteractWithBlock" , undefined , (event) => {
    const player = event.player;
    if (tool.to_number(player.last_in, 0) + 20 < ScrollTimeline.get_current_ticks()) {
        player.last_in = mc.get_current_ticks;
        const block = event.block;
        const item = event.itemStack;
        if(block.typeId === "minecraft:lectern") {
            let com = block.getComponent("minecraft:inventory").container;
            let b_item = com.getItem(0);
            if (!tool.un(item) && tool.un(b_item)) {
                if (item.typeId === "minecraft:enchanted_book") {
                    event.cancel = true;
                    mc.run(() => {
                        if (tool.un(b_item)) {
                            player.slots.setItem(player.selectedSlotIndex);
                            save_data("creater", get_id(player), item);
                            com.setItem(0, item);
                        }
                    });
                    return;
                }
            }

            if (!tool.un(b_item)) {
                if (b_item.typeId === "minecraft:enchanted_book") {
                event.cancel = true;
                system.run(() => {
                    chatBoardBar(player, block, get_data("creater", b_item))
                });
                }
            }
        }
    }
});

function chatBoardBar(player, block, creator) {
  if (!config.other.chat_board) {
    mc.chat(get_text("board.diable"), [player]);
    return;
  }

  const container = block.getComponent("minecraft:inventory").container;
  const item = container.getItem(0);

  const content = tool.to_array(tool.parse_json(get_data("content", item)));
  const is_owner = get_id(player) === creator;

  const ui = new btnBar();
  ui.body = content;
  ui.title = get_text("board");

  ui.btns = [{
    text: "添加留言",
    icon: ui_icon.edit,
    func: () => {
      const ui2 = new infoBar();
      ui2.title = get_text("board.new");
      ui2.input("text", get_text("board.content"), get_text("input"), "");

      ui2.cancel = () => {
        chatBoardBar(player, block, creator);
      };

      ui2.show(player, (r) => {
        let text = config.chat.format;
        text = tran_text(player, text)
          .replaceAll("/sender", get_player_name(player))
          .replaceAll("/text", r.text);
        
        if (text.length > config.chat.length) {
            text = text.slice(0, config.chat.length);
            text += "...";
        }

        content.push(text);
        if (content.length > 100) {
          content.shift();
        }

        save_data("content", tool.to_json(content), item);
        container.setItem(0, item);

        chatBoardBar(player, block, creator);
      });
    }
  }];

  if (is_owner || get_op_level(player) > 0) {
    ui.btns.push({
      text: "清空留言板",
      icon: ui_icon.rubbish,
      func: () => {
        confirm(player , "确定要清空所有留言吗？\n此操作不可恢复！" , (r) => {
            if(r){
                save_data("content", tool.to_json([]), item);
                container.setItem(0, item);
                chatBoardBar(player, block, creator);
            }else{
                chatBoardBar(player, block, creator);
            }
        });
      }
    });
  }

  ui.show(player);
}

function settingBar(player,back = false){
    const ui = new infoBar();
    ui.title = "留言板设置";
    ui.cancel = () => {
        event.emit_custom_event("setting_changed",{player : player , back : back});
    }
    ui.toggle("chat_board", "留言板[禁用 | 启用]\n启用后，将任一附魔书放置在讲台上即可启用留言板\n留言板内容存储在附魔书内", config.other.chat_board);

    ui.show(player,(r) => {
        config.other.chat_board = r.chat_board;
        save_config();
        event.emit_custom_event("setting_changed",{player : player , back : back});
    });
}