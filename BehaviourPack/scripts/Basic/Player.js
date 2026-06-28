import * as data from "./Data.js";
import * as tool from "./Tool.js"

var last_id = Date.now();

export function get_id(player) {
    if (!tool.is_string(player.usf_id)) {
        const id = tool.get_data("id", player);
        if (id === "") {
            const new_id = String(last_id);
            data.save_data("id", new_id, player);
            last_id++;
            player.usf_id = new_id;
        }
        else {
            player.usf_id = id;
        }
    }
  return player.usf_id;
}