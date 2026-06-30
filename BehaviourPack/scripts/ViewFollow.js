import { infoBar } from "./Basic/ui.js";
import { format , get_text } from "./Basic/Text.js";
import * as mc from "./Basic/Mc.js";
import { show_global_ui } from "./Basic/UniversalUI.js";

/*ViewFollow.js
作用：视角跟踪
*/

function followBar(player) {
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
        var location = players[r.index].location
        if (r.mode === 0) {
            tp_entity(player, players[r.index].dimension, location.x, -10000, location.z, false);
        } else if (r.mode === 1) {
            tp_entity(player, players[r.index].dimension, location.x, -10000 + location.y, location.z, false);
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
            mode: get_mode(player)
        }
        save_player_info(player)

        set_mode(player, 3)

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