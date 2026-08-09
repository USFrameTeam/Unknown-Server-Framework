import { has_system , get_system , config ,save_config, register_system } from "./Basic/Core.js";
import { data_format, get_data , pictures, save_data, ui_icon } from "./Basic/Data.js";
import * as tool from "./Basic/Tool.js";
import * as event from "./Basic/Event.js";
import { infoBar , btnBar } from "./Basic/ui.js";
import * as mc from "./Basic/Mc.js";
import { format , get_text, push_text ,register_symbol} from "./Basic/Text.js";
import { get_op_level } from "./Basic/Permission.js";
import { is_in_manager_mode , get_name_by_id , get_id} from "./Basic/Player.js";
import * as command from "./Command.js";
import { register_global_ui , confirm , tip} from "./Basic/UniversalUI.js";
import * as logger from "./Basic/Logger.js";

var groups = [];
var group_mess = {};
var loaded = false;

event.connect_custom_event("world_load",(things) => {
    //注册设置
    if(has_system("setting")){
      get_system("setting").register_setting("group","群组设置",settingBar);
    }
    groups = to_array(parse_json(get_data("group_ids")), []);
    loaded = true;

    logger.log(0,1,"————群组系统已加载————");
});

register_symbol(false , "group" , false , "转义为玩家所在群组(使用逗号间隔)" , (player) => {
    const groups = get_player_groups(player);
    const text = "";
    for(let id of groups){
      const group = get_group(id);
      text += "," + group.name;
    }
    text = text.slice(1);
    return text;
});

command.register_mc_command({
  description : "编辑群组",
  permissionLevel : 1,
  name : "usf:group_edit",
  mandatoryParameters : [
    {
    name : "Operation",
    type : "Enum",
    enumName : "GroupOperation"
  },
    {
    name : "GroupID",
    type : "String"
  }],
  optionalParameters : [{
    name : "Player",
    type : "PlayerSelector"
  },{
    name : "IsOP",
    type : "Boolean"
  }],
},(origin , args) => {
  const group = get_group(args[1]);
  if(!is_group_valid(group)){
    logger.log(2 , 1, "尝试使用命令处理领地时出错:领地[0]不存在！",[args[1]]);
    return;
  }
  switch(args[0]){
    case "add_player":
      if(args.length === 3){
        group_add_member(group , args[2]);
      }
      break;
    case "delete":
      if(args.length === 2){
        delete_group(group);
      }
      break;
    case "delete_player":
      if(args.length === 3){
        tool.array_clear(group.member , get_id(args[2]));
        tool.array_clear(group.op , get_id(args[2]));
        save_group(group);
      }
      break;
    case "set_op":
      if(args.length === 4){
        const id = get_id(args[2]);
        if(id === group.creater || (!tool.array_has(group.op , id) && !tool.array_has(group.member , id))){return;}
        tool.array_clear(group.member , id);
        tool.array_clear(group.op , id);
        if(args[3] === true){
          group.op.push(id);
        }else{
          group.member.push(id);
        }
        save_group(group);
      }
      break;
  }
});

command.register_mc_command_enum("GroupOperation",["add_player" , "delete" , "delete_player" , "set_op"]);

mc.run_interval(() => {
  const ids = Object.keys(group_mess);

  if (ids.length === 0) {
    return;
  }

  for(let id of ids){
    const group = get_group(id);
    if(is_group_valid(group)){
        const total_length = group.message.length + group_mess[id].length;
        group.message = group.message.concat(group_mess[id]).slice(Math.max(0,total_length -50));
        save_group(group);
    }
  }
  group_mess = {};
}, 20 * 30);

function push_group_mess(group , mess){
  if(message.length > 60){mess = mess.slice(0,60) + "...";}
  if (tool.is_array(group_mess[group.id])) {
    group_mess[group.id].push(mess);
  } else {
    group_mess[group.id] = [mess];
  }
}

function player_add_group(player, id) {
  const groups = tool.to_array(tool.parse_json(get_data("groups", player)));

  if (!tool.array_has(groups , id)) {
    groups.push(id);
    save_data("groups", tool.to_json(groups), player);
  }
}

function is_group_valid(group) {
  return tool.is_object(group) && Object.keys(group).length > 0;
}

function get_group(id) {
  return tool.to_object(tool.parse_json(get_data("group" + id)), {})
}

function save_group(group) {
  save_data("group" + group.id, tool.to_json(group))
  if (!tool.array_has(groups, group.id)) {
    groups.push(group.id);
    save_groups();
  }
}

function save_groups() {
  save_data("group_ids", tool.to_json(groups));
}

function get_random_group_id() {
  const min = 100000;
  const max = 999999;
  let id;

  do {
    id = Math.floor(Math.random() * (max - min + 1)) + min;
  } while (tool.array_has(groups,id));
  return id;
}

function get_player_groups(player) {
    const groups = tool.to_array(tool.parse_json(get_data("groups", player)));
    const valid_groups = [];
    for(let group_id of groups){
        let group = get_group(group_id);
        if(is_group_valid(group) && is_group_has(group , player)){
            valid_groups.push(group_id);
        }
    }

    if(groups.length !== valid_groups.length){
        save_data("groups", tool.to_json(valid_groups), player);
    }
    return valid_groups;
}

function add_invite(player, id) {
  let invites = tool.to_array(tool.parse_json(get_data("invites", player)), []);
  if (!tool.array_has(invites, id)) {
    invites.push(id);
    mc.chat("[群组系统]你收到一条群组邀请！请前往查看！", [player]);
  }
  save_data("invites", tool.to_json(invites), player);
}

function groupLookBar(player, group_id) {
    const group = get_group(group_id);
    if(!is_group_valid(group)){return;}
    const ui = new btnBar();
    push_text("group.look" , "群组 - [0]");
    ui.title = format(get_text("group.look"), [group.name]);

    let text = [
        format("群组名称:[0]" , [group.name]),
        format("群组ID:[0]" , [group.id]),
        "————————————",
        "公告:",
        group.board,
        "————————————",
        format("群组创建者:[0]" , [get_name_by_id(group.creater)]),
        format("群组管理员:[0]" , [tool.array2line(tool.to_array(group.op).map((id) => {return get_name_by_id(id);}))]),
        format("群组成员:[0]" , [tool.array2line(group.member.map((id) => {return get_name_by_id(id);}))]),
    ];

    ui.body = text;

    ui.btns.push({
        text: "历史消息",
        icon: ui_icon.key_board,
        func: () => {
        let ui2 = new btnBar();
        ui2.body = group.message;
        ui2.title = `${group.name} - 历史消息`;
        ui2.btns = [{
            text: "返回",
            icon: ui_icon.back,
            func: () => {
                groupLookBar(player, group_id);
            }
        }];
        ui2.show(player);
        }
    });

    if (get_group_level(player) >= 2) {
        ui.btns.push({
            text: "编辑信息",
            icon: ui_icon.edit,
            func: () => {
                editGroupBar(player, group);
            }
        });

        if(group.member.length > 0 || tool.to_array(group.op).length > 0){
            ui.btns.push({
                text: "编辑管理员",
                icon: ui_icon.op,
                func: () => {
                const ui2 = new infoBar();
                ui2.title = "编辑管理员";
                ui2.cancel = () => {
                    groupLookBar(player , group_id);
                }
                for(let id of tool.to_array(group.op)){
                    ui2.toggle(id , get_name_by_id(id) , true);
                }
                for(let id of group.member){
                    ui2.toggle(id , get_name_by_id(id) , false);
                }
                ui2.show(player , (r) => {
                    let op = [];
                    let member = [];
                    for(let id of Object.keys(r)){
                    if(r[id]){
                        op.push(id);
                    }else{
                        member.push(id);
                    }
                    }
                    group.member = member;
                    group.op = op;
                    save_group(group);
                    groupLookBar(player , group_id);
                });
                }
            });
        }

        ui.btns.push({
            text: "添加成员",
            icon: ui_icon.add,
            func: () => {
                let ps = [];
                for (let p of mc.get_all_players()) {
                    if (!is_group_has(group , p)) {
                        ps.push(p);
                    }
                }
                choosePlayer(player, ps, (players) => {
                if (players.length === 0) {
                    tip(player, "无玩家可选择或未选择玩家！", () => {
                        groupLookBar(player, group_id);
                    });
                } else {
                    for (var p of players) {
                        add_invite(p, group.id);
                    }
                    tip(player, `已向${players.length}位玩家发送邀请！`, () => {
                        groupLookBar(player, group_id);
                    });
                }
                });
            }
        });

        if (group.member.length > 0) {
            ui.btns.push({
                text: "删除成员",
                icon: ui_icon.stop,
                func: () => {
                const ui2 = new infoBar();
                ui2.title = "删除成员";
                for (let id of group.member) {
                    ui2.toggle(id, get_name_by_id(id), false);
                }
                ui2.show(player, (r) => {
                    for (var k of Object.keys(r)) {
                        if (r[k] === true) {
                            tool.array_clear(group.member, k);
                        }
                    }
                    save_group(group);
                    groupLookBar(player, group_id);
                });
                }
            });
        }

        if (group.in.length > 0) {
        ui.btns.push({
            text: "加群申请",
            icon: ui_icon.compass,
            func: () => {
            const ui2 = new infoBar();
            ui2.title = "申请列表";
            for (let i of group.in) {
                ui2.toggle(i, get_name_by_id(i) + "[拒绝 | 同意]", false);
            }
            ui2.show(player, (r) => {
                for (var k of Object.keys(r)) {
                if (r[k] === true) {
                    group.member.push(k);
                }
                }
                group.in = [];
                save_group(group);
                groupLookBar(player, group_id);
            })
            }
        });
        }

        
    }
    
    if(get_group_level(player , group) === 3){
        ui.btns.push({
        text: "解散群组",
        icon: ui_icon.delete,
        func: () => {
            confirm(player, "确认解散群组？你将和所有群员失去联系！", (r) => {
            if (r) {
                delete_group(group);
                groupsBar(player);
            } else {
                groupLookBar(player, group_id);
            }
            })
        }
        });
    }
    else {
        ui.btns.push({
        text: "退出群组",
        icon: ui_icon.delete,
        func: () => {
            confirm(player, "确认退出群组？你将和所有群员失去联系！", (r) => {
            if (r) {
                tool.array_clear(group.member, get_id(player));
                save_group(group);
                groupsBar(player);
            } else {
                groupLookBar(player, group_id);
            }
            });
        }
        });
    }
    ui.show(player);
}

function delete_group(group){
  save_data("group" + group.id, "");
  tool.array_clear(groups, group.id);
  save_groups();
}

//3-创建者 2-管理员 1-成员
function get_group_level(player , group){
    if(is_in_manager_mode(player) && get_op_level(player) > 0){
        return 3;
    }
    let id = get_id(player);
    if(id === group.creater){return 3;}
    if(tool.array_has(group.op , id)){return 2;}
    if(tool.array_has(group.member , id)){return 1;}
    return 0;
}

function editGroupBar(player, group) {
  let is_new = false;
  if (!is_group_valid(group)) {
    is_new = true;
    group = {
      creater: "",
      member: [],
      message: [],
      op : [],
      name: "",
      board: "",
      pos: [],
      in: [],
      id: get_random_group_id(),
    }
  }

  const ui = new infoBar();
  ui.title = "编辑群组";
  ui.input("name", "群名", "输入群名", group.name);
  ui.input("board", "公告", "输入公告", group.board);

  ui.show(player, (r) => {
    group.name = r.name;
    group.board = r.board;
    if (new_g) {
        group.creater = get_id(player);
        player_add_group(player, group.id);
    }
    save_group(group);
    groupLookBar(player, group.id);
  })
}

function is_group_has(group , player) {
  return get_group > 0;
}

function addGroupBar(player) {
  const ui = new infoBar();
  ui.busy = () => {
    groupsBar(player);
  }
  ui.title = "加入群组";
  ui.input("id", "加入的群ID", "输入群ID", "");
  ui.show(player, (r) => {
    const group = get_group(r.id);
    if (is_group_valid(group)) {
      if (is_group_has(group, player)) {
        tip(player, "你已经在该群组内！", () => {
          groupsBar(player);
        })
      } else {
        group.in.push(get_id(player));
        save_group(group);

        let my_invites = tool.to_array(tool.parse_json(get_data("my_in", player)), []);
        if (!array_has(my_invites, group.id)) {
          my_invites.push(group.id);
        }
        save_data("my_in", to_json(my_invites), player);

        tip(player, "已发送请求!", () => {
          groupsBar(player);
        })
      }
    } else {
      tip(player, "该群组不存在！", () => {
        groupsBar(player);
      })
    }
  })
}

function myInvitationBar(player) {
  let invites = tool.to_array(tool.parse_json(get_data("invites", player)), []);
  let used = 0;

  const ui = new infoBar();
  ui.title = "邀请请求";
  for (var i of invites) {
    var group = get_group(i);
    if (is_group_valid(group) && !is_group_has(group, player)) {
      ui.toggle(i, `${group.name}(群主:${get_name_by_id(group.creater)})\n[拒绝 | 同意]`);
      used += 1;
    }
  }
  if (used === 0) {
    tip(player, "当前无请求！", () => {
        save_data("invites", "", player);
        groupsBar(player);
    })
    return;
  }
  ui.show(player, (r) => {
    for (let id of Object.keys(r)) {
      if (r[id]) {
        let group = get_group(id);
        group_add_member(group, player);
      }
    }
    save_data("invites", "", player);
    groupsBar(player);
  });
}

function group_add_member(group, player){
  if (!is_group_has(group, player)) {
    group.member.push(get_id(player));
    player_add_group(player, group.id);
    save_group(group);
  }
}

function groupsBar(player) {
  let my_invites = tool.to_array(tool.parse_json(get_data("my_in", player)), [])
  let group_ids = tool.to_array(tool.parse_json(get_data("groups", player)), [])

  for (var i of my_invites) {
    var group = get_group(i);
    if (is_group_valid(group)) {
      if (is_group_has(g, player)) {
        player_add_group(player, i);
        tool.array_clear(my_invites, i);
      }
    }
  }
  save_data("my_in", tool.to_json(invites));

  let invites = to_array(parse_json(get_data("invites", player)), []);
  let groups = get_player_groups(player);

  let creater_groups = [];

  const ui = new btnBar();
  ui.title = "我的群组";
  ui.body = "欢迎使用群组系统！此\n处管理你的群组";
  for (var i = 0; i < groups.length; i++) {
    let group = groups[i];
    ui.btns.push({
      text: `${g.name}\n群主:${get_name_by_id(g.creater)}`,
      op: {
        g: groups[i],
      },
      func: (op) => {
        groupLookBar(player, op.g);
      }
    })
    if (group.creater === get_id(player)) {
      creater_groups.push(group);
    }
  }

  if (creater_groups.length < config.groups.max || get_op_level(player) > 0) {
    ui.btns.push({
      text: "新建群组",
      icon: ui_icon.add,
      func: () => {
        editGroupBar(player, {});
      }
    });
  }

  ui.btns.push({
    text: "加入群组",
    icon: ui_icon.more,
    func: () => {
      addGroupBar(player)
    }
  });
  ui.btns.push({
    text: `群组邀请(${invites.length})`,
    icon: ui_icon.share,
    func: () => {
      myInvitationBar(player);
    }
  });

  ui.show(player);
}

function settingBar(player,back = false){
    const ui = new infoBar();
    ui.cancel = () => {
        event.emit_custom_event("setting_changed",{player : player , back : back});
    }

    ui.title = "群组设置";
    ui.toggle("able", "[禁用 | 启用]", config.groups.able);
    ui.range("max", "可创建群组数量(管理员可无限创建)", 0, 100, 1, config.groups.max);

    ui.show(player,(r) => {
        config.groups.able = r.able;
        config.groups.max = r.max;
        save_config();
        event.emit_custom_event("setting_changed",{player : player , back : back});
    });
}

register_system("group" , {
    is_group_has : is_group_has,
    get_player_groups : get_player_groups,
    save_group : save_group,
    get_group : get_group,
    get_group_level : get_group_level,
    is_group_valid : is_group_valid,
    push_group_mess : push_group_mess,
});