import * as event from "./Basic/Event.js";
import * as tool from "./Basic/Tool.js";
import { ui_icon , get_data , save_data , pictures} from "./Basic/Data.js";
import * as command from "./Command.js";
import * as mc from "./Basic/Mc.js";
import { config , dimensions , has_system ,get_system , save_config} from "./Basic/Core.js";
import { tpWithAnimation } from "./Basic/TpAni.js";
import { btnBar , infoBar , add_pictures_choice} from "./Basic/ui.js";
import { playerChooser , confirm , tip , register_global_ui} from "./Basic/UniversalUI.js";
import { get_name_by_id , get_id , get_op_level , is_in_manager_mode} from "./Basic/Player.js";
import { get_text , push_text , format ,pictures , tran_text } from "./Basic/Text.js";
import * as logger from "./Basic/Logger.js";

/*Pos.js
功能：传送系统
类型：个人传送点、世界传送点、公共传送点、分享传送点、群组传送点
*/

var public_pos = [];
var share_pos = [];
var world_pos = [];

event.connect_custom_event("world_load",(things) => {
    public_pos = tool.to_array(tool.parse_json(get_data("public_pos")), []);
    world_pos = tool.to_array(tool.parse_json(get_data("world_pos")), []);

    //注册设置
    if(has_system("system")){
      get_system("setting").register_setting("pos","传送系统设置",settingBar);
    }

    logger.log(0,1,"————传送系统已加载————");
});

event.connect_custom_event("player_join",(things) => {
    const player = things.player;
    player.pos = get_player_pos(player);
});

function save_public_pos() {
  const valid_pos = public_pos.filter((pos) => {return tool.is_string(pos.name);});
  save_data("public_pos", tool.to_json(valid_pos));
  public_pos = valid_pos;
}

function save_world_pos() {
  save_data("world_pos", tool.to_json(world_pos));
}

command.register_command("home",(args) => {
    const homes = player.pos.filter((pos) => {return tool.to_bool(pos.home,false);});
    if (homes.length === 0) {
        chat(get_text("home.none"), [player]);
        return;
    }

    if (homes.length === 1) {
        tp_by_pos_system(player, homes[0]);
        chat(get_text("home.back"), [player]);
    } else {
    const ui = new btnBar();
    ui.title = get_text("home.select");
    ui.body = get_text("home.select2");
    ui.busy = null;

    ui.btns = homes.map(pos => ({
        text: `[${get_di(pos.di).name}]${pos.name}`,
        icon: pictures[pos.icon],
        op: { "pos": pos },
        func: (op) => {
        to_pos(player, op.pos);
        chat(get_text("home.back"), [player]);
        }
    }));

    ui.show(player);
    }
});

function tp_by_pos_system(player, pos) {
    if (Date.now() - player.last_tp < config.tp.down * 1000) {
        tip(player, "传送功能冷却中...请稍后尝试！", "");
        return;
    }

    if(config.tp.animation){
        tpWithAnimation(player,
        { x: pos.x, y: pos.y, z: pos.z },
        mc.get_di(pos.di),
        () => {
        player.last_tp = Date.now();
        }
        );
    }else{
        mc.tp_entity(player,mc.get_di(pos.di),pos.x,pos.y,pos.z,{
            show : true,
            back : true,
            log : true,
        });
    }
  
}

function get_pos_name(pos) {
  return `[${mc.get_di(pos.di).name}]${pos.name}`;
}


//若新建传送点，则应该在外部引用并传入空object，save()与back()均不会传回该object
function editPosBar(player, pos, save = function (need_delete = false) {}, back = function () { }) {
  const ui = new infoBar();
  let location_candidate = [null, null];
  let candidate_texts = ["保持位置", "当前位置"];
  ui.cancel = () => {
    back();
  };

  if (Object.keys(pos).length === 0) {
    tool.object_override(pos, {
      "owner": get_id(player),
      "di": player.dimension.id,
      "x": player.location.x,
      "y": player.location.y,
      "z": player.location.z,
      "name": "",
      "icon": null,
      "home": false,
      "top" : false,
    });
    candidate_texts[0] = "当前位置";
    ui.cancel = () => {
      pos.name = "Unknown";
      back()
    }
  }

  for (let saved_pos of player.pos) {
    location_candidate.push(p)
    candidate_texts.push(get_pos_name(saved_pos));
  }

  ui.title = "编辑传送点";
  ui.input("name", "传送点名称", "输入名称", pos.name);
  add_pictures_choice(ui, "选择传送点图标", pos.icon);
  ui.options("lo", "位置", candidate_texts, 0);
  ui.toggle("home", "设为Home(仅个人传送点有效)", pos.home);
  ui.toggle("top", "置顶", pos.home);

  ui.show(player, (r) => {

    pos.name = r.name;
    pos.icon = r.icon;
    pos.home = r.home;
    switch (r.lo) {
      case 0:
        break
      case 1:
        pos.x = player.location.x
        pos.y = player.location.y
        pos.z = player.location.z
        pos.di = player.dimension.id
        break
      default:
        pos.x = location_candidate[r.lo].x
        pos.y = location_candidate[r.lo].y
        pos.z = location_candidate[r.lo].z
        break
    }

    save();
    viewPosBar(player, pos, true, save, back)
  })
}

function pos_to_text(pos) {
  return `(${Math.round(pos.x)},${Math.round(pos.y)},${Math.round(pos.z)})`
}

/*
    options:
        editable : (若未指定，则根据是否为创建者判断) 是否可编辑、删除
        shareable : false 是否可分享
*/
function viewPosBar(player, pos, options = {} , save = function (need_delete = false) { }, back = function () { }) {
    options = tool.to_object(options,{});
    
    const ui = new btnBar();
    ui.title = `传送点 - ${pos.name}`;
    ui.cancel = () => {
        back();
    }
    ui.body = [
        "§b传送点§r: " + pos.name,
        `§b创建者§r: ${get_name_by_id(pos.owner)}`,
        `§a所在维度§r: ${get_di(pos.di).name}`,
        `§a所在坐标§r: ${pos_to_text(pos)}`,
    ];

    ui.btns = [{
        text: "传送",
        icon: ui_icon.go,
        func: () => {
        tp_by_pos_system(player, pos);
        }
    }];

    if (config.tp.share && (tool.to_bool(options.shareable,false) || get_id(player) === pos.owner)) {
        ui.btns.push({
        text: "分享",
        icon: ui_icon.share,
        func: () => {
            sharePosBar(player, pos);
        }
        });
    }
    if (tool.to_bool(options.editable,false) || get_id(player) === pos.owner) {
        ui.btns = ui.btns.concat([{
            text: "编辑",
            icon: ui_icon.edit,
            func: () => {
                editPosBar(player, pos, save, back)
            }
        },
        {
            text: "删除",
            icon: ui_icon.delete,
            func: () => {
                confirm(player, `确认删除传送点"${pos.name}"吗？`, (result) => {
                    if (result) {
                        save()
                        back()
                    } 
                    else {
                        back();
                    }
                })
            }
        }
    ])
    }
    ui.show(player);
}

function save_player_pos(player) {
    save_data("pos", tool.to_json(player.pos), player)
}

/*funcs : 
save
cancel , options(传送点options) , addable : true可否加 , max :最大数量
*/
function typedPosBar(player, title , pos_set , page = 0 , funcs = {}) {
    const max_count = tool.to_number(funcs.max , 30);
    const per_page_count = 50;

    const start_index = page * per_page_count;
    const end_index = Math.min(start_index + per_page_count,pos_set.length);
    const total_pages = Math.max(1, Math.ceil(displayPos.length / PAGE_SIZE));

    if(start_index >= end_index && page !== 0){
        worldPosBar(player, 0);
        return;
    }

    const ui = new btnBar();
    ui.title = title + ` (${page + 1}/${total_pages}页)}`;
    ui.cancel = funcs.cancel;

    push_text("type_pos_body","添加传送点时记得加上图标哦∽\n§b总共记录 §a([0]/[1])§b 个传送点")
    ui.body = format(get_text("type_pos_body"),[pos_set.length,max_count]);

    if (page === 0 && pos_set.length < max_count && tool.to_bool(funcs.addable,true)) {
        ui.btns.push({
        text: "添加传送点",
        icon: ui_icon.add,
        func: () => {
            let new_pos = {};
            editPosBar(player,new_pos,(need_delete) => {
                if(!need_delete){
                    pos_set.push(new_pos);
                    funcs.save();
                }
            },()=>{
                typedPosBar(player, title , pos_set , page, funcs);
            });
        }
        });
    }

    if(total_pages > 1){
        ui.btns.push({
            text : "跳转页面",
            icon : ui_icon.go,
            func : () => {
                const jump_ui = new infoBar();
                jump_ui.title = "跳转至页面";
                jump_ui.cancel = () =>{
                    typedPosBar(player, title , pos_set , page, funcs);
                }
                jump_ui.range("new_page" , "选择要跳转的页面" , 1 , total_pages , 1 , page);
                jump_ui.show(player,(r) => {
                    const new_page = Math.max(0,Math.min(total_pages,Math.round(r.new_page)));
                    typedPosBar(player, title , pos_set , new_page, funcs);
                })
            }
        })
    }
    

    // 遍历显示数组
    for (let i = start_index; i < end_index; i++) {
        const pos = pos_set[i];
        ui.btns.push({
        text: `[${mc.get_di(pos.di).name}]${pos.name}`,
        icon: pictures[pos.icon],
        op: { "pos": pos },
        func: (op) => {
            viewPosBar(player,op.pos,funcs.options,(need_delete) => {
                if(need_delete){
                    pos_set.splice(pos_set.indexOf(pos),1);
                }
                funcs.save();
            },() => {
                typedPosBar(player, title , pos_set , page, funcs);
            });
        }
        });
    }

    // 添加上一页按钮
    if (page > 0) {
        ui.btns.push({
        text: "上一页",
        icon: ui_icon.back,
        func: () => {
            typedPosBar(player, title , pos_set , page - 1, funcs);
        }
        })
    }
    if (end_index < pos_set.length) {
        ui.btns.push({
        text: "下一页",
        icon: ui_icon.right,
        func: () => {
            typedPosBar(player, title , pos_set , page + 1, funcs);
        }
        });
    }

    if(ui.btns.length === 0){
        ui.btns.push({
            text : "返回上一级",
            icon : ui_icon.back,
            func : () => {
                funcs.cancel();
            }
        })
    }

    ui.show(player)
}

function personalPosBar(player, manage_goal) {
    let pos_set = player.pos;
    let options = {};
    let goal = player;
    if(!tool.un(manage_goal)){
        pos_set = manage_goal.pos_set;
        options = {editable : true , shareable :true};
        goal = manage_goal;
    }
    typedPosBar(player,"个人传送点",pos_set,0,{
        cancel : () => {
            posBar(player);
        },
        save : () => {
            save_player_pos(goal);
        },
        addable : true,
        options : options,
        max : config.tp.per_conut,
    });
}

function worldPosBar(player) {
    let options = {editable : config.tp.world_edit , shareable : true};
    if(is_in_manager_mode(player)){
        options = {
            editable : true,
            shareable : true,
        }
    }
    typedPosBar(player,"世界传送点",world_pos,0,{
        cancel : () => {
            posBar(player);
        },
        save : () => {
            save_world_pos();
        },
        addable : true,
        options : options,
        max : config.tp.world_conut,
    });
}

function sharePosBar(player, pos) {
  const ui = new infoBar();
  ui.title = "分享坐标点";
  ui.range("time", "分享时间/秒", 10, 600, 10, 300);
  ui.options("p", "分享玩家", ["所有玩家", "部分玩家"], 0);
  ui.show(player, (r) => {
    let p = {
      ...pos
    }
    p.time = Date.now() + r.time * 1000;
    switch (r.p) {
      case 0:
        let list = [];
        for (let pl of mc.get_all_players()) {
          list.push(get_id(pl))
        }
        p.list = list
        break
      case 1:
        let list = []
        choosePlayer(player, mc.get_all_players(), (ps) => {
          for (let pl of ps) {
            list.push(get_id(pl))
          }
        })
        p.list = list
        break
    }
    share_pos.push(p);
  })
}

function get_random_tp_range() {
  return tool.random_int(config.tp.random_range * 2) - config.tp.random_range
}

function random_tp(player, now) {
  const id = mc.tp_entity(player, player.dimension, player.location.x + get_random_tp_range(), 400, player.location.z + get_random_tp_range(),{
    show : true
  })
  mc.run_interval(() => {
    let lo = player.location
    let block = mc.get_block(player.dimension, {
      x: lo.x,
      y: 64,
      z: lo.z
    })
    if (!un(block)) {
      for (let i = 100; i > player.dimension.heightRange.min; i--) {
        lo.y = i
        let b = mc.get_block(player.dimension, lo)
        if (!un(b)) {
          if (!b.isAir) {
            b = mc.get_block(player.dimension, {
              x: lo.x,
              y: lo.y + 2,
              z: lo.z
            })
            if (!un(b)) {
              if (b.isAir) {
                b = mc.get_block(player.dimension, {
                  x: lo.x,
                  y: lo.y + 1,
                  z: lo.z
                })
                if (!un(b)) {
                  if (b.isAir) {
                    break
                  }
                }
              }
            }
          }
        }
      }
      mc.tp_entity(player,player.dimension, lo.x, lo.y + 1, lo.z);
      mc.clear_job(id);
    }
  }, 10);
  player.last_tp = now;
}

function posBar(player , _things = {}) {
  let now = Date.now()
  let ui = new btnBar();
  ui.title = "传送系统";
  push_text("pos_bar_text","此处保存您的所有传送点/n您可以编辑、修改、分享传送点")
  ui.body = tran_text(player );

  for (let pos of public_pos) {
    const options = {editable : false , shareable : true};
    if(get_op_level(player) > 0){
      options.editable = true;
    }
    ui.btns.push({
      text: `[公共]${pos.name}`,
      icon: pictures[pos.icon],
      op: {
        "pos": pos
      },
      func: (op) => {
        viewPosBar(player,op.pos,options,(need_delete) => {
          if(need_delete){
            public_pos.splice(public_pos.indexOf(pos),1);
          }
          save_public_pos();
        },() => {posBar(player);})
      }
    })
  }

  for (let pos of share_pos) {
    if (now > pos.time || !tool.is_number(pos.time) || !tool.is_string(pos.name)) {
      delete share_pos[pos]
    } else {
      if (tool.array_has(pos.list, get_id(player))) {
        ui.btns.push({
          text: `[分享][${get_di(pos.di).name}]${pos.name}\n剩余时间:${-Math.round((now - pos.time) / 1000)}s`,
          icon: pictures[pos.icon],
          op: {
            "pos": pos
          },
          func: (op) => {
            const ui2 = new btnBar();
            ui2.cancel = () => {
              posBar(player);
            }
            viewPosBar(player, op.pos,{editable : false , shareable : false},undefined,() => {posBar(player);})
          }
        })
      }

    }
  }

  if (config.tp.pp) {
    ui.btns.push({
      text: "传送玩家",
      icon: ui_icon.heart,
      func: () => {
        tpPlayerBar(player);
      }
    })
  }
  if (config.tp.die && !un(player.last_die) && now - player.last_tp > config.tp.down * 1000) {
    let die = player.last_die;
    ui.btns.push({
      text: "返回死亡点",
      icon: ui_icon.die,
      func: () => {
        mc.tp_entity(player, die.di, die.x, die.y, die.z, {show:true});
      }
    })
  }
  if (config.tp.back && is_array(player.back_pos)) {
    ui.btns.push({
      text: "返回上一位置",
      icon: ui_icon.back,
      func: () => {
        mc.tp_entity(player, player.back_pos[0], player.back_pos[1], player.back_pos[2], player.back_pos[3], {show : true});
        player.back_pos = "";
      }
    })
  }

  if (config.tp.per && config.tp.per_count > 0) {
    ui.btns.push({
      text: "个人传送点",
      icon: ui_icon.player,
      func: () => {
        personalPosBar(player, player);
      }
    })
  }

  if (config.tp.world) {
    ui.btns.push({
      text: "世界公共点",
      icon: ui_icon.world,
      func: () => {
        worldPosBar(player);
      }
    })
  }
  
  if (config.tp.group && has_system("group")) {
    ui.btns.push({
      text: "群组公共点",
      icon: ui_icon.group,
      func: () => {
        //TODO
      }
    })
  }

  if ((config.tp.random_range > 0 && now - player.last_tp > config.tp.down * 1000) && (player.dimension.id !== "minecraft:the_end" || config.tp.random_end === true)) {
    ui.btns.push({
      text: "随机传送",
      icon: ui_icon.compass,
      func: () => {
        random_tp(player, now);
      }
    })
  }

  if (get_op_level(player) > 0) {
    ui.btns.push({
      text: "添加公共传送点",
      icon: ui_icon.add,
      func: () => {
        const pos = {};
        editPosBar(player, pos, (need_delete) => {
          if(need_delete){return;}
          public_pos.push(pos);
          save_public_pos();
        }, () => {
          posBar(player)
        })
      }
    });
    ui.btns.push({
      text: "管理玩家个人点",
      icon: ui_icon.edit,
      func: () => {
        playerChooser(player, mc.get_all_players() , (ps) => {
          if (ps.length > 0) {
            personalPosBar(player, ps[0])
          } else {
            personalPosBar(player, goal)
          }
        })
      }
    })
  }

  if(ui.btns.length === 0){
    mc.chat("§e[传送系统]当前无可用的传送功能!",[player]);
    return;
  }

  ui.show(player);
}

function tpPlayerBar(player) {
  const players = mc.get_all_players();
  let names = [];
  for (let i = 0; i < players.length; i++) {
    names.push(players[i].name)
  }
  const ui = new infoBar();
  ui.title = "传送玩家"
  ui.options("p", "选择玩家", names, 0)
  ui.options("mode", "方向", ["你 > 对方", "对方 > 你"], 0)
  ui.show(player, (r) => {
    let goal = players[r.p]
    push_text("tp_unknown_player","§e[传送系统]该玩家已不存在，无法发送传送申请!")
    if(!goal.isValid){
        tip(player,get_text("tp_unknown_player"),()=>{posBar(player)});
        return;
    }
    goal.tpa = {
      goal: player,
      mode: r.mode,
      time: Date.now() + 60 * 1000
    }
    chat(`§e[传送系统]玩家${player.name}向你发起传送请求\n方向：${r.mode === 0 ? "对方 > 你" : "你 > 对方"}\n一分钟内输入+tpaccept即可传送`, [goal])
    tpaRequest(goal, player, r.mode);
  })
}

function tpaRequest(goal, player, mode) {
    const ui = new btnBar();
    ui.title = "传送请求";//Teleportation Request
    ui.body = `玩家${player.name}向你发起传送请求\n方向：${mode === 0 ? "对方(other) > 你(me)" : "你(me) > 对方(other)"}`
    ui.btns = [{
        text: "同意",
        icon: ui_icon.ok,
    func: () => {
            const target = (mode === 0) ? goal : player;
            const self = (mode === 0) ? player : goal;
            if(self.isValid || target.isValid){
                try{chat("§c[传送系统]传送失败，玩家已无效!", [self]);}catch(e){}
                try{chat("§c[传送系统]传送失败，玩家已无效!", [target]);}catch(e){}
            }
            mc.tp_entity(self,target.dimension , target.location.x,target.location.y,target.location.z,{show : true});
            chat("§a[传送系统]传送至玩家成功！", [requester, goal]);
        }
    }, {
        text: "拒绝",
        icon: ui_icon.delete,
        func: () => {
        delete goal.tpa;
        chat("§e[传送系统]对方拒绝了你的传送请求！", [player])
        }
    }]
    ui.show(goal);
}

//名称、类型、创建者、维度
function searchPosBar(player){
    let di_names = ["全部"];
    for(let index = 0;index < dimensions;index ++){
      di_names.push(dimensions[index].name);
    }

    let types = [ "全部" , "公共传送点"];
    let pos_set_array = [/* 公共传送点 */];

    if(config.tp.per && tool.to_array(player.pos).length > 0){
      types.push("个人传送点");
      pos_set_array.push(player.pos);
    }
    if(config.tp.world && world_pos.length > 0){
      types.push("世界传送点");
      pos_set_array.push(world_pos);
    }
    if(config.tp.share && share_pos.length > 0){
      types.push("分享传送点");
      pos_set_array.push(share_pos);
    }
    //TODO:群组传送点

    const ui = new infoBar();
    ui.title = "搜索传送点";
    ui.cancel = () =>{
      posBar(player);
    }
    ui.input("name","传送点名称(留空则忽略此项)","请输入名称(不必完整)","");
    ui.options("type","传送点类型",types,0);
    ui.input("creator","创建者(留空则忽略此项)","请输入文本",player.name);
    ui.options("di","维度",di_names,0);
    ui.show(player,(result) =>{
      var filtered_pos = [];
      if(result.type !== 0){
        pos_set_array = [pos_set_array[result.type - 1]];
      }
      for(let pos_set of pos_set_array){
        for(let pos of pos_set){
          let allowed = true;
          if(result.name !== "" && !tool.string_has(pos.name , result.name)){
            allowed = false;
          }
          if(result.creator !== "" && !tool.string_has(pos.owner , result.creator)){
            allowed = false;
          }
          if(result.di !== 0 && dimensions[result.di - 1].id !== pos.di){
            allowed = false;
          }

          if(allowed){
            filtered_pos.push(pos);
          }
        }
      }

      searchResultBar(player , filtered_pos);
    });
}

function searchResultBar(player,filtered_types , filtered_pos){
    const ui = new btnBar();
      ui.title = "搜索结果";
      ui.cancel = () => {posBar(player);}
      ui.body = format("共有[0]个符合条件的传送点\n(该页面最多显示50个传送点)",[filtered_pos.length]);
      ui.btns = [{
        text : "重新搜索",
        icon : pictures.glass,
        func : () =>{
          searchPosBar(player);
        }
      }]

      if(filtered_pos.length > 50){
        filtered_pos = filtered_pos.slice(0,49);
      }
      for(let i=0;i < filtered_pos.length;i++){
        const pos = filtered_pos[i];
        ui.btns.push({
          text : pos.name,
          text : pos.icon,
          op : {pos : pos},
          func : (op) => {
            viewPosBar(player,op.pos,{editable : false , shareable :false},undefined,() =>{
              posBar(player);
            })
          }
        })
      }
}

function settingBar(player , back = false){
    const ui = new infoBar();
    ui.title = "传送系统设置";
    ui.cancel = () => {
      event.emit_custom_event("setting_changed",{ player : player , back : back});
    }
    ui.toggle("die", "返回死亡点[关闭 | 开启]", config.tp.die);
    ui.toggle("per", "个人传送点[关闭 | 开启]", config.tp.per);
    ui.toggle("pp", "玩家互传TPA[关闭 | 开启]", config.tp.pp);
    ui.toggle("world", "世界共享点[关闭 | 开启]", config.tp.world);
    ui.toggle("group", "群组共享点[关闭 | 开启]", config.tp.group);
    ui.toggle("back", "传送返回[关闭 | 开启]", config.tp.back);
    ui.toggle("share", "分享传送点[关闭 | 开启]", config.tp.share);
    ui.toggle("animation", "传送动画（实验性玩法）[关闭 | 开启]", config.tp.animation);
    ui.range("per_count", "个人传送点数量", 1, 55, 1, config.tp.per_count);
    ui.range("random_range", "随机传送距离(为0时不显示)", 0, 50000, 1000, config.tp.random_range);
    ui.toggle("random_end", "允许末地使用随机传送", config.tp.random_end);
    ui.range("down", "TP冷却时间/s", 0, 600, 10, config.tp.down);

    ui.show(player,(r) => {
      config.tp.animation = r.animation;
      config.tp.random_range = r.random_range;
      config.tp.random_end = r.random_end;
      config.tp.die = r.die;
      config.tp.world = r.world;
      config.tp.per = r.per;
      config.tp.share = r.share;
      config.tp.pp = r.pp;
      config.tp.per_count = r.per_count;
      config.tp.down = r.down;
      config.tp.group = r.group;
      config.tp.back = r.back;
      save_config();
      event.emit_custom_event("setting_changed",{ player : player , back : back});
    })
}

register_global_ui("pos" , posBar);