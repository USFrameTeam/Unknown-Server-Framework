import * as tool from "./Tool.js";


var trans_info = {};
var tran_standard_symbols = {};
var tran_special_symbols = {};

//文本格式化
//注意判断传入的玩家是否存在，部分情况不会传入玩家(传入null)
//is_global => true表明这个转义与玩家无关
export function register_symbol(is_special = false , symbol = "symbol" , is_gloabl = false , description = "", func = return_empty){
    if(is_special){
        tran_special_symbols.push({
          id : symbol,
          is_gloabl : is_gloabl,
          description : description,
          func : func,
        });
        return;
    }
    tran_standard_symbols.push({
      id : symbol,
      is_gloabl : is_gloabl,
      description : description,
      func : func,
    });
}

export function get_symbol_description(is_gloabl = false){
    let text = "\n此内容启用了转义，输入以下内容会自动转换";
    for(let symbol of tran_standard_symbols){
      if(symbol.is_gloabl || !is_gloabl){
        text += "\n" + "/" + symbol.id + ">>" + symbol.description;
      }
    }
    for(let symbol of tran_special_symbols){
      if(symbol.is_gloabl || !is_gloabl){
        text += "\n" + symbol.id + "()>>" + symbol.description;
      }
    } 
}

export function get_time_text(date){
  return format("[[0]:[1]:[2] [3]:[4]:[5]]",[
    date.getFullYear(),getMonth() + 1 ,date.getDay(),date,getHours(),date.getMinutes(),date.getSeconds()
  ]);
}

function return_empty(player){
    return "";
}

export function tran_text(player = null, texts, keep_array = false) {
    //内部定义(转外部定义)(还有个计分板：things["board." + b.id + ".score"])
        // things = {
          // name: player.name,
          // pos: pos_string(player.location),
          // dimension: player.dimension.name,
          // tag: get_chat_tag(player),
          // health: String(Math.ceil(player.health.currentValue)),
          // level: String(player.level),
          // respawn: get_block_pos({
            // location: spawn
          // }),
          // join: String(player.info.join_times)
        // }
    //trans_info需要定义(在Mc.js)
    var tran = function (line) {
        if (line.startsWith("**")) {}
        else {
            if (tool.string_has(line, "/")) {
                for (var symbol of tran_standard_symbols) {
                  line = line.replaceAll("/" + symbol, tran_standard_symbol_functions[symbol]);
                }
                for (var symbol of tran_special_symbols) {
                    const front_symbol = "/" + symbol + "(";
                    if(tool.string_has(front_symbol)){
                        let index = line.indexOf(front_symbol);
                        while(index !== -1){
                            const index2 = line.indexOf(")", index);
                            index = line.indexOf(front_symbol);
                        }
                    }
                }
                
            
            if (string_has(line, "var(")) {
                while (line.indexOf("var(") !== -1) {
                  var index = line.indexOf("var(")
                  var index2 = line.indexOf(")", index)
                  if (index2 !== -1) {
                    line = line.slice(0, index) + to_string(vars[line.slice(index + 4, index2)]) + line.slice(index2 + 1)
                  } else {
                    line = line.slice(0, index) + to_string(vars[line.slice(index + 4)])
                  }
                }
              }
            }
        }

    line = line.replaceAll("/n", "\n")
    return line
  }

  var text = []

  if (is_array(texts)) {
    for (var cf = 0; cf < texts.length; cf++) {
      text.push(tran(texts[cf]))
    }

    if (keep_array) {
      return text
    } else {
      return array2string(text, "", true)
    }
  }
  if (is_string(texts)) {
    text = tran(texts)
  }

  return text
}

//格式化文本 将[0][1]等进行格式化
export function format(text, replacer) {
  text = get_text(text);
  for (var i = 0; i < replacer.length; i++) {
    text = text.replaceAll(("[" + String(i) + "]"), String(replacer[i]))
  }
  return text
}

export function push_text(id , text){
  if(tool.is_string(text) && tool.is_string(id)){
    texts[id] = text;
  }
}

export var texts = {
    "score.bb" : "破坏方块",
    "score.pb" : "放置方块",
    "score.login" : "每日登录游戏",
    "score.pvp" : "PVP",
    "score.kill" : "杀怪",
    "score.hit" : "攻击生物",
    
    //0.6.20新增
    "input" : "输入内容",
    "back" : "返回",

    "bb" : "破坏方块",
    "pb" : "放置方块(开启前需要开启 与方块交互)",
    "ib" : "与方块交互",
    "ie" : "与生物交互",

    "unsleep" : "§e当前未入睡的玩家:",
    "home.none" : "§e[传送系统]当前无Home传送点",
    "home.back" : `§e[传送系统]欢迎回到Home坐标点`,
    "home.select" : "选择Home点",
    "home.select2" : "选择你的Home点,点击立即传送.",
    "tp.fail" : "无请求或玩家不存在！",
    "board.diable" : "§e留言板功能未开启",
    "board" : "留言板",
    "board.go" : "留言",
    "board.content" : "留言内容",
    "board.new" : "新增留言",
    "board.clear" : "清空留言板",
    "sign.tip" : "§e双击告示牌以编辑",
    "talk.stop" : `你已被禁言！剩余[0]s`,
    "talk.public" : "私聊玩家已离线，当前已切换为公共聊天",
    "talk.public.group" : "聊群不存在，当前已切换为公共聊天",
    "point.get" : "已选取坐标点",

    "group.init" : "群组 - [0]",
    "group.name" : "群组名:",
    "group.id" : "群组ID:",
    "group.announcement" : "公告：",
    "group.owner" : "群主：",
    "group.member" : "群员：",
    "group.his" : "历史消息",

    "mobGriefing" : "生物破坏",
    "keepInventory" : "死亡不掉落",
    "tntExplodes" : "TNT爆炸",
    "showCoordinates" : "显示坐标",
    "pvp" : "PVP",
    "doMobSpawning" : "生物生成",
    "doImmediateRespawn" : "立即重生",
    "commandBlocksEnabled" : "允许命令方块",

    //----------------------

    "follow.tip" : "跟踪开始后，你可以使用+op命令退出跟踪.",

    "action.land" : "空手[点击]/[右键]方块以选取坐标点\n输入+land 或 打开主菜单创建领地\n潜行时输入+land 或 打开主菜单取消创建",

    "commands.cd" : "打开主菜单",
    "commands.op" : "打开管理界面",
    "commands.tpaccept" : "玩家互传",
    "commands.home" : "Home点传送",
    "commands.back" : "返回死亡点",
    "commands.die" : "自杀",
    "commands.land" : "创建领地",
    "commands.unland" : "取消创建领地",
    "commands.unsleep" : "显示未入睡玩家",
    "commands.tpr" : "随机传送",
    
    "log.chat" : "聊天记录(Chat.log)",
    "log.chat_" : "聊天显示在日志服务器控制台",
    "log.lo" : "记录玩家位置/每60s",
    "log.die" : "玩家死亡记录",
    "log.kill" : "玩家击杀记录",
    "log.jl" : "玩家进出游戏记录",
    "log.info" : "玩家信息",
    "log.chest" : "容器记录",
    "log.pb" : "放置方块记录",
    "log.bb" : "破坏方块记录",
    "log.tp" : "USF内置传送记录",
    "log.di" : "维度改变记录",
    "log.ib" : "与方块交互",
    "log.info" : "玩家信息(Info.log)",
    "log.sign" : "告示牌更改记录(Sign.log)",
    
    "overworld.name" : "§b主世界§r",
    "end.name" : "§5末地§r",
    "nether.name" : "§4下界§r",
    "Log/start": "USF插件已启动！",
    "Log/reload_all": "USF加载完成！",
    "Log/watchdog" : "性能监视器：@0",

    "land.4" : "§e[管理员]§r",
    "land.3" : "§e[领地主]§r",
    "land.2" : "§e[领地成员]§r",
    "land.1" : "§e[群组成员]§r",
    "land.0" : "§e[访客]§r",
    "land.two" : "未选择两个坐标点",
    "about" : ["服务器信息§?Something about the Server"],
    "board_text" : ["欢迎来到服务器§?Welcome to this Server!"],
    "menu": ["欢迎来到主菜单§?Welcome to the Menu"],
    "helps" : ["你好，欢迎使用帮助页面§?Hi,welcome to Help Page","命令使用大全：§?Plugin Commands:","cd,主菜单：打开主菜单§?cd : Open the menu","talk,私聊：打开私聊界面§?talk : open Private chat Page","die,死：立即自杀§?Kill yourself immediately","tpaccept : 同意tpa请求§?tpaccept : Accept others' tp request"],
    
    "tip.init":"欢迎使用USF，当前插件未初始化！\n在聊天栏输入§b/function get_owner§r获取§6超级管理员§r\n或在服务器后台输入§n/scriptevent usf:get_owner 玩家名§r获取\n注意：单人存档的插件OP和服务器的插件OP无法互通，请先上传到服务器再初始化！",
    
    "data/die" : "死亡记录",
    "data/break" : "挖掘方块量",
    "data/place" : "放置方块量",
    "data/join" : "加入游戏次数",
    "data/chat" : "聊天数",
    "data/health" : "玩家(带Health标签的实体)生命值",
    "data/x" : "当前位置x轴",
    "data/y" : "当前位置y轴",
    "data/z" : "当前位置z轴",
    "data/di" : "当前维度(0=主世界 1=下界 2=末地 3=其他)",
    "data/sneak" : "玩家潜行时间(0=未潜行)(1秒=10)",
    "data/slot" : "玩家选择的快捷栏",
    "data/health_listen" : "生命值监听",
    
    
    "tran_text" : "\n/worldspawn >> 世界出生点\n/pos >>玩家当前位置\n/§rlist >>玩家列表\n/§rname >>玩家名称\n/§ralltime >>世界运行总时间(秒)\n/§rboard.记分版ID.score >>玩家记分版分数\n/§rdimension >>玩家所在维度\n/tag >>聊天头衔\n/health >>玩家生命值\n/n >> 换行\n/unsleep >>未入睡玩家\n/worldspawn >>世界出生点\n/respawn >> 玩家出生点\n/join >>玩家进入游戏次数\n/items >> 掉落物数量\n/date >>年.月.日\n/time >>时.分.秒\n/level >>等级\nvar()>>显示全局变量，括号内输入变量名",
    "tran_text_" : "\n此内容启用了转义，输入以下内容会自动转换\n/worldspawn >> 世界出生点\n/§rlist >>玩家列表\n/§ralltime >>世界运行总时间(秒)\n/n >> 换行\n/unsleep >>未入睡玩家\n/worldspawn >>世界出生点\n/items >> 掉落物数量\n/date >>年.月.日\n/time >>时.分.秒\nvar()>>显示全局变量，括号内输入变量名",
    "tran_mess" : "\n/§rsender >>发送者名称\n/§rtag >>聊天头衔/§rtext >>聊天内容",
    
    "Scriptevent/error/NotFound" : "[USF]你所找的命令\"@0\"不存在",
    
    "Weather.Rain.Thunder" : "§e天气转为：雷雨",
    "Weather.Rain" : "下雨",
    "Weather.Thunder" : "雷暴",
    "Weather.Clear" : "晴天",

    "tp/callback" : "",

    "framework/Closed" : "插件状态  [开启｜关闭]",

    "OP/Enable" : "OP  [否｜是]",
    "OP/Player" : "玩家管理功能",
    "OP/BanList" : "封禁列表管理",
    "OP/Score" : "记分版修改",
    "OP/BagCheck" : "背包检查",
    "OP/Setting" : "修改插件设置",

    "slot/0" : "物品栏1",
    "slot/1" : "物品栏2",
    "slot/2" : "物品栏3",
    "slot/3" : "物品栏4",
    "slot/4" : "物品栏5",
    "slot/5" : "物品栏6",
    "slot/6" : "物品栏7",
    "slot/7" : "物品栏8",
    "slot/8" : "物品栏9",


    "Pictures.world" : "地球",
    "Pictures.bottle" : "药水瓶",
    "Pictures.chat" : "聊天框",
    "Pictures.star" : "星星",
    "Pictures.glass" : "放大镜",
    "Pictures.coin" : "金币",
    "Pictures.missing" : "材质丢失",
    "Pictures.bed" : "床",
    "Pictures.boat" : "船",
    "Pictures.endereye" : "末影之眼",
    "Pictures.emerald" : "绿宝石",
    "Pictures.trident" : "三叉戟",
    "Pictures.wheat" : "小麦",
    "Pictures.bell" : "钟",
    "Pictures.sign" : "告示牌",
    "Pictures.totem" : "不死图腾",
    "Pictures.ore" : "钻石矿",
    "Pictures.end" : "末地石",
    "Pictures.flower" : "花",
    "Pictures.path" : "草径",
    "Pictures.snow" : "雪",
    "Pictures.hay" : "干草块",
    "Pictures.gift" : "礼物",
    "Pictures.ice" : "冰",
    "Pictures.mushroom" : "菌丝",
    "Pictures.sand" : "沙石",
    "Pictures.netherrack" : "下界岩",
    "Pictures.nether" : "下界砖块",
    "Pictures.rail" : "铁路",
    "Pictures.wool" : "羊毛",
    "Pictures.tnt" : "TNT",
    "Pictures.lamp" : "红石灯",
    "Pictures.mob" : "刷怪笼",
    "Pictures.campfire" : "篝火",
    "Pictures.bucket" : "水桶",
    "Pictures.chest" : "箱子",

    "Pictures.meat" : "肉",
    "Pictures.book" : "书本",
    "Pictures.bow" : "弓",
    "Pictures.cake" : "蛋糕",
    "Pictures.ex" : "经验瓶",
    "Pictures.rod" : "钓鱼竿",
    "Pictures.sword" : "剑",
    "Pictures.shovel" : "铲",
    "Pictures.pickaxe" : "镐",
    "Pictures.axe" : "斧",
    "Pictures.hoe" : "锄",
    "Pictures.kelp" : "海带",
    "Pictures.map" : "地图",
    "Pictures.bottle" : "水瓶",
    "Pictures.trade" : "交易",
    "Pictures.bed" : "红床",
    "Pictures.boat" : "船",
    "Pictures.lantern" : "灯笼",
    "Pictures.commmand" : "命令方块",

    "PlayerChoise/title":"玩家选择器"
}

export var text_dictionary = {
    
}

export function get_text(id,lang){
    if(is_string(id)){
        let text = text_dictionary[id];
        if( text == undefined){
          text = texts[id];
        }
        return is_string(text) ? text : id;
    }
    return "??";
}

function is_string(v){
     return typeof(v) == "string" ? true : false;
}

