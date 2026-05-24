

export function clear_colour(text) {
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
  if (array.indexOf(text) >= 0) {
    return true
  }
  return false
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