import * as data from "./Data.js";
import * as tool from "./Tool.js";
import * as logger from "./Logger.js";
import { get_text } from "./Text.js";
import { btnBar, infoBar, arrayEditor } from "./ui.js";

var global_ui = {};

//注册、调动全局暴露的UI
//调用时传入参数：player - 玩家 , options - 数据
export function register_global_ui(ui_id , ui_func = function(player , options){}){
    if(!tool.is_string(ui_id)){
      logger.log(2,1,"试图注册一个未知全局UI时失败");
      return;
    }
    global_ui[ui_id] = ui_func;
}

export function show_global_ui(player , ui_id , options = {}){
    if(!tool.is_string(ui_id)){return;}
    if(!tool.un(global_ui[ui_id])){
        global_ui[ui_id](player,options);
    }else{
      logger.log(2,0,"玩家[0]试图打开不存在的全局ID:[1]",[player.name,ui_id]);
    }
}

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

//显示提示
export function tip(player, text = "", back = function () { }) {
  var ui = new btnBar()
  ui.title = "提示";
  ui.body = text;
  if (tool.is_function(back)) {
    ui.cancel = back;
    ui.btns.push({
      text: "返回",
      icon: ui_icon.back,
      func: () => {
        back()
      }
    });
  }
  ui.btns.push({
    text: "关闭",
    icon: ui_icon.delete,
    func: () => {

    }
  });
  ui.show(player);
}

//可多选的选择器
//该函数返回的是选择的things的index(数组)
export function chooseBar(player,title = "选择器" , things = [], back = function (choosed_things) { }) {
  if (things.length <= 0) {
    back([]);
    return;
  }
  let ui = new infoBar();
  ui.title = title;
  for (let t = 0; t < things.length; t++) {
    ui.toggle("things", things[t], false);
  }

  ui.show(player, (r) => {
    if (!is_array(r.things)) {
      r.things = [r.things];
    }
    let result = [];
    for (let i = 0; i < r.things.length; i++) {
      if (r.things[i]) {
        result.push(i);
      }
    }
    back(result);
  })
}