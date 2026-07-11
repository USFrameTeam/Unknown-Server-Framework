import { world } from "@minecraft/server";
import * as tool from "./Tool.js";

//命名空间
export const namespace = "usfV2:";

export function save_data(id, content, en = null) {
  const target = en === null ? world : en;
  target.setDynamicProperty(namespace + id, content);
}

export function get_data(id, en = null) {
  const target = en === null ? world : en;
  const data = target.getDynamicProperty(namespace + id);

  return typeof tool.is_string(data) ? data : "";
}

export function clear_data(id) {
  world.setDynamicProperty(namespace + id);
}

export const usf_config = {
    "name":{
        "format" : "/name",
        "able":false
    },
    "hacker" : {
        allow : [ "chest" ],
        back : false,
        kick : false
    },
    "rule" : {
        able : false,
        data : ""
    },
    "chat_board":{
    able : false
    },
    "config_item" : {},
    "groups" :{
        "able" : false,
        "max" : 2, //每人可创建的群组
    },
    "other":{
        "chat_board":false,
        "online" : ""
    },
    "land":{
        "able":false,
        "max":2,//没人最大领地数
        "currency" : "",
        "price" : 0,//价格
        "must" : true,//不允许欠费
        "show" : "§e你已进入/name的领地！",
        "view" : false,
        "mode" : false,//锁定冒险模式
        "2d" : 0,
        //0-禁用 1-可选 2-强制
        "radius" : 512,
        //最大半径 TODO
    },
    "log" : {
        "able" : true,
        "down" : 30, //连接时间
        "address" : "http://127.0.0.1:1024/",
        "allow" : []
    },
    "tp" : {
        "random_range":10000,
        "per" : true,//个人传送点
        "per_conut" : 50,
        "world_count":200,//todo
        "world_edit": false,//todo
        "die" : false,//死亡
        "back" : false,//返回
        "down" : 30,
        "pp" : false,//TPA
        "share" : true,//分享传送点
        "world" : false,//世界传送点
        "group" : false, //群组传送点
        "random_end" : true,//末地使用随机传送
        "animation": false
    },
    "board" : { //公告(notification)
        "able" : false,//启用
        "first" : "",//发送给新成员
        "_" : ""//默认公告
    },
    "hurt":{
        "able" : false,
        "type" : 0  //""
    },
    "time":{
        "able" : false,
        "type" : 0 , //0为秒,1为分钟
        "show" : false
    },
    "tip" : {
        "able" : false
    },
    "chat" : {
        "format" : "[/sender] /text",
        "tag" : "",//默认头衔
        "clear" : false,
        "length" : 1024,
        "disable" : false
    },
    "cd_items" : ["minecraft:clock"],
    "ban_entity" : [],
    "ban_item" : [],
    "ban_block" : [], 
    "scores": [],
    "score":{
        "able" :false,
        "id" : ""
    },
    "bank" : {
        able : false,
        allow_transfer : [],//允许玩家转账的货币
        tranform : [],//可转账的货币
        tip : 0, //手续费(百分比)
    },
    "game":{
        "kill" : false,
        "creeper" : false,
        "sign" : false,
        "r_in" : 0,
        "r_di" : 0,
        "r_rs" : 0,
        "fb" : false,
        "lock": false,//非op锁定生存
    },
    "store" : {
        "able" : false,
        "moneys" : "",
        "groups" : {}
    },
    "commands" : [ "cd" , "op" , "tpaccept" , "home"],
    "copy_boards" : "",
    "mini" : {
        land_tag : false,
        clear_tag : false
    },
    "timer" : "",
    "limit" : {},
    "daily":{
        able : false,
        command : ""
    },
    "var" : {
        "save" : 60,//自动保存时隔
    }
}

export const data_format = {
    //0-string 1-int 2-float
    job_format : {
    },
    command_format : {
        code : [0],
        open : [0],
        hotbar : [1],
        name : [0,0],
        knock : [2,2,2,2],
        health : [0,2],
        tag : [0],
        fire : [2],
        show : [0,0,0],
        ui : [0],
        back : [],
        tpa : [],
        commandblock : [1,1,1],
        var : [0,0,0],
        test : [1,1,0,0,0],
        get : [0,0,0]
    },
    item_events : ["knock","runner","tp"],
    score : ["die","di","bb","pb","damage","health","kill","join","buy","earn","hurt","hurt_time","kill_monster"],
    events : ["join","die","pos","chat","di","bb","pb","attack","sleep","kill"],
    land_permission : [
        "bb",//放置方块
        "ib",//方块交互
        "ie",//实体交互
        "pb"//放置方块
    ],
    hacker : [ "chest" ],
    commands : [ "cd" , "op" , "tpaccept" , "home" , "back" , "die" , "unsleep" , "land" , "tpr" , "unland"],
    logs : [
        "chat",
        "chat_",
        "jl", //加入/退出游戏
        "bb",//破坏方块
        "pb", //放方块
        "di",
        "kill",
        "die",
        "sign" ,
        "lo", 
        "chest",
        "tp",//传送
        "info",
        "ib",
    ],
    allow_blocks:[
        "minecraft:crafting_table",
        "minecraft:smithing_table",
        "minecraft:stonecutter_block",
        "minecraft:loom",
        "minecraft:enchanting_table",
        "minecraft:ender_chest",
    ],
    lock_item :{
        able : false,
    },
    info :{ //玩家info
        join_times : 0,
        block : false,
        ban_time : 0,
        score : {},
        manager : false,
    },
    config_file : {
        title : "",
        body : "",
        groups : {},
        things : []
    },
    board : {
        able : true,
        texts : [],
        up : false,
        name : "",
        icon : null
    },
    group :{
        creater : "",
        member : [],
        message : [],
        name : "",
        board : "",
        pos : [],
        id : "",
        in : [],
    },
    pos : {
        owner : "",
        di : "",
        x : 0,
        y : 0,
        z : 0,
        name : "",
        icon : "",
        home : false,
        top : false,//是否置顶
        //该数据结构在Pos.js中亦存在，请同步更改
    },
    land:{//Land.js同步
        "id" : "",
        "di" : "minecraft:overworld",
        "distance" : 0, //中心点离(0,0)的距离
        "type" : "box",//box / circle
        //Box
        "from" : {
            x: 0, y: 0, z:0
        },
        "to" : {
            x: 0, y: 0, z:0
        },
        //Cylinder
        "radius": 10 , //半径
        "height" : 10,//高度半径
        //原点使用from
        "creater": "",
        "group" : [], //开放的群组(权限为成员)
        "member":[],
        "op" : [],//管理员
        "wel" : "", //欢迎语
        "name" : "",
        "mem_per" : [],//成员权限
        "other_per" : []//访客权限
    },
    lock_config : {
        able : false,
        items : []
    },
    good : {   
        id : "",
        state : 0 ,
        group : "",
        title : "",
        index : 0,
        global_count : 0,
        personal_count : 0,
        update_type : 0,
        update_time : 60, 
        money : "", 
        money_item : "minecraft:", 
        price : 1, 
        icon : "", 
        custom_icon : "", 
        name : "",
        description : "",
        chest : "", 
        slot : 0, 
        item : "minecraft:", 
        hide : false, 
        bar : 0, 
        count : 1,
        code : "",
        back : false,
        type : 9,
        last : 0,
        updated : 0,
    }
}


const ui_path = "textures/ui/"
export const ui_icon = {
    right : ui_path + "arrow_dark_right.png",
    star : ui_path + "permissions_member_star.png",
    sword : "textures/items/iron_sword.png",
    slow_ness : ui_path + "slowness_effect.png",
    heart : ui_path + "heart_new.png",
    key_board : ui_path + "chat_keyboard.png",
    stick : "textures/items/stick.png",
    stop : "textures/blocks/barrier.png",
    land : ui_path + "icon_new.png",
    trade : ui_path + "trade_icon.png",
    scoreboard : ui_path + "subscription_glyph_color.png",
    chat : ui_path + "comment.png",
    ok : ui_path + "confirm.png",
    x : ui_path + "crossout.png",
    craft_table : ui_path + "icon_crafting.png",
    rubbish : ui_path + "trash_default.png",
    op : ui_path + "op.png",
    event : ui_path + "saleribbon.png",
    villager : ui_path + "icon_deals.png",
    pos:ui_path + "paste.png",
    map : ui_path + "icon_map.png",
    random : ui_path + "icon_random.png",
    group : ui_path + "dressing_room_skins.png",
    info : ui_path + "infobulb.png",
    copy : ui_path + "copy.png",
    up : ui_path + "tooltip_inverted_chevron.png",
    down : ui_path + "arrow_down_small.png",
    slot : ui_path + "selected_hotbar_slot.png",
    back : ui_path + "arrow_dark_left_stretch.png",
    server : ui_path + "servers.png",
    setting : ui_path + "gear.png",
    ping : ui_path + "Ping_Green.png",
    content : ui_path + "hanging_sign.png",
    brush : ui_path + "text_color_paintbrush.png",
    off : ui_path + "Ping_Offline_Red_Dark.png",
    system : ui_path + "timer.png",
    tip : ui_path + "UpdateGlyph.png",
    online : ui_path + "online.png",
    share : ui_path + "share_microsoft.png",
    go : ui_path + "send_icon.png",
    delete : ui_path + "realms_red_x.png",
    edit : ui_path + "book_edit_default.png",
    more : ui_path + "anvil_icon.png",
    add: ui_path + "anvil-plus.png",
    compass : "textures/items/compass_item.png",
    player : ui_path + "Friend2.png",
    clock : "textures/items/clock_item.png",
    command : "textures/blocks/command_block_front_mipmap.png",
    "sign" : "textures/items/sign.png" ,
    manager : ui_path + "anvil_icon.png",
    die :ui_path + "wither_effect.png",
    speed :ui_path + "speed_effect.png",
    eye : ui_path  + "night_vision_effect.png",
    mute : ui_path + "mute_on.png",
    "world" : ui_path + "world_glyph_color_2x.png" ,
    "big" : ui_path + "icon_preview.png",
    "water" : ui_path + "water_breathing_effect.png",
    lock : ui_path + "icon_lock.png",
}

export const pictures = {
     "world" : ui_path + "world_glyph_color_2x.png" ,
     "bottle" : ui_path + "achievements.png" ,
     "chat" : ui_path + "comment.png" ,
     "star" : ui_path + "filledStar.png" ,
     "glass" : ui_path + "magnifyingGlass.png" ,
     "coin" : ui_path + "MCoin.png" ,
     "gift" : ui_path + "gift_square.png",
     "missing" : "textures/misc/missing_texture.png" ,
     "bed" : "textures/items/bed_red.png" ,
     "boat" : "textures/items/boat_oak.png" ,
     "emerald" : "textures/items/emerald.png" ,
     "endereye" : "textures/items/ender_eye.png" ,
     "sign" : "textures/items/sign.png" ,
     "totem" : "textures/items/totem.png" ,
     "bell" : "textures/items/villagebell.png" ,
     "wheat" : "textures/items/wheat.png" ,
     "trident" : "textures/items/trident.png" ,
     "ore" : "textures/blocks/diamond_ore.png" ,
     "end" : "textures/blocks/end_stone.png" ,
     "flower" : "textures/blocks/flower_rose.png" ,
     "path" : "textures/blocks/grass_path_side.png" ,
     "snow" : "textures/blocks/grass_side_snowed.png" ,
     "hay" : "textures/blocks/hay_block_side.png" ,
     "ice" : "textures/blocks/ice.png" ,
     "mushroom" : "textures/blocks/mycelium_side.png" ,
     "rail" : "textures/blocks/rail_normal.png" ,
     "nether" : "textures/blocks/nether_brick.png" ,
     "netherrack" : "textures/blocks/netherrack.png" ,
     "sand" : "textures/blocks/sandstone_smooth.png" ,
     //V2
     "wool" : "textures/blocks/wool_colored_white.png" ,
     "lamp" : "textures/blocks/redstone_lamp_on.png" ,
     "mob" : "textures/blocks/mob_spawner.png" ,
     "tnt" : "textures/blocks/tnt_side.png" ,
     "bucket" : "textures/items/bucket_water.png" ,
     "campfire" : "textures/items/campfire.png" ,
     "chest" : "textures/blocks/chest_front.png" ,

     "meat" : "textures/items/beef_cooked.png",
     "book" : "textures/items/book_normal.png",
     "bow" : "textures/items/bow_standby.png",
     "cake" : "textures/items/cake.png",
     "ex" : "textures/items/experience_bottle.png",
     "rod" : "textures/items/fishing_rod_uncast.png",
     "sword" : "textures/items/gold_sword.png",
     "shovel" : "textures/items/gold_shovel.png",
     "pickaxe" : "textures/items/gold_pickaxe.png",
     "axe" : "textures/items/gold_axe.png",
     "hoe" : "textures/items/gold_hoe.png",
     "kelp" : "textures/items/kelp.png",
     "map" : "textures/items/map_filled.png",
     "bottle" : "textures/items/potion_bottle_absorption.png",
     "trade" : ui_path + "trade_icon.png",
     "bed" : "textures/items/bed_red.png",
     "boat" : "textures/items/boat_oak.png",
     "lantern" : "textures/items/lantern.png",
     "commmand" : "textures/blocks/command_block_back_mipmap.png",
}

export const minecraft = {
    sign : [
        "standing_sign",
        "spruce_standing_sign",
        "birch_standing_sign",
        "jungle_standing_sign",
        "acacia_standing_sign",
        "darkoak_standing_sign",
        "mangrove_standing_sign",
        "cherry_standing_sign",
        "bamboo_standing_sign",
        "crimson_standing_sign",
        "warped_standing_sign",
        "wall_sign",
        "spruce_wall_sign",
        ""
    ]
}

export const command_list = [ "tppoint","login","Ban","Version","NPC","Npc","land","Fill","tpaccept","reset" , "cd" , "菜单" , "talk" , "私聊" , "tp" , "传送" , "死" , "die", "usf"]
