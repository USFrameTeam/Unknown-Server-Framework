import * as event from "./Basic/Event.js";
import { ui_icon , get_data } from "./Basic/Data.js";
import { btnBar , infoBar } from "./Basic/ui.js";
import * as mc from "./Basic/Mc.js";
import * as tool from "./Basic/Tool.js";
import { get_text } from "./Basic/Text.js";
import { get_system } from "./Basic/Core.js";

/*FloatText.js
功能：悬浮字
*/

event.register_mc_event(false,"entityDie",{entityTypes : ["minecraft:bat"]},(event) => {
    const entity = event.entity;
    if (entity.hasTag("Float")) {
        const bat = entity.dimension.spawnEntity("minecraft:bat", entity.location, {
        spawnEvent : "usf:text"
        }
        );

        const text_data = {
          "lo": get_data("lo", entity),
          "name": get_data("name", entity),
          "text": get_data("text", entity)
        };

        for (let key in text_data) {
            save_data(key, text_data[key], bat);
        }

        if (!bat.hasTag("Float")) {
          bat.addTag("Float");
        }
    }
});

function managerFloat(player) {
  const ui = new btnBar()
  ui.title = "管理悬浮字";
  ui.body = [
    "管理32格内的悬浮字",
    "悬浮字本质是蝙蝠，为防止误杀悬浮字，kill悬浮字后会重新生成",
    "你可以去除悬浮字的Float标签，这样悬浮字即可被kill",
    "例如§e/tag @e[type=bat] remove Float§r命令可以使所有悬浮字都能被kill"
  ];

  const options = {
    location: player.location,
    maxDistance: 32,
    type: "bat",
    tags: ["Float"]
  }
  for (let bat of player.dimension.getEntities(options)) {
    ui.btns.push({
      text: `${get_data("name", bat)}`,
      op: {
        bat: bat
      },
      func: (op) => {
        editFloat(player, op.bat, false);
      }
    });
  }

  ui.btns.push({
    text: "添加悬浮字",
    icon: ui_icon.add,
    func: () => {
      const bat = player.dimension.spawnEntity("minecraft:bat", player.location, {
      spawnEvent : "usf:text"
      }
      );
      editFloat(player, bat, true);
    }
  });
  ui.show(player); 
}

function editFloat(player, bat, first) {
  let text = get_data("text", bat);
  let name = get_data("name", bat);

  const ui = new infoBar();
  ui.title = "编辑悬浮字";
  ui.cancel = () => {
    if (first) {
      bat.remove()
    }
    managerFloat(player);
  }
  ui.busy = () => {
    bat.remove();
  }
  ui.input("name", "悬浮字备注(用于管理)", "输入备注", name);
  ui.input("text", get_text("tran_text_") + "\n内容", "输入内容", text);
  ui.input("x", "X坐标", "输入坐标", String(bat.location.x.toFixed(2)));
  ui.input("y", "Y坐标", "输入坐标", String(bat.location.y.toFixed(2)));
  ui.input("z", "Z坐标", "输入坐标", String(bat.location.z.toFixed(2)));
  ui.toggle("de", "删除", false);
  ui.show(player, (r) => {
    if (r.de) {
      bat.remove()
    } else {
      let loc = {
        di: bat.dimension.id
      }
      loc.x = to_number(parseFloat(r.x), bat.location.x)
      loc.y = to_number(parseFloat(r.y), bat.location.y)
      loc.z = to_number(parseFloat(r.z), bat.location.z)

      save_data("lo", to_json(loc), bat)
      save_data("name", r.name, bat)
      save_data("text", r.text, bat)
      if (!bat.hasTag("Float")) {
        bat.addTag("Float");
      }
    }
    managerFloat(player);
  })
}

event.connect_custom_event("world_load",(_things) => {
    mc.run_interval(refresh_texts,20);
});

function refresh_texts(){
    const condition = {
        type: "bat",
        tags: ["Float"],
    };

  for (let dimension of dimensions) {
    const bats = dimension.getEntities(condition);

    for (let bat of bats) {
      bat.nameTag = tran_text(null, get_data("text", bat));

      let location = get_data("lo", bat);
      if (location !== "") {
        location = tool.to_object(tool.parse_json(location));

        if (tool.is_string(location.di)) {
          mc.tp_entity(
            bat,
            mc.get_di(location.di),
            location.x,
            location.y,
            location.z
          );
        }
      }
    }
  }
}

get_system("manager").register_manager_bar_btn({
    text: "编辑悬浮字",
    icon: ui_icon.stop,
    func: (op) => {
      managerFloat(op.player);
    }
});