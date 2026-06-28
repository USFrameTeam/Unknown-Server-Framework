import * as data from "./Data.js";
import { get_id } from "./Player.js";

export var has_owner = false;
var owners = [];

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

  return array_has(owners,id)
}

