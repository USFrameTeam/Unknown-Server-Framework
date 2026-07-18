export function clear_color(text) {
  return text.replace(/§./g, "")
}

export function is_string(v) {
  return typeof (v) == "string" ? true : false
}

export function is_function(v) {
  return typeof (v) == "function" ? true : false
}

export function is_object(v) {
  return typeof (v) == "object" ? true : false
}

export function is_array(v) {
  return Array.isArray(v)
}

export function is_number(value) {
  if (typeof (value) == "number") {
    if (!isNaN(value)) {
      return true
    }
  }
  return false
}

export function is_entity(entity){
  if(is_object(entity) && is_string(entity.id)){
    return true;
  }
  return false;
}

export function is_player(player) {
  if (is_entity(player)) {
    return player.typeId === "minecraft:player";
  }
  return false;
}

export function is_bool(value) {
  if (typeof (value) == "boolean") {
    return true
  }
  return false
}

export function un(v) {
  if (v == undefined) {
    return true
  }
  return false
}

//下面是格式化函数

export function to_bool(v, none = false) {
  if (typeof (v) === "boolean") {
    return v
  }
  return none
}

export function to_number(value, none = 0) {
  if (typeof (value) == "number") {
    if (!isNaN(value)) {
      return value
    }
  }
  return none
}

export function to_string(value, none = "") {
  return typeof (value) == "string" ? value : none
}

export function to_array(value, none = []) {
  return Array.isArray(value) ? value : none
}

export function to_object(value, none = {}) {
  return typeof (value) == "object" ? value : none
}

//处理数组的工具函数

export function array_index(array, text, none = 0) {
  var index = array.indexOf(text)
  return (index >= 0) ? index : none
}

export function array_clear(array, text) {
  while (array.indexOf(text) >= 0) {
    array.splice(array.indexOf(text), 1)
  }
}

export function array_has(array, text) {
  return array.includes(text);
}

export function array_get(array , index){
  return (array.length > index) ? array[index] : array[0]
}

export function array2string(array = [], none = "", clear_color = false) {
  if (is_string(array)) {
    return array
  } else {
    if (is_array(array)) {
      var text = ""
      for (var cf of array) {
        text += "\n"
        if (clear_color) {
          text += "§r"
        }
        text += cf
      }
      return text.slice(1)
    }
  }
  return none
}

export function array2line(array){
  let text = "";
  for(let element of array){
    text += "," + String(element);
  }
  return text.slice(1);
}

//其他变量类型

export function parse_number(text, none = 0) {
  var num = parseFloat(text)
  if (Number.isNaN(num)) {
    return none
  }
  return num
}

export function string_has(str, text) {
  if (str.indexOf(text) === -1) {
    return false
  }
  return true
}

export function object_override(object, format) {
  if (!object || !format || typeof format !== 'object') return;

  const formatKeys = Object.keys(format);

  for (const cf of formatKeys) {
    const formatValue = format[cf];
    const isFormatNull = formatValue === null;
    const isFormatObject = typeof formatValue === 'object' && !isFormatNull;
    const isFormatArray = Array.isArray(formatValue);

    if (un(object[cf])) {
      if (isFormatNull) {
        object[cf] = null;
      } else if (isFormatArray) {
        object[cf] = [...formatValue];
      } else if (isFormatObject) {
        object[cf] = {};
        object_override(object[cf], formatValue);
      } else {
        object[cf] = formatValue;
      }
    }
    else if (typeof object[cf] === 'object' && !Array.isArray(object[cf]) &&
      object[cf] !== null && isFormatObject) {
      object_override(object[cf], formatValue);
    }
  }
}

//JSON相关

export function parse_json(data) {
  if (!is_string(data) || data == "") {
    return {}
  }
  try {
    data = JSON.parse(data)
  } catch (e) { }
  return to_object(data, {})
}

//to_json必须传入object
export function to_json(data) {
  if (!is_object(data)) {
    return
  }
  try {
    data = JSON.stringify(data)
  } catch (e) { }
  return to_string(data, "{}")
}

//其他数据结构

//vec => Location3
export function pos_string(vec) {
  return `(${Math.round(vec.x)},${Math.round(vec.y)},${Math.round(vec.z)})`
}

export function get_block_pos_text(block) {
  return `(${Math.round(block.x)},${Math.round(block.y)},${Math.round(block.z)})`;
}

//DimendionPosition -> string
export function dimension_pos_to_text(pos) {
  if (un(pos)) {
    return "none";
  }
  return `[${shorter_minecraft(pos.dimension.id)}](${Math.round(pos.x)},${Math.round(pos.y)},${Math.round(pos.z)})`;
}

//文本处理相关
export function cut_minecraft(text) {
  if (!is_string(text)) return "";

  return text.replaceAll("minecraft:", "");
}

export function shorter_minecraft(text) {
  if (!is_string(text)) return "";

  return text.replaceAll("minecraft:", "mc:");
}

export function get_string_length(str) {
  if (!str || str.length === 0) return 0;

  let total = 0;

  const len = str.length;

  for (let i = 0; i < len; i++) {
    const charCode = str.charCodeAt(i);

    if (charCode <= 0x007f) {
      total += 1;
    } else if (charCode <= 0x07ff) {
      total += 2;
    } else if (charCode <= 0xffff) {
      total += 3;
    } else {
      total += 4;
    }
  }

  return total;
}

//数学
export function is_between(count, c1, c2) {
  if (c1 === c2) {
    return count === c1;
  }

  const min = Math.min(c1, c2);
  const max = Math.max(c1, c2);

  return count >= min && count <= max;
}

export function random_int(max = 10) {
  return Math.floor(Math.random() * max)
}

//时间
export function get_date_now() {
  return Date.now();
}

export function get_date_object() {
  var d = new Date();
  return d;
}

export function is_same_day(d1, d2) {
  return (new Date(d1).setHours(0, 0, 0, 0) == new Date(d2).setHours(0, 0, 0, 0));
}

export function get_player_path(player) {
  if (!is_player(player)) return "Players/unknown";

  return "Players/" + player.name;
}

