import { has_system , get_system , config ,save_config } from "./Basic/Core.js";
import { data_format, get_data , save_data } from "./Basic/Data.js";
import * as tool from "./Basic/Tool.js";
import * as event from "./Basic/Event.js";
import { infoBar , btnBar } from "./Basic/ui.js";
import * as mc from "./Basic/Mc.js";
import { format , get_text, push_text} from "./Basic/Text.js";
import { get_op_level } from "./Basic/Permission.js";
import { is_in_manager_mode , get_name_by_id , get_id} from "./Basic/Player.js";
import * as command from "./Command.js";


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
    }//TODO

    load_lands();
    loaded = true;
    
    for(let player of mc.get_all_players()){
      load_player_lands(player);
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
        mc.set_ActionBar(player, ` `);
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
      push_text("land.show" , "您已进入领地:[0]\n领地创建者:[1]\n您的身份是:[2]")
      let text = format(get_text("land.show"),[land.name , (tool.to_bool(land.public) ? "公共领地" : get_name_by_id(land.creater)) , get_text("land." + String(level))]);
      text += "\n§r" + land.wel;
      if(Date.now() - to_number(player.last_warn, 0) > 1500){
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
  }

  ui.options("type", "操作", ["更新预览范围", "取消创建", "确认创建"], 0);
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
              location: b.location,
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
              location: b.location,
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
          land.name = r.name;
          land.price = price;
          land.type = "box";
          const center = {
            x : (points[0].x + points[1].x)/2,
            z : (points[0].z + points[1].z)/2,
          }
          land.distance = Math.round(Math.sqrt(Math.pow(Math.abs(center.x), 2) + Math.pow(Math.abs(center.z), 2)));
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
          land.name = r.name;
          land.type = "circle";
          land.price = price;
          land.distance = Math.round(Math.sqrt(Math.pow(Math.abs(land.from.x), 2) + Math.pow(Math.abs(land.from.z), 2)));
          break;
      }

      if (r.public === true) {
        land.public = r.public;
      }

      if(tool.is_object(player.landing.shape)){
        mc.remove_shape(player.landing.shape);
      }
      
      add_land(player, land);
      save_land(land);
      player.landing.able = false;
      player.landing.points = [];
    })
    });
    
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
  player.lands.push(land.id);
  save_player_lands(player);
}

function save_land(land) {
  save_data(`land.${land.id}`, tool.to_json(land));
}

function is_preland_in_other(di, type , lo1 , lo2 , lo3 = 0) {
  const center ;
  switch(type){
    case "box":
      center = {
        x: (lo1.location.x + lo2.location.x) / 2,
        y: (lo1.location.y + lo2.location.y) / 2,
        z: (lo1.location.z + lo2.location.z) / 2
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

function settingBar(player,back = false){
    const ui = new infoBar();
    ui.title = "领地设置";
    ui.cancel = () => {
        event.emit_custom_event("setting_changed",{player : player , back : back});
    }
    ui.toggle("able", "[禁用 | 启用]", config.land.able);
    ui.range("max", "可创建领地数量(管理员可无限创建)", 0, 100, 1, config.land.max);
    ui.input("currency", "领地扣费货币ID", "输入id", config.land.currency);
    ui.range("price", "领地价格/每方块(最后价格约成整数)", 0, 10, 1, config.land.price);
    ui.toggle("must", "金额必须足够(若关闭，则记分板可能会被扣费成负数)", config.land.must);
    ui.toggle("mode", "进入领地强制冒险模式(管理员不受限)", config.land.mode);
    ui.options("2d" , "2D模式" , ["禁用" , "可选" , "强制"] , config.land["2d"]);
    ui.range("radius" , "圆形领地最大半径(方形领地最大边长为圆形领地半径*1.4)" , 64 , 512 , 1 , config.land.radius);
    ui.input("var" , "映射到自定义变量的ID(设置后，玩家进入领地，对应的自定义变量赋值为领地ID)","输入变量ID" , config.land.var);

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
//2200

function land_unable_tip(player) {
  mc.run(() => {
    mc.set_ActionBar(player, "§e你无权在领地内操作");
  })
  player.last_warn = Date.now();
}