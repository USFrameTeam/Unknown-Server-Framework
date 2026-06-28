import * as data from "./Data.js";
import { get_text } from "./Text.js";
import { btnBar, infoBar, arrayEditor } from "./ui.js";

//text - 显示的文本 ,choice - 当前的选项
export function add_pictures_choice(ui, text, choice = null) {
  var texts = ["无"]
  var keys = Object.keys(pictures);
  for (var k of keys) {
    texts.push(get_text("Pictures." + k));
  }
  ui.options("icon", text, texts, (keys.indexOf(choice) === -1) ? 0 : keys.indexOf(choice) + 1);
  ui.match([null].concat(Object.keys(pictures)));
}

//back既是确认框结束后调用的函数，其中传入一个bool表示是否点击了确认键
export function confirm(player, text, back = function (is_confirm) { }) {
  var ui = new btnBar()
  ui.title = "确认?"
  ui.body = text
  ui.btns = [{
    text: "确认",
    icon: data.ui_icon.ok,
    func: () => {
      back(true)
    }
  }, {
    text: "取消",
    icon: data.ui_icon.delete,
    func: () => {
      back(false)
    }
  }]
  ui.cancel = () => {
    back(false)
  }
  ui.show(player)
}