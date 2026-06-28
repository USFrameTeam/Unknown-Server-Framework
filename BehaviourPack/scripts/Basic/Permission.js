import * as data from "./Data.js";
import { get_id } from "./Player.js";
import * as tool from "./Tool.js";

export var has_owner = false;
var owners = [];
var ops = [];

//在reload_all 里面get_owners()

export function get_owners() {
    const _owners = tool.to_array(tool.parse_json(data.get_data("owners")));
    if(_owners.length > 0){ has_owner = true; }
    owners = _owners;
    return _owners;
}

export function is_owner(player) {
  if (!tool.is_object(player)){ return false; }
  const id = get_id(player);

  return tool.array_has(owners,id)
}

export function reset_owners(){
  save_data("owners", "");
}

export function is_op(player) {
  if (!tool.is_player(player)){ return false; }
  const id = get_id(player);
  return ops.includes(id);
}

export function get_op_level(player) {
  if (!tool.is_player(player)){ return 0;}

  if (is_owner(player)) {
    return 2;
  }

  if (is_op(player)) {
    return 1;
  }

  return 0;
}

export function load_ops(){
  ops = tool.to_array(tool.parse_json(data.get_data("op")), []);
}

export function save_ops() {
  data.save_data("op", to_json(ops))
}