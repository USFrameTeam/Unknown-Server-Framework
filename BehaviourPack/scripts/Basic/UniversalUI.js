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

//玩家选择器
//传入: ranged_players : 可供选择的玩家的对象数组 , back(选中的玩家)
//取消后仍会执行back函数
export function playerChooser(player, ranged_players, back = function (goal_players) { }) {
  if (ranged_players.length === 0) {
    back([]);
    return;
  }
  let ui = new infoBar()
  ui.title = "玩家选择器"
  for (var p of ranged_players) {
    ui.toggle("results", p.name, false)
  }

  ui.show(player, (r) => {
    if (!is_array(r.results)) {
      r.results = [r.results] //只有一个目标时转为数组
    }

    var goal_players = []
    for (var i = 0; i < r.results.length; i++) {
      if (r.results[i]) {
        goal_players.push(ranged_players[i])
      }
    }
    back(goal_players)
  })
}