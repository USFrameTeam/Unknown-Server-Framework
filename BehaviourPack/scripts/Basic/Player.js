import * as data from "./Data.js";
import * as tool from "./Tool.js";
import * as event from "./Event.js";

var last_id = Date.now();
//id_name : { USFID : 玩家ID}
var ids = [];
var id_names = {};
var id_players = {};

event.report_custom_event("player_join");
event.report_custom_event("new_player");

event.register_mc_event(false,"worldLoad",undefined,function(event){
    id_names = tool.to_object(tool.parse_json(data.get_data("id_names")), {});
    ids = tool.to_array(tool.parse_json(data.get_data("ids")), []);
});
event.register_mc_event(false,"playerSpawn",undefined,playerSpawn);
function playerSpawn(event){
    const player = event.player;
    if (event.initialSpawn === true) {
        reset_player_data(player);
        id_names[get_id(player)] = player.name
        data.save_data("id_names", tool.to_json(id_names))
        data.save_data("ids", tool.to_json(ids));

        tool.array_clear(ids, get_id(player));
        ids.push(get_id(player));
        if (ids.length > 300) {
            ids.shift();
        }

        if (tool.un(player.info.last_time)){
            event.emit_custom_event("new_player",{"player" : player});
        }

        player.info.last_time = Date.now();
        player.info.join_times = tool.to_number(player.info.join_times, 0) + 1;
        tool.object_override(player.info, data.data_format.info);
        save_player_info(player);
    }
}

export function get_id(player) {
    if (!tool.is_string(player.usf_id)) {
        const id = data.get_data("id", player);
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

export function get_name_by_id(id) {
  if (!tool.is_string(id)){ return "离线玩家";}
  return (id_names[id] !== undefined) ? id_names[id] : "离线玩家";
}

export function reset_player_data(player) {
    const id = get_id(player);

    player.slots = player.getComponent("minecraft:inventory");
    player.health = player.getComponent("minecraft:health");
    player.info = tool.to_object(tool.parse_json(data.get_data("info", player)));

    id_players[id] = player;

    event.emit_custom_event("player_join",{"player" : player});
    return;
}

export function save_player_data(player){
    const id = get_id(player);
    if(!tool.un(id_player[id])){
        delete id_player[id];
    }
    save_player_info(player);
}

export function save_player_info(player) {
    data.save_data("info", tool.to_json(player.info), player);
}

export function get_player_by_id(id) {
  return (id_players[id] === undefined) ? null : id_players[id];
}

export function is_in_manager_mode(player){
    return tool.to_bool(player.info.manager,false);
}