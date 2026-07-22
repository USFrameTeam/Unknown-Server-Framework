import { has_system , get_system , config ,save_config, register_system } from "./Basic/Core.js";
import { data_format, get_data , pictures, save_data, ui_icon } from "./Basic/Data.js";
import * as tool from "./Basic/Tool.js";
import * as event from "./Basic/Event.js";
import { infoBar , btnBar } from "./Basic/ui.js";
import * as mc from "./Basic/Mc.js";
import { format , get_text, push_text} from "./Basic/Text.js";
import { get_op_level } from "./Basic/Permission.js";
import { is_in_manager_mode , get_name_by_id , get_id, get_player_name} from "./Basic/Player.js";
import * as command from "./Command.js";
import { register_global_ui , confirm , tip, playerChooser} from "./Basic/UniversalUI.js";
import * as logger from "./Basic/Logger.js";


/*
Land.js
功能：领地系统
*/
var loaded = false;
var lands = {
  min: [],
  max: [],
  ids: [],
};

const max_radius = 512;
const box_radius = Math.floor(max_radius * 0.7);

event.connect_custom_event("world_load",(things) => {
    //注册设置
    if(has_system("setting")){
      get_system("setting").register_setting("land","领地设置",settingBar);
    }

    load_lands();
    loaded = true;
    
    for(let player of mc.get_all_players()){
      load_player_lands(player);
    }

    if(!has_system("pay")){
      logger.log(2,1,"————支付系统未加载，领地系统无法使用————");
    }

    logger.log(0,1,"————领地系统已加载————");
});

event.connect_custom_event("player_join" , (options) => {
  if(!loaded){return;}
  const player = options.player;
  if(tool.un(player.lands)){
    load_player_lands(player);
    player.in_land = {
      id : "",
      mode : 0,
    };
  }
});

//显示创建领地的ActionBar
mc.run_interval(() => {
  for(let player of mc.get_all_players()){
    if (!tool.un(player.landing) && player.landing.able) {
      mc.set_ActionBar(player, get_text("action.land"));
    }
  }
  
} , 1.5 * 20);

mc.run_interval(() => {
  const players = mc.get_all_players();

  for (const player of players) {
    const di = player.dimension;
    const loc = player.location;

    if(tool.un(player.in_land)){
        player.in_land = {
        id : "",
        mode : 0,
      };
    }

    const land_id = is_point_in_land(di , loc);

    if(land_id === ""){ //不在领地中
      if(player.in_land.id !== ""){
        set_land_id(player , "");
        if (config.land.mode && mc.get_game_mode(player) !== player.in_land.mode && get_op_level(player) == 0) {
          mc.set_game_mode(player , player.in_land.mode);
          player.in_land.mode = mc.get_game_mode(player);
        }
        if(config.land.show && !tool.to_bool(land.hide)){
          mc.set_ActionBar(player, ` `);
        }
        
      }
      return;
    }

    //在领地中
    const land = get_land(land_id);
    const level = get_land_member_level(player,land);
    //加日志
    if(player.in_land.id !== land_id){
      if(has_system("log") && get_system("log").is_log_type_allowed("land")){
        get_system("log").push_log(format("In Land:[0](ID:[1])(Owner:[2])",[land.name , land.id , get_name_by_id(land.creater)]));
      }

      if(config.land.mode && player.in_land.id === "" && level === 0){
        player.in_land.mode = mc.get_game_mode(player);
        mc.set_game_mode(player , 2);
      }

      if(config.land.mode && level > 0 && mc.get_game_mode(player) !== player.in_land.mode){
        mc.set_game_mode(player , player.in_land.mode);
          player.in_land.mode = mc.get_game_mode(player);
      }

      set_land_id(player,land_id);
    
      //显示ActionBar
      if(Date.now() - to_number(player.last_warn, 0) > 1500  && (config.land.show && !tool.to_bool(land.hide))){
        push_text("land.show" , "您已进入领地:[0]\n领地创建者:[1]\n您的身份是:[2]");
        let text = format(get_text("land.show"),[land.name , (tool.to_bool(land.public) ? "公共领地" : get_name_by_id(land.creater)) , get_text("land." + String(level))]);
        text += "\n§r" + land.wel;
        mc.set_ActionBar(player , text);
      }
    }
  }
}, 5);

function set_land_id(player , id){
  player.in_land.id = id;
  if(config.land.var !== "" && has_system("var")){
    get_system("var").set_personal_var(player,config.land.var , 0 , id);
  }
}

//4-创建者或OP 3-管理员 2-成员 1-群组成员 0-访客
function get_land_member_level(player, land) {
  if (player.info.manager === true && get_op_level(player) > 0) {
    return 4
  }
  if (tool.to_bool(land.public)) {
    if (get_op_level(player) > 0) {
      return 4;
    }
  }
  if (land.creater === get_id(player)) {
    return 4;
  }
  if(tool.array_has(tool.to_array(land.op),get_id(player))){
    return 3;
  }
  if (array_has(land.member, player.name) || tool.array_has(land.member , get_id(player))) {
    return 2;
  }
  /* for (var g of get_player_groups(player)) {
    if (array_has(land.group, String(g.id))) {
      return 1;
    }TODO
  } */
  return 0;
}

function load_lands(){
  let need_continue = false;
  let index = 0;
  while(need_continue){
      need_continue = false;
      const min = tool.to_array(tool.parse_json(get_data("lands_min" + (index === 0) ? "" : String(index))), []);
      const max = tool.to_array(tool.parse_json(get_data("lands_max" + (index === 0) ? "" : String(index))), []);
      const ids = tool.to_array(tool.parse_json(get_data("lands_ids" + (index === 0) ? "" : String(index))), []);
      index += 1;
      if(ids.length > 0){
        lands.min = lands.min.concat(min);
        lands.max = lands.min.concat(max);
        lands.ids = lands.min.concat(ids);
        need_continue = true;
      }
  }
}

function save_lands() {
  const indexs = Math.ceil(lands.ids.length / 3000);
  for(let index = 0 ; index < indexs ; index ++){
    save_data("lands_ids" + (index === 0) ? "" : String(index) , tool.to_json(lands.ids.slice(3000 * index, Math.min(3000 * (index + 1) - 1, lands.ids.length -1))));
    save_data("lands_max" + (index === 0) ? "" : String(index) , tool.to_json(lands.max.slice(3000 * index, Math.min(3000 * (index + 1) - 1, lands.max.length -1))));
    save_data("lands_min" + (index === 0) ? "" : String(index) , tool.to_json(lands.min.slice(3000 * index, Math.min(3000 * (index + 1) - 1, lands.min.length -1))));
  }
}

function get_land(id) {
  const data = get_data(`land.${id}`);

  if (data === "") {
    return {};
  }

  return tool.to_object(tool.parse_json(data),{});
}

function is_land_id_valid(id){
  return tool.array_has(lands.ids,id);
}

function save_player_lands(player) {
  if (!tool.is_player(player) || tool.un(player.lands)){ return;}
  save_data("lands", tool.to_json(player.lands), player);
}

function load_player_lands(player) {
  let player_lands = tool.to_array(tool.parse_json(get_data("lands", player)));
  player.lands = player_lands.filter((land_id) => {return tool.array_has(lands.ids,land_id);});
  save_player_lands(player);
}

/*
player.landing = {
  points : 点,
  able : 是否正在编辑,
  high_min : 最低高度,
  high_max : 最高高度,
  radius : 半径,
  shape : DebugShape,
}
*/

function createLandBar(player) {
  if(player.landing.points.length === 0 || player.landing.points.length > 2){return;}
  if (tool.un(player.scoreboardIdentity)) {
    show_title(player, "无法初始化记分板\n请重进游戏")
    return;
  }


  let ui = new infoBar();
  ui.busy = null;
  let points = player.landing.points;
  let type = (points.length === 1) ? "circle" : "box";
  let use_2d = (player.landing.use_2d === true || config.land.use_2d === 2);
  let radius = 0;
  if(get_op_level(player) > 0){
    radius = (type === "box") ? box_radius : max_radius;
  }else{
    if(type === "box"){
      radius = Math.min(config.land.radius * 0.7, box_radius);
    }else{
      radius = Math.min(config.land.radius, max_radius);
    }
  }

  //TODO玩家切换维度后清空landings

  let size = 0;
  let board = world.scoreboard.getObjective(config.land.board);
  let text = format("领地类型:[0]\n您的金额:[1]\n",[(type === "box") ? "方形" : "圆形" , to_number(board.getScore(player))]);
  let price = 0;
  if(type === "box"){
    let box_size = {
      x: Math.abs(points[0].location.x - points[1].location.x) + 1,
      y: Math.abs(points[0].location.y - points[1].location.y) + 1,
      z: Math.abs(points[0].location.z - points[1].location.z) + 1,
    }
    if(use_2d){
      box_size.y = player.dimension.heightRange.max - player.dimension.heightRange.min + 1;
    }

    if (size.x > radius * 2 || size.z > radius * 2 ) {
      mc.show_title(player, `范围过大！无法创建！\n上限:${radius * 2}*${radius * 2}`);
      return;
    }
    size = box_size.x * box_size.y * box_size.z;
    price = Math.round(size.x * size.y * size.z * config.land.price);
    text += `领地尺寸:${box_size.x} * ${box_size.y} * ${box_size.z}\n`;
    text += `始点:${tool.get_block_pos_text(points[0])}\n终点:${get_block_pos_text(points[1])}\n`;

    ui.range("y1", "起点y坐标(2d模式下无效)", player.dimension.heightRange.min, player.dimension.heightRange.max, 1, points[0].y);
    ui.range("y2", "终点y坐标(2d模式下无效)", player.dimension.heightRange.min, player.dimension.heightRange.max, 1, points[1].y);
  }else{
    player.landing.high_max = tool.to_number(player.landing.high_max,points[0].y);
    player.landing.high_min = tool.to_number(player.landing.high_min,points[0].y);
    player.landing.radius = tool.to_number(player.landing.high_min,10);
    let high = player.landing.high_max - lands.high_min;
    if(use_2d){
      high = player.dimension.heightRange.max - player.dimension.heightRange.min + 1;
      player.landing.high_max = player.dimension.heightRange.max;
      player.landing.high_min = player.dimension.heightRange.min;
    }

    size = Math.round(Math.PI * player.landing.radius * high * player.landing.radius);
    price = Math.round(size * config.land.price);
    text += `原点:(${points[0].x} , ${points[0].z})\n半径:${player.landing.radius}`;

    ui.range("r" , "领地半径" , 1 , radius , 1 , player.landing.radius);
    ui.range("y1", "最高y坐标(2d模式下无效)", player.dimension.heightRange.min, player.dimension.heightRange.max, 1, player.landing.high_max);
    ui.range("y2", "最低y坐标(2d模式下无效)", player.dimension.heightRange.min, player.dimension.heightRange.max, 1, player.landing.high_min);
  }

  text += format("价格:[0]\n总方块量:[1]\n领地名:",[price , size]);
  
  ui.title = "新建领地";
  ui.input("name", text , "领地名", "");
 

  if (get_op_level(player) > 0) {
    ui.toggle("public", "公共领地(管理均可编辑)", false);
    ui.toggle("hide", "隐藏领地(在领地内不触发任何提示)", false);
    ui.toggle("lock", "锁定领地(非OP无法删除领地)", false);
  }

  ui.options("type", "操作", ["更新并预览范围", "取消创建", "确认创建"], 0);
  ui.show(player, (r) => {
    if (r.type === 1) {
      player.landing.able = false;
      player.landing.points = [];
      return;
    }

    switch (type){
      case "box":
        try {
          let b = player.dimension.getBlock({
            x: points[0].location.x,
            y: (use_2d) ? player.dimension.heightRange.max : r.y1,
            z: points[0].location.z,
          })
          if (!un(b)) {
            points[0] = {
              x: b.x,
              y: b.y,
              z: b.z
            }
          }

          b = player.dimension.getBlock({
            x: points[1].location.x,
            y: (use_2d) ? player.dimension.heightRange.min : r.y2,
            z: points[1].location.z
          })
          if (!un(b)) {
            points[1] = {
              x: b.x,
              y: b.y,
              z: b.z
            }
          }
        } catch (err) { }
        if(player.landing.points.length === 2){
          if(tool.is_object(player.landing.shape)){
            mc.remove_shape(player.landing.shape);
          }
          mc.create_box_shape(player.dimension , player.landing.points[0] , player.landing.points[1] , [player]);
        }
    case "circle":
      if(player.landing.points.length === 1){
        player.landing.radius = r.r;
        player.landing.high_max = use_2d ? player.dimension.heightRange.max : Math.max(r.y1,r.y2);
        player.landing.high_min = use_2d ? player.dimension.heightRange.min : Math.min(r.y1,r.y2);
        if(tool.is_object(player.landing.shape)){
          mc.remove_shape(player.landing.shape);
        }
        mc.create_cylinder_shape(player.dimension , {
          x : player.landing.points[0].x,
          y : (player.landing.high_max + player.landing.high_min)/2 + 0.5,
          z : player.landing.points[0].z,
        },player.landing.radius,(player.landing.high_max - player.landing.high_min + 1 )/2, [player]);
      }
    }

    if (r.type === 0) {
      return;
    }

    if (is_preland_in_other(player , type , points[0] , (type === "box") ? points[1] : radius , (type === "box") ? 0 : (player.landing.high_max - player.landing.high_min + 1 )/2)){
      mc.set_title(player, "领地重叠！无法创建！");
      return;
    }

    //创建领地
    get_system("pay").pay(player , [config.land.currency] , [(tool.to_bool(r.public) === true) ? 0 : price] , "购买领地" , "" , (result) => {
      if(!result){return;}
      create_land(type , points , player , r.name , price , tool.to_bool(r.public) , tool.to_bool(r.hide),tool.to_bool(r.lock));
    });
    });
    
}


function create_land(type , points , player , name , price , public = false , hide = false , lock = false){
  let land = tool.object_override({} , data_format.land);
  switch(type){
    case "box":
      const ps = get_edge_from_block(points[0].location, points[1].location);
      points[0] = ps[0];
      points[1] = ps[1];
      land.di = player.dimension.id;
      land.id = get_random_land_id(player.dimension);
      land.from = points[0];
      land.to = points[1];
      land.creater = get_id(player);
      land.name = name;
      land.price = price;
      land.type = "box";
      const center = {
        x : (points[0].x + points[1].x)/2,
        z : (points[0].z + points[1].z)/2,
      }
      land_get_distance(land,center);
      break;
    case "circle":
      land.di = player.dimension.id;
      land.id = get_random_land_id(player.dimension);
      land.from = {
        x : points[0].x,
        z : points[0].z,
        y : (player.landing.high_max + player.landing.high_min)/2 + 0.5,
      };
      land.height = (player.landing.high_max - player.landing.high_min + 1 )/2;
      land.creater = get_id(player);
      land.name = name;
      land.type = "circle";
      land.price = price;
      land_get_distance(land);
      break;
  }

  land.public = public;
  land.hide = hide;
  land.lock = lock;

  if(tool.is_object(player.landing.shape)){
    mc.remove_shape(player.landing.shape);
  }
  
  add_land(player, land);
  save_land(land);
  player.landing.able = false;
  player.landing.points = [];
}

function land_get_distance(land , center = undefined){
  if(land.type === "box"){
    land.distance = Math.round(Math.sqrt(Math.pow(Math.abs(center.x), 2) + Math.pow(Math.abs(center.z), 2)));
  } else{
    land.distance = Math.round(Math.sqrt(Math.pow(Math.abs(land.from.x), 2) + Math.pow(Math.abs(land.from.z), 2)));
  }
}

function get_di_num(di) {
  const id = di.id;

  if (id === "minecraft:nether") {
    return "1";
  } else if (id === "minecraft:the_end") {
    return "2";
  }else if(id === "minecraft:overworld"){
    return "0";
  }else{
    return "3";
  }
}

function get_edge_from_block(start, end) {
  var tallest = small_to_big(start.y, end.y)[1] + 1
  var shortest = small_to_big(start.y, end.y)[0]
  var new_start = {
    x: small_to_big(start.x, end.x)[0],
    y: tallest,
    z: small_to_big(start.z, end.z)[0]
  }
  var new_end = {
    x: small_to_big(start.x, end.x)[1] + 1,
    y: shortest,
    z: small_to_big(start.z, end.z)[1] + 1
  }
  return [new_start, new_end];
}

function small_to_big(c1, c2) {
    return [Math.min(c1,c2) , Math.max(c1,c2)];
}


function add_land(player, land) {
  let index = find_min_in_lands(Math.max(land.distance - max_radius, 0));
  if (index === -1) {
    lands.ids.unshift(land.id);
    lands.min.unshift(Math.max(land.distance - max_radius, 0));
    lands.max.unshift(land.distance + max_radius);
  } else {
    lands.ids.splice(index + 1, 0, land.id)
    lands.min.splice(index + 1, 0, Math.max(land.distance - max_radius, 0))
    lands.max.splice(index + 1, 0, land.distance + max_radius);
  }
  save_lands();
  if(tool.is_player(player)){
    player.lands.push(land.id);
    save_player_lands(player);
  }
}

function save_land(land) {
  save_data(`land.${land.id}`, tool.to_json(land));
}

function is_preland_in_other(di, type , lo1 , lo2 , lo3 = 0) {
  const center ;
  switch(type){
    case "box":
      center = {
        x: (lo1.x + lo2.x) / 2,
        y: (lo1.y + lo2.y) / 2,
        z: (lo1.z + lo2.z) / 2
      };
      break;
    case "circle":
      center = lo1;
      break;
  }
  
  let dis = Math.round(Math.sqrt(Math.pow(Math.abs(center.x), 2) + Math.pow(Math.abs(center.z), 2)));
  let index = two_find_min(lands.max, dis - max_radius);
  if (index === -1) {
    return false;
  }

  for (index >= 0; index--;) {
    if (lands.min[index] > dis + max_radius) {
      return false;
    }
    if(lands.ids[index][0] !== get_di_num(player.dimension)){
      continue;
    }
    let land = get_land(lands.ids[index]);
    if (tool.is_string(land.name)) {
      switch(type + land.type){
        case "boxbox":
          if (
            ((lo1.x < land.from.x && lo2.x < land.from.x && lo1.x < land.to.x && lo2.x < land.to.x) || (lo1.x > land.from.x && lo2.x > land.from.x && lo1.x > land.to.x && lo2.x > land.to.x)) ||
            ((lo1.y < land.from.y && lo2.y < land.from.y && lo1.y < land.to.y && lo2.y < land.to.y) || (lo1.y > land.from.y && lo2.y > land.from.y && lo1.y > land.to.y && lo2.y > land.to.y)) ||
            ((lo1.z < land.from.z && lo2.z < land.from.z && lo1.z < land.to.z && lo2.z < land.to.z) || (lo1.z > land.from.z && lo2.z > land.from.z && lo1.z > land.to.z && lo2.z > land.to.z))
          ){}else {
            return true;
          }
          break;
        case "circlecircle":
          //lo2为半径 lo3为高度半径
          let dis2 = Math.pow(Math.abs(land.from.x - lo1.x), 2) + Math.pow(Math.abs(land.from.z - lo1.z), 2);
          if(dis2 < Math.pow(land.radius + lo2 , 2)){
            if(lo1.y - lo3 < land.from - land.height && lo1.y + lo3 > land.from + land.height){
              return true;
            }
            if((lo1.y - lo3 < land.from + land.height && lo1.y - lo3 > land.from - land.height) || (lo1.y + lo3 < land.from + land.height && lo1.y + lo3 > land.from - land.height) ){
              return true;
            }
          }
          break;
        case "circlebox":
          let closestX = Math.max(Math.min(land.from.x, land.to.x), Math.min(lo1.x, Math.max(land.from.x, land.to.x)));
          let closestZ = Math.max(Math.min(land.from.z, land.to.z), Math.min(lo1.z, Math.max(land.from.z,land.to.z)));
          if(Math.pow(Math.abs(lo1.x - closestX), 2) + Math.pow(Math.abs(lo1.z - closestZ), 2) < lo3 * lo3){
            let heights = small_to_big(land.from.y ,land.to.y);
            if(heights[0] < lo1.y - lo3 && heights[1] > lo1.y + lo3){
              return true;
            }
            if((heights[0] < lo1.y + lo3 && heights[0] > lo1.y - lo3) || (heights[1] < lo1.y + lo3 && heights[1] > lo1.y - lo3)){
              return true;
            }
          }
          break;
        case "boxcircle":
          let closestX = Math.max(Math.min(lo1.x, lo2.x), Math.min(land.from.x, Math.max(lo1.x, lo2.x)));
          let closestZ = Math.max(Math.min(lo1.z, lo2.z), Math.min(land.from.z, Math.max(lo1.z, lo2.z)));
          if(Math.pow(Math.abs(land.from.x - closestX), 2) + Math.pow(Math.abs(land.from.z - closestZ), 2) <  land.radius * land.radius){
            let heights = small_to_big(lo1.y ,lo2.y);
            if(heights[0] < land.from.y - land.radius && heights[1] > land.from.y + land.radius){
              return true;
            }
            if((heights[0] < land.from.y + land.radius && heights[0] > land.from.y - land.radius) || (heights[1] < land.from.y + land.radius && heights[1] > land.from.y - land.radius)){
              return true;
            }
          }
          break;
      }
        
    }
  }
  return false;
}

function is_point_in_land(di , pos){
    let dis = Math.sqrt(Math.pow(Math.abs(pos.x), 2) + Math.pow(Math.abs(pos.z), 2));
    let index = two_find_min(lands.max, dis);
    if (index === -1) {
      return "";
    }

    for (index >= 0; index--;) {
      if (lands.min[index] > dis) {
        return "";
      }
      if(lands.ids[index][0] !== get_di_num(player.dimension)){
        continue;
      }

      let land = get_land(lands.ids[index]);
      if (tool.is_string(land.name)) {
        if(land.type === "box"){
          if(((pos.x < land.from.x && pos.x < land.to.x) || (pos.x > land.from.x && pos.x > land.to.x)) ||
          ((pos.y < land.from.y && pos.y < land.to.y) || (pos.y > land.from.y && pos.y > land.to.y)) || 
          ((pos.z < land.from.z && pos.z < land.to.z) || (pos.z > land.from.z && pos.z > land.to.z))){}
          else{
            return lands.ids[index];
          }
        }else{
          if( pos.y > land.from.y - land.radius && pos.y < land.from.y + land.radius){
            if(Math.pow(Math.abs(pos.x - land.from.x), 2) + Math.pow(Math.abs(pos.z - land.from.z)) < Math.pow(land.radius , 2)){
              return lands.ids[index];
            }
          }
        }
      }
    }
    return "";
}

//使用二分法寻找 <= count的最大值
//传入的必须是升序、无重复数组
//返回的是index
function two_find_min(array, count) {
  let goal = -1;
  let from = 0;
  let to = array.length - 1;
  while (from <= to) {
    let mid = Math.floor((from + to) / 2);
    if (array[mid] <= count && mid > goal) {
      goal = mid;
    }
    if (array[mid] < count) {
      from = mid + 1;
    } else {
      to = mid - 1;
    }
  }

  if(goal >= 0 && array.length >= 2){
    while(goal <= array.length - 2 && array[goal] === array[goal + 1]){
      goal += 1;
    }
  }
  return goal;
}

function find_min_in_lands(dis) {
  return two_find_min(lands.min, dis);
}


//输出int
function get_random_land_id(di) {
  const min = 100000;
  const max = 99999999;
  let id;

  do {
    id = get_di_num(di) + String(Math.floor(Math.random() * (max - min + 1)) + min);
  } while (tool.array_has(lands.ids, id));

  return id;
}

register_global_ui("land" , landBar);

function landBar(player, options ) {
  if(!config.land.able){return;}

  const ui = new btnBar();
  ui.title = "我的领地";
  if(tool.is_function(options.cancel)){
    ui.cancel = options.cancel();
  }

  if (!has_system("pay") || !get_system("pay").is_currency_valid(config.land.currency)) {
    tip(player , "货币配置错误！领地功能无法使用！" , () => {});
    return;
  }

  let length = player.lands.length;
  player.lands = player.lands.filter((id) => {return is_land_id_valid(id) && get_land(id).creater === get_id(player)});
  if(player.lands.length !== length){save_player_lands(player);}

  let text = "";
  let current_land_id = is_point_in_land(player.dimension, player.location);
  if (current_land_id !== "") {
    const land = get_land(current_land_id);
    text += `当前领地：${land.name}(ID:${land.id})\n`;
  }

  push_text("land" , "欢迎使用领地系统！\n此处管理您的所有领地\n您的领地数量:[0]");
  ui.body = text + format(get_text("land") , [player.lands.length]);
  if (player.lands.length < config.land.max || get_op_level(player) > 0) {
    ui.btns.push({
      text: "添加领地",
      icon: ui_icon.add,
      func: () => {
        player.landing.able = true;
        tip(player, array2string([
          "领地设置方法:",
          "空手选取方块点",
          "输入+land命令即可进入创建页面",
          "输入+unland命令即可取消创建领地",
          "创建页面可更改Y轴",
          "创建页面选择 更新并预览范围 模式可以继续修改坐标点",
        ]));
      }
    });
  }

  for (let land_id of player.lands) {
    let land = get_land(land_id);
    ui.btns.push({
      text: `[${mc.get_di(land.di).name}]${land.name}`,
      op: {
        id: land.id,
      },
      func: (op) => {
        viewLandBar(player , op.id , false);
      }
    });
  }

  ui.show(player);
}

//direct => 为true时，不会返回landBar
function viewLandBar(player , id , direct = false) {
  if(!is_land_id_valid(id)){
    return;
  }

  let land = get_land(id);
  const ui = new btnBar();
  ui.show_common = true;
  ui.title = format("领地 - [0]" , [land.name]);
  if(!direct){
    ui.cancel = () => {
      landBar(player);
    }
  }

  let land_range_text = (tool.to_string(land.type , "box") === "box") ? `范围:${tool.get_block_pos_text(land.from)} 到 ${tool.get_block_pos_text(land.to)}` : format("原点:[0];高度:[1];半径[2]",[tool.get_block_pos_text(land.from) , land.height*2, land.radius]);
  ui.body = [
    `领地名:${land.name}`,
    `领地ID:${land.id}`,
    `领地所在维度:${mc.get_di(land.di).name}`,
    land_range_text,
    `领地创建者:${(tool.to_bool(land.public) ? "公共领地" : get_name_by_id(land.creater))}`,
    `管理员:${tool.array2line(land.op)}`,
    `成员:${tool.array2line(land.member.map((p_id) => {return get_name_by_id(p_id);}))}`,
    //TODO `开放队伍:${tool.array2line(land.group)}`,
  ];
  if (tool.is_number(land.price)) {
    ui.body.push(`价格:${land.price}`);
  }

  ui.btns = [{
    text : "查看权限",
    icon : pictures.pickaxe,
    func : () => {
      const ui2 = new btnBar();
      ui2.title = "查看我的权限";
      ui2.cancel = () => {
        viewLandBar(player , id);
      }
      let text = `你的身份:${get_text("land." + String(get_land_member_level(player, land)))}`;
      let level = get_land_member_level(player,land);
      let per_array = (level >= 3) ? data_format.land_permission : (level === 2 || level === 1) ? land.mem_per : land.other_per;
      for(let per of data_format.land_permission){
        text += format("\n[0]:[1]",[get_text(per) , tool.array_has(per_array , per)]);
      }
      ui2.body = text;
      ui2.btns = [{
        text : "返回",
        icon : ui_icon.back,
        func : ()=>{
          viewLandBar(player , id);
        }
      }];
      ui2.show(player);
    }
  }];

  let level = get_land_member_level(player, land);
  if (level >= 3) {
    ui.btns.push({
      text: "编辑领地名",
      icon: ui_icon.edit,
      func: () => {
        const ui2 = new infoBar();
        ui2.title = "编辑领地名";
        ui2.cancel = () => {
          viewLandBar(player, id);
        }
        ui2.input("name", "领地名", "输入领地名", land.name);
        ui2.show(player, (r) => {
          land.name = r.name;
          save_land(land);
          viewLandBar(player, id)
        })
      }
    });

    ui.btns.push({
      text: "编辑欢迎语",
      icon: ui_icon.content,
      func: () => {
        const ui2 = new infoBar();
        ui2.title = "编辑欢迎语";
        ui2.cancel = () => {
          viewLandBar(player , id);
        }
        ui2.input("wel", "欢迎语", "输入欢迎语", land.wel);
        ui2.show(player, (r) => {
          land.wel = r.wel;
          save_land(land);
          viewLandBar(player, id);
        });
      }
    });

    ui.btns.push({
      text: "编辑成员权限",
      func: () => {
        editLandPermissionBar(player, land, 0)
      }
    }, {
      text: "编辑访客权限",
      func: () => {
        editLandPermissionBar(player, land, 1)
      }
    })

    ui.btns.push({
      text: "编辑开放队伍",
      icon: ui_icon.group,
      func: () => {
        const ui2 = new infoBar();
        ui2.title = "编辑开放队伍";
        ui2.cancel = () => {
          viewLandBar(player , id);
        }
        //TODO 显示您的所有队伍
        ui2.input("group", "开放队伍(多个队伍间用英文,间隔)", "如:58965,695632,256699", array2line(land.group));
        ui2.show(player, (r) => {
          let groups = r.group.split(",");
          tool.array_clear(groups, "");
          land.group = groups;
          save_land(land);
          viewLandBar(player, id);
        });
      }
    });

    if(land.member.length > 0 || land.op.length > 0){
      ui.btns.push({
      text: "编辑管理员",
      icon: ui_icon.op,
      func: () => {
        const ui2 = new infoBar();
        ui2.title = "编辑管理员";
        ui2.cancel = () => {
          viewLandBar(player , id , direct);
        }
        for(let id of land.op){
          ui2.toggle(id , get_name_by_id(id) , true);
        }
        for(let id of land.member){
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
          land.member = member;
          land.op = op;
          save_land(land);
          viewLandBar(player,land.id);
        })
      }
    });
    }

    ui.btns.push({
      text: "添加成员",
      icon: ui_icon.add,
      func: () => {
        const players = []
        for (var p of mc.get_all_players()) {
          if (!tool.array_has(land.member, p.name) && !tool.array_has(land.op, p.name) && get_id(p) !== land.creater) {
            players.push(p);
          }
        }
        playerChooser(player, players, (ps) => {
          for (var p of ps) {
            if(mc.is_entity_valid(p)){
              land.member.push(get_id(player));
            }
          }
          save_land(land);
          viewLandBar(player, id);
        })
      }
    });

    if (land.member.length > 0) {
      ui.btns.push({
        text: "移除成员",
        icon: ui_icon.rubbish,
        func: () => {
          var ui2 = new infoBar();
          ui2.title = "移除成员";
          ui2.cancel = () => {
            viewLandBar(player, id);
          }
          ui2.options("id", "移除成员", land.member.map((p_id) => {return get_name_by_id(p_id);}), 0);
          ui2.show(player, (r) => {
            land.member.splice(r.id, 1);
            save_land(land);
            viewLandBar(player, id);
          })
        }
      });
    }
  }

  if(level === 4 && (!tool.to_bool(land.lock) || get_op_level(player) > 0)){
    ui.btns.push({
      text: "转让领地",
      icon: ui_icon.speed,
      func: () => {
        const ui2 = new infoBar();
        ui2.title = "转让领地";
        ui2.cancel = () => {
          viewLandBar(player , id , direct);
        }
        const players = mc.get_all_players().filter((p) => {return p !== player;});
        if(players.length === 0){
          tip(player , "当前无可选择的在线玩家" , () => {viewLandBar(player , id , direct);});
        }
        ui2.options("index" , "选择玩家" , players.map((p) => { return get_player_name(p);}),0);
        ui2.show(player , (r) => {
          const new_creater = players[r.index];
          if(mc.is_entity_valid(new_creater)){
            transfer_land(land.id , new_creater);
            landBar(player);
          }else{
            tip(player , "转让失败！" , () => {viewLandBar(player , id , direct);});
          }
        });
      }
    });
    ui.btns.push({
      text: "删除领地",
      icon: ui_icon.delete,
      func: () => {
        confirm(player, "确认删除领地？", (r) => {
          if(r){
            let count = tool.to_number(land.price);
            delete_land(land.id);
            if(count > 0 && has_system("pay") && get_id(player) === land.creater){
              get_system("pay").add_money(player , config.land.currency , count)
            }
            if(!direct){
              landBar(player);
            }
          }else {
            viewLandBar(player, id);
          }
        });
      }
    });
  }
  ui.show(player);
}

function editLandPermissionBar(player, land, type = 0) {
  land.mem_per = tool.to_array(land.mem_per);
  land.other_per = tool.to_array(land.other_per);

  const ui = new infoBar();
  if (type === 0) {
    ui.title = "编辑成员权限"
  } else {
    ui.title = "编辑访客权限"
  }

  for (var per of data_format.land_permission) {
    if (type === 0) {
      ui.toggle(per, get_text(per), tool.array_has(land.mem_per, per));
    } else {
      ui.toggle(per, get_text(per), tool.array_has(land.other_per, per));
    }
  }

  ui.show(player, (r) => {
    var result = [];
    for (var k in r) {
      if (r[k] === true) {
        result.push(k);
      }
    }
    if (type === 0) {
      land.mem_per = result;
    } else {
      land.other_per = result;
    }

    save_land(land);
    viewLandBar(player, land.id);
  })
}

function delete_land(id){
  if(is_land_id_valid(id)){
    const index = lands.ids.indexOf(id);
    lands.ids.splice(index, 1);
    lands.min.splice(index, 1);
    lands.max.splice(index, 1);
    save_lands();
  }
}

function settingBar(player,back = false){
    const ui = new infoBar();
    ui.title = "领地设置";
    ui.cancel = () => {
        event.emit_custom_event("setting_changed",{player : player , back : back});
    }
    ui.toggle("able", "[禁用 | 启用]", config.land.able);
    ui.range("max", "可创建领地数量(管理员可无限创建)", 1, 100, 1, config.land.max);
    ui.input("currency", "领地扣费货币ID", "输入id", config.land.currency);
    ui.range("price", "领地价格/每方块(最后价格约成整数)", 0, 10, 1, config.land.price);
    ui.toggle("must", "金额必须足够(若关闭，则记分板可能会被扣费成负数)", config.land.must);
    ui.toggle("mode", "进入领地强制冒险模式(管理员不受限)", config.land.mode);
    ui.options("2d" , "2D模式" , ["禁用" , "可选" , "强制"] , config.land["2d"]);
    ui.range("radius" , "圆形领地最大半径(方形领地最大边长为圆形领地半径*1.4)" , 64 , 512 , 1 , config.land.radius);
    ui.input("var" , "映射到自定义变量的ID(设置后，玩家进入领地，对应的自定义变量赋值为领地ID)","输入变量ID" , config.land.var);
    ui.toggle("show", "在领地内显示提示语、无法操作提示", config.land.show);

    ui.show(player,(r) => {
        config.land.able = r.able;
        config.land.must = r.must;
        config.land.price = r.price;
        config.land.currency = r.currency;
        config.land.max = r.max;
        config.land.mode = r.mode;
        config.land["2d"] = r["2d"];
        config.land.radius = r.radius;
        config.land.var = r.var;
        config.land.show = r.show;
        save_config();
        event.emit_custom_event("setting_changed",{player : player , back : back});
    });
}

command.register_command("land" , "打开领地创建界面" , (player ,args) => {
  if (player.landing.points.length !== 0) {
    createLandBar(player);
  } else {
    mc.set_title(player, get_text("land.zero"));
  }
});

command.register_command("unland" , "取消领地创建" , (player ,args) => {
  player.landing.able = false;
  player.landing.points = [];
  if(tool.is_object(player.landing.shape)){
    mc.remove_shape(player.landing.shape);
  }
  chat("§e[领地系统]已取消创建领地！", [player]);
});

command.register_mc_command({
  description : "创建领地",
  permissionLevel : 1,
  name : "usf:land_create",
  mandatoryParameters : [
    {
    name : "DimensionID",
    type : "String"
  },
    {
    name : "Center",
    type : "Location"
  },{
    name : "Format",
    type : "String"
  },{
    name : "Name",
    type : "String"
  },{
    name : "Var",
    type : "String"
  }],
  optionalParameters : [{
    name : "Creator",
    type : "PlayerSelector"
  }],
},(origin,args) => {
    let di = mc.get_di(args[0]);
    let loc = args[1];
    let format_id = args[2];
    let name = args[3];
    let var_id = args[4];
    let new_id = get_random_land_id(di);
    if(tool.un(di) || !is_land_id_valid(format_id) || var_id === ""){
      logger.log(2,1,"[领地系统]使用命令创建领地时失败!请确认维度ID、模板领地ID是否合法");
      return;
    }

    loc.x = Math.round(loc.x);
    loc.y = Math.round(loc.y);
    loc.z = Math.round(loc.z);

    let land = get_land(format_id);
    land.di = di.id;
    land.name = name;
    land.id = new_id;
    land.price = 0;
    switch(land.type){
      case "box":
        let old_from = land.from;
        let old_to = land.to;
        land.from = {
          x : loc.x,
          y : loc.y,
          z : loc.z,
        }
        land.to = {
          x : old_to.x + (land.from.x - old_from.x),
          y : old_to.y + (land.from.y - old_from.y),
          z : old_to.z + (land.from.z - old_from.z),
        }
        const center = {
          x : (land.from.x + land.to.x)/2,
          z : (land.from.z +land.to.z)/2,
        }
        land_get_distance(land,center);
        break;
      case "circle":
        land.from = {
          x : loc.x,
          y : loc.y,
          z : loc.z,
        };
        land_get_distance(land);
        break;
    }

    if(args.length >= 6){
      let player = args[5];
      land.creater = get_id(player);
      add_land(player , land);
    }else{
      land.creater = "";
      add_land(undefined , land);
    }
    save_land(land);
});

command.register_mc_command({
  description : "转让领地",
  permissionLevel : 1,
  name : "usf:land_transfer",
  mandatoryParameters : [
    {
    name : "LandID",
    type : "String"
  },
    {
    name : "Player",
    type : "Player"
  }],
},(origin,args) => {
    let id = args[0];
    let player = args[1];
    if(!is_land_id_valid(id)){
      logger.log(2,1,"[领地系统]使用命令转让领地时失败!请确认领地ID是否存在");
      return;
    }
    transfer_land(id , player);
});

function transfer_land(id , player){
    const land = get_land(id);
    id.creater = get_id(player);
    player.lands.push(land.id);
    save_player_lands(player);
    save_land(land);
}

event.register_mc_event(true , "explosion" , undefined , (event) => {
  if (config.land.able) {
    const entity = event.source;
    const blocks = event.getImpactedBlocks();
    const filtered_blocks = [];

    for(let block of blocks){
      if(is_point_in_land(block.dimension , block.center()) !== ""){
        filtered_blocks.push(block);
      }
    }
    event.setImpactedBlocks(blocks);
  }
});

event.register_mc_event(true , "playerInteractWithEntity" , undefined , (event) => {
  if (config.land.able) {
    const player = event.player;
    const entity = event.target;
    let id = is_point_in_land(player.dimension, entity.location);
    if (id !== "") {
      let land = get_land(id);
      switch(get_land_member_level(player,land)){
        case 1:
        case 2:
          if(!tool.array_has(tool.to_array(land.mem_per),"ie")){
            event.cancel = true;
            land_unable_tip(player);
          }
          break;
        case 0:
          if(!tool.array_has(tool.to_array(land.other_per),"ie")){
            event.cancel = true;
            land_unable_tip(player);
          }
          break;
      }
    }
  }
});

event.register_mc_event(true , "playerInteractWithBlock" , undefined , (event) => {
  if (!config.land.able) {
    return;
  }

  let player = event.player;
  let block = event.block;
  let item = event.itemStack;
  if (tool.un(item)){
    if (tool.to_bool(tool.to_object(player.landing).able)) {
      if(player.landing.points.length === 0 || 
        (player.landing.points.length > 0 && tool.get_block_pos_text(block) !== tool.get_block_pos_text(player.landing.points[player.landing.points.length - 1]))){
          if(player.landing.points.length === 2){
            player.landing.points.splice(1,1);
          }
          player.landing.points.push({
            x: block.x,
            y: block.y,
            z: block.z,
          });
        }
    }

    event.cancel = true;
    return;
  }

  let id = is_point_in_land(player.dimension, block.location);
  if (id !== "") {
    let land = get_land(id);
    switch(get_land_member_level(player,land)){
      case 1:
      case 2:
        if(!tool.array_has(tool.to_array(land.mem_per),"ib")){
          event.cancel = true;
          land_unable_tip(player);
        }
        break;
      case 0:
        if(!tool.array_has(tool.to_array(land.other_per),"ib")){
          event.cancel = true;
          land_unable_tip(player);
        }
        break;
    }
  }
});

event.register_mc_event(true , "playerPlaceBlock" , undefined , (event) => {
  if (config.land.able) {
    const player = event.player;
    const block = event.block;
    let id = is_point_in_land(player.dimension, block.location);
    if (id !== "") {
      let land = get_land(id);
      switch(get_land_member_level(player,land)){
        case 1:
        case 2:
          if(!tool.array_has(tool.to_array(land.mem_per),"pb")){
            event.cancel = true;
            land_unable_tip(player);
          }
          break;
        case 0:
          if(!tool.array_has(tool.to_array(land.other_per),"pb")){
            event.cancel = true;
            land_unable_tip(player);
          }
          break;
      }
    }
  }
});

event.register_mc_event(false , "playerDimensionChange" , undefined , (event) => {
  if(tool.is_object(player.landing)){
    player.landing.points = [];
  }
});

event.register_mc_event(true , "entityHurt" , undefined , (event) => {
  let player = event.damageSource.damagingEntity;
  if(tool.is_player(player)){
    let entity = event.hurtEntity;
    let id = is_point_in_land(entity.dimension, entity.location);
    if (id !== "") {
      let land = get_land(id);
      switch(get_land_member_level(player,land)){
        case 1:
        case 2:
          if(!tool.array_has(tool.to_array(land.mem_per),"hurt")){
            event.cancel = true;
            land_unable_tip(player);
          }
          break;
        case 0:
          if(!tool.array_has(tool.to_array(land.other_per),"hurt")){
            event.cancel = true;
            land_unable_tip(player);
          }
          break;
      }
    }
  }
});

event.register_mc_event(true , "playerBreakBlock" , undefined , (event) => {
  if (config.land.able) {
    const player = event.player;
    const block = event.block;
    let id = is_point_in_land(player.dimension, block.location);
    if (id !== "") {
      let land = get_land(id);
      switch(get_land_member_level(player,land)){
        case 1:
        case 2:
          if(!tool.array_has(tool.to_array(land.mem_per),"bb")){
            event.cancel = true;
            land_unable_tip(player);
          }
          break;
        case 0:
          if(!tool.array_has(tool.to_array(land.other_per),"bb")){
            event.cancel = true;
            land_unable_tip(player);
          }
          break;
      }
    }
  }
});


function land_unable_tip(player) {
  if(!config.land.show || tool.to_bool(land.hide)){return;}
  mc.run(() => {
    mc.set_ActionBar(player, "§e你无权在领地内操作");
  });
  player.last_warn = Date.now();
}

register_system("land" , {
  get_land : get_land,
  is_land_id_valid : is_land_id_valid,
  get_land_member_level : get_land_member_level,
})