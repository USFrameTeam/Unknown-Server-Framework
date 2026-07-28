import { infoBar } from "./Basic/ui.js";
import { format , get_text } from "./Basic/Text.js";
import * as mc from "./Basic/Mc.js";
import { show_global_ui ,register_global_ui } from "./Basic/UniversalUI.js";
import * as tool from "./Basic/Tool.js";
import * as event from "./Basic/Event.js";
import { save_player_info } from "./Basic/Player.js";

/*ViewFollow.js
作用：视角跟踪
*/

event.connect_custom_event("usf_manager_bar_showed",(things)=>{
    const player = things.player;
    if (is_object(player.follow)) {
        reset_player_follow(player);
    }
});

event.register_mc_event(false,"playerSpawn",undefined,(event)=>{
    const player = event.player;
    if (is_object(player.info.follow)) {
      reset_player_follow(player);
    }
})

var follow_index = 0;
event.connect_custom_event("world_load",()=>{
    mc.run_interval(() => {
        follow_index = (follow_index + 1) % 37;
        const need_tp = (follow_index === 0);

        const players = mc.get_all_players();
        for (const player of players) {
            if (!tool.is_object(player.follow)) continue;

            const target_player = player.follow.player;

            if (tool.un(target_player) || !target_player.isValid) {
                reset_player_follow(player);
                return;
            }

            player.addEffect("night_vision", 600);

            const target_di = target_player.dimension;
            const camera_ease_options = { easeTime: 0.2 };

            switch (player.follow.type) {
            case 0:
                const head_location = target_player.getHeadLocation();
                const view_direction = target_player.getViewDirection();
                const camera_location = {
                x: head_location.x - view_direction.x * 3,
                y: head_location.y + 4,
                z: head_location.z - view_direction.z * 3
                };

                if (need_tp) {
                    mc.tp_entity(player, target_di , camera_location.x, -10000, camera_location.z);
                }

                player.camera.setCamera("usf:example_player_effects", {
                location: camera_location,
                facingEntity: target_player,
                easeOptions: camera_ease_options,
                });
                break;

            case 1:
                const player_location = player.location;
                const camera_location = {
                x: player_location.x,
                y: player_location.y - (-10000),
                z: player_location.z
                };

                if (need_tp && player.dimension.id !== target_di.id) {
                const target_location = target_player.location;
                mc.tp_entity(
                    player,
                    target_di,
                    target_location.x,
                    -10000 + target_location.y,
                    target_location.z,
                );
                }

                player.camera.setCamera("usf:example_player_effects", {
                location: camera_location,
                rotation: player.getRotation(),
                easeOptions: cameraEaseOptions
                });
                break;
            
            case 2: {
                if (need_tp && player.dimension.id !== target_di.id) { // 同步维度
                player.runCommand(`titleraw @s actionbar {"rawtext":[{"text":"同步 ${target_player.name} 维度 : ${target_di.id.replace(/^minecraft:/, "")}"}]}`);
                player.runCommand(`execute in ${target_di.id.replace(/^minecraft:/, "")} run tp @s ~ ~ ~`);
                }

                world.getDimension("minecraft:overworld").runCommand(`execute as "${target_player.name}" at @s run camera "${player.name}" set minecraft:free ease 0.5 linear pos ^1.1 ^1.6 ^-2.2 rot ~ ~10`);
                const target_head_location = target_player.getHeadLocation()
                player.onScreenDisplay.setActionBar(`§b视角跟踪 ${target_player.name} 中...§r\n§l§aX§r:§a${~~target_head_location.x}§r, §l§bY§r:§b${~~target_head_location.y}§r, §l§eZ§r:§e${~~target_head_location.z}§r`)
                break;
            }
            }
        }
    }, 4);
});

function followBar(player , _options) {
    let text = get_text("follow.tip");
    const ui = new infoBar();

    let players = mc.get_all_players();
    let names = [];
    for (var i = 0; i < players.length; i++) {
        names.push(players[i].name);
    }

    ui.title = "跟踪视角";
    ui.cancel = () => {
        show_global_ui("manager",player);
    }
    ui.options("index", text + "\n选择玩家", names, 0);
    ui.options("mode", "选择跟踪模式", ["第一视角", "自由视角", "越肩视角"], 0);
    ui.show(player, (r) => {
        player.camera.fade({
            fadeColor: {
                blue: 0,
                green: 0,
                red: 0
            },
            fadeTime: {
                fadeInTime: 0.4,
                fadeOutTime: 0.4,
                holdTime: 0.2
            }
        });
        mc.run_timeout(() => {
        var location = players[r.index].location;
        if (r.mode === 0) {
            mc.tp_entity(player,players[r.index].dimension, location.x, -10000, location.z,{});
        } else if (r.mode === 1) {
            mc.tp_entity(player, players[r.index].dimension, location.x, -10000 + location.y, location.z,{});
        }

        player.follow = {
            type: r.mode,
            player: players[r.index],
            pos: player.location,
        }

        player.info.follow = {
            di: player.dimension.id,
            x: player.location.x,
            y: player.location.y,
            z: player.location.z,
            mode: mc.get_game_mode(player),
        }
        save_player_info(player);

        mc.set_game_mode(player, 3);

        location.y += 2
        player.camera.setCamera("usf:example_player_effects", {
            location: location,
            easeOptions: {
            easeType: "Linear",
            easeTime: 0.1
            }
        })
        }, 8);
    })
}

export function reset_player_follow(player) {
  delete player.follow;
  player.camera.fade({
    fadeColor: {
      blue: 0,
      green: 0,
      red: 0
    },
    fadeTime: {
      fadeInTime: 0.4,
      fadeOutTime: 0.4,
      holdTime: 0.2
    }
  });
  system.runTimeout(() => {
    player.camera.clear()
  }, 8);
  if (tool.is_object(player.info.follow)) {
    var follow = player.info.follow;
    mc.tp_entity(player, mc.get_di(follow.di), follow.x, follow.y, follow.z);
    mc.set_game_mode(player, player.info.follow.mode);
    delete player.info.follow;
    save_player_info(player);
  }
}

register_global_ui("follow",followBar);