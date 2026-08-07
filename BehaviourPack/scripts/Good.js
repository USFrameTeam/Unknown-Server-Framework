
import { ItemStack } from "@minecraft/server";
import * as event from "./Basic/Event.js";
import { ui_icon , get_data , save_data , clear_data, pictures } from "./Basic/Data.js";
import * as logger from "./Basic/Logger.js";
import * as tool from "./Basic/Tool.js";
import { has_system ,get_system, config, save_config, overworld } from "./Basic/Core.js";
import { btnBar, infoBar } from "./Basic/ui.js";
import { tip } from "./Basic/UniversalUI.js";
import { format } from "./Basic/Text.js";
import { get_block, get_structure_manager, has_item_type, run_interval, run_job } from "./Basic/Mc.js";

var global_goods = [];

/* 
Goods.js
功能：全局商店
*/

event.connect_custom_event("world_load",(things) => {
    global_goods = tool.to_array(tool.parse_json(get_data("global_goods_v2")), []);

    //注册设置
    if(has_system("setting")){
      get_system("setting").register_setting("pos","编辑全局商品",editGlobalGoodBar);
    }

    logger.log(0,1,"————商品系统已加载————");
});

event.connect_custom_event("player_join" , (options) => {
    const player = options.player;
    player.buy_record = tool.to_object(tool.parse_json(get_data("buy_record" , player)));
    let refresh = false;
    for(const id of Object.keys(player.buy_record)){
        if(!tool.array_has(global_goods , id)){
            delete player.buy_record[id];
            refresh = true;
        }
    }
    if(refresh){
        save_player_buy_record(player);
    }
});

function save_player_buy_record(player){
    save_data("buy_record" , tool.to_json(tool.to_object(player.buy_record)) , player);
}

function editGlobalGoodBar(player , back , page = 0 , index = -1){
    const max_page = Math.max(1,Math.ceil(global_goods/50));
    page = Math.max(0,Math.min(max_page -1 , page));
    const ui = new btnBar();
    ui.title = "编辑全局商品";
    ui.cancel = () => {
        event.emit_custom_event("setting_changed",{ player : player , back : back});
    }
    ui.body = [
        "此处管理所有商品",
        `目前共有${global_goods.length}个商品`,
        `第${page + 1} / ${max_page}页`
    ];
    ui.btns = [{
        text : "搜索商品",
        icon : pictures.glass,
        func : () => {
            searchGoodBar(player , back , page);
        }
    },{
        text : "复制商品",
        icon : ui_icon.copy,
        func : () => {
            const ui2 = new infoBar();
            ui2.cancel = () =>{
                editGlobalGoodBar(player , back , page ,index);
            }
            ui2.title = "复制商品";
            ui2.input("id" , "要复制的商品ID" , "请输入ID" , "");
            ui2.range("count" , "要复制的份数" , 1 , 50 , 1 ,1);
            ui2.show(player , (r) => {
                if(tool.array_has(global_goods , r.id)){
                    const good = get_good(r.id);
                    for(let i = 0 ;i < r.count ; i++){
                        const new_id = r.id + "_" + String(i);
                        global_goods.push(new_id);
                        save_data("Good." + new_id , tool.to_json(good));
                    }
                    save_global_goods();
                    editGlobalGoodBar(player , back , page);
                }else{
                    tip(player , "您输入的商品ID不存在！" , () => {
                        editGlobalGoodBar(player , back , page ,index);
                    });
                }
            });
        }
    },{
        text : "上一页",
        icon : ui_icon.up,
        func : () => {
            editGlobalGoodBar(player , back , page -1 , index);
        }
    },{
        text : "下一页",
        icon : ui_icon.down,
        func : () => {
            editGlobalGoodBar(player , back , page +1 , index);
        }
    },{
        text : "跳转至页面",
        icon : ui_icon.eye,
        func : () => {
            const ui2 = new infoBar();
            ui2.cancel = () => {
                editGlobalGoodBar(player , back , page , index);
            }
            ui2.title = "跳转至页面";
            ui2.range("page" , "页面" , 1 , max_page , 1 , page +1);
            ui2.show(player , (r) => {
                editGlobalGoodBar(player , back , r.page -1 , index);
            });
        }
    },{
        text : "添加商品",
        icon : ui_icon.add,
        func : () => {
            editGoodBar(player , back , page , "" );
        }
    }];
    //这里共5个按钮,下方插入要匹配

    const max_index = Math.min(global_goods.length , page * 50 + 50);
    for(let i = page * 50 ; i < max_index ; i++){
        const good = get_good(global_goods[i]);
        const btn  = {
            text : format("商品名称:[0]\n备注:[1]",[good.name , good.explain]),
            op : {index : i},
            func : (op) => {
                editGoodBar(player , back , page , global_goods[op.index]);
            }
        };
        if(i === index){
            ui.btns.splice(5,0,btn);
        }else{
            ui.btns.push(btn);
        }
    }

    ui.show(player);

}

function searchGoodBar(player , back , page){
    const ui = new btnBar();
    ui.title = "搜索商品";
    ui.cancel = () => {
        editGlobalGoodBar(player , back , page);
    }
    ui.input("str" , "搜索内容(支持名称、ID、备注)" , "请输入文本" , "");
    ui.show(player , (r) => {
        run_job(search_goods(player , back , page , r.text));
    });
}

function* search_goods(player , back , page , text){
    const length = global_goods.length;
    const results = [];
    for(let i = 0 ; i < length ; i++){
        const good = get_good(global_goods[i]);
        if(!is_good_data_valid(good)){continue;}
        if(tool.string_has(good.name , text) || tool.string_has(good.explain , text) || tool.string_has(global_goods[i] , text)){
            results.push({
                name  : good.name,
                explain : good.explain,
                index : i,
            });
        }
        if(good % 50 === 0){yield;}
    }

    if(results.length === 0){
        tip(player , "搜索无结果!" , () => {
            editGlobalGoodBar(player , back , page);
        });
    }else{
        const ui = new btnBar();
        ui.cancel = () => {
            editGlobalGoodBar(player , back , page);
        }
        ui.title = "搜索结果";
        for(const result of results){
            ui.btns.push({
                text : format("商品名称:[0]\n备注:[1]",[result.name , result.explain]),
                op : {index : result.index},
                func : (op) => {
                    editGlobalGoodBar(player , back , Math.floor(op.index / 50) , op.index);
                }
            });
        }
    }
}

function editGoodBar(player , back , page = 0 , id = ""){
    let is_new = false;
    const good = (id === "") ? {} : get_good(id);
    if(!is_good_data_valid(good)){is_new = true;}

    if(!is_new){editGoodDetailBar(player , back , page , id , good);return;}
    const ui = new infoBar();
    ui.cancel = () => {
        editGlobalGoodBar(player , back , page);
    }
    ui.title = "选择商品类型";
    ui.input("id" , "商品ID(用于自定义界面，请勿留空)" , "请输入文本" , "");
    ui.options("type", "类型", ["售卖物品(记录所有特殊值)", "收购物品(仅记录物品ID)", "礼品(直接显示领取按钮)"], 0);
    ui.show(player , (r) => {
        if(r.id === "" || tool.array_has(global_goods , r.id)){
            tip(player , "当前商品ID不合法，请修改重试！",() => {
                editGoodBar(player , back , page , id);
            });
            return;
        }

        const good = {
            type : r.type,
            able : true, //停售,在售
            name : "", //物品名称
            description : "",//物品简介
            explain : "",
            global_count : 0,
            global_count_last : 0,//限量剩余
            personal_count : 0,
            last_update : 0,//上次刷新时间
            last_update_index : 0,
            update_type : 0,
            update_index : 0,
            update_start : "",
            update_time : "60", //刷新间隔时间/s，选择固定时间后才有用

            currency : "", //币种(售卖、收购)
            price : 1 , //单价(售卖、收购)
            currency_item : "minecraft:", //以物易物id(售卖)
            currency_item_name : "",
            sell_type : 0,
            slot_id : "",
            chest_id  : "",
            item : "", //物品id(收购、售卖)
            count_type : 0, //数量样式(收购、售卖)
            item_count : 1, //一次交易的物品数量(售卖)
            runner : "",//执行集(礼品)
        }

        editGoodDetailBar(player , back , page , r.id , good , true);
    });
}

function editGoodDetailBar(player , back , page , id , good , is_new = false){
    const ui = new infoBar();
    ui.title = "编辑商品";
    ui.cancel = () => {
        editGlobalGoodBar(player , back , page);
    }
    if(!is_new){
        ui.input("id" , "商品ID" , "请输入文本" , id);
        ui.toggle("refresh" , "刷新物品限量" , false);
        ui.toggle("delete" , "删除" , false);
    }
    ui.toggle("able" , "状态:[停售|在售]" , good.able);
    ui.input("explain" , "备注(仅显示在编辑页面)" , "请输入文本" , good.explain);
    ui.input("name" , "商品标题与名称" , "请输入名称" , good.name);
    ui.input("description" , "商品描述" , "请输入描述" , good.description);
    ui.input("global_count",format("全服限量(填0则为无限)([0])",[(good.type === 2) ? "礼品领取次数" : "交易物品总数量"]),"请输入数字",String(good.global_count));
    ui.input("personal_count",format("个人限量(填0则为无限)([0])",[(good.type === 2) ? "礼品领取次数" : "交易物品总数量"]),"请输入数字",String(good.personal_count));
    ui.options("update_type" , "限量刷新频率" , ["不刷新" , "固定时间(请正确填写下方两项)"] , good.update_type);
    ui.input("update_time" , "刷新间隔/s(选择固定时间刷新时使用)(多个时间之间使用,间隔)(请填入>=60的整数)" , "请输入秒数" , String(good.update_time));
    ui.input("update_start" , "刷新起始时间(根据该时间推断后续刷新限量的具体时间)(格式为:年.月.日.小时)" , "请按格式输入" , good.update_start);

    if(good.type !== 2){
        let currencys = [""];
        let currency_texts = ["无(选此项无法交易)"];
        if(good.type === 0){
            currency_texts.push("以物易物");
            currencys.push("USE_CURRENCY_ITEM");
        }
        const currency_ids = get_system("pay").get_currency_ids();
        currencys.concat(currency_ids);
        currency_texts.concat(currency_ids.map((id) => {return get_system("pay").get_currency_name(id)}));
        ui.options("currency" , "货币" , currency_texts , tool.array_index(currencys , good.currency , 0));
        ui.match(currencys);
        if(good.type === 0){
            ui.input("currency_item","用作交换的物品的ID(使用以物易物作为货币时)" , "请输入物品ID" , good.currency_item);
            ui.input("currency_item_name","用作交换的物品的显示名称(使用以物易物作为货币时)" , "请输入物品名称" , good.currency_item_name);
            ui.options("sell_type" , "售卖物品类别" , ["根据物品ID" , (good.slot_id === "") ? "未录入物品" : "已录入物品" , 
                "替换为物品栏第1个物品" , "替换为物品栏第2个物品" , "替换为物品栏第3个物品" , "替换为物品栏第4个物品" , "替换为物品栏第5个物品",
                "替换为物品栏第6个物品" , "替换为物品栏第7个物品" , "替换为物品栏第8个物品" , "替换为物品栏第9个物品" ]);
        }
        ui.input("item",format("[0]的物品ID" , [good.type === 0 ? "售卖" : "出售"]),"请输入物品ID" , good.item);
        ui.input("price" , "物品单价" , "请输入数字" , String(good.price));
    }
    if(good.type === 0){
        ui.input("item_count" , "一次交易的物品数量" , "请输入数量" , String(good.item_count));
        ui.options("count_type" , "物品数量条的样式" , ["输入数量" , "快捷售卖(点击商品立即售卖)" ,  "范围条(最大值为一次交易数量的5倍)" , "范围条(最大值为一次交易数量的10倍)" , "范围条(最大值为一次交易数量的20倍)" , "范围条(最大值为一次交易数量的50倍)" , "范围条(最大值为一次交易数量的100倍)"],good.count_type);
    }
    if(good.type === 1){
        ui.options("count_type" , "物品数量条的样式" , ["输入数量" ,  "范围条(1-10)" , "范围条(1-20)" , "范围条(1-32)" , "范围条(1-64)" , "范围条(1-128)", "范围条(1-256)"],good.count_type);
    }
    if(good.type === 2){
        ui.input("runner" , "领取礼品后要执行的执行集" , "请输入执行集ID" , good.runner);
    }

    ui.show(player , (r) => {
        good.able = r.able;
        good.name = r.name;
        good.explain = r.explain;
        good.description = r.description;
        good.global_count = Math.max(Math.round(tool.parse_number(r.global_count,good.global_count)),0);
        good.personal_count = Math.max(Math.round(tool.parse_number(r.personal_count,good.personal_count)),0);
        good.update_type = r.update_type;
        if(good.update_start !== r.update_start){good.last_update = 0;}
        good.update_start = r.update_start;
        const numbers = r.update_time.split(",").map((count) => {return Math.max(60,Math.round(tool.parse_number(count,60)))});
        const time_text = "";
        if(numbers.length === 0){numbers.push(60);}
        for(let num of numbers){
            time_text += "," + String(num);
        }
        time_text = time_text.slice(1);
        good.update_time = time_text;

        switch(good.type){
            case 0:
                good.currency = r.currency;
                good.currency_item = r.currency_item;
                good.currency_item_name = r.currency_item_name;
                good.price = Math.max(tool.to_number(tool.parse_number(r.price,good.price),1),0);
                good.item = r.item;
                good.count_type = r.count_type;
                good.item_count = Math.max(Math.round(tool.parse_number(r.item_count,good.item_count,1)),1);
                good.sell_type = Math.min(1,r.sell_type);
                if(r.sell_type > 1){
                    const item = player.slots.getItem(r.sell_type - 2);
                    if(!tool.un(item)){
                        store_chest_item(item);
                    }
                }
                break;
            case 1:
                good.currency = r.currency;
                good.price = Math.max(tool.to_number(tool.parse_number(r.price,good.price),1),0);
                good.item = r.item;
                good.count_type = r.count_type;
                break;
            case 2:
                good.runner = r.runner;
                break;
        }

        if(is_new){
            global_goods.push(id);
            save_data("Good." + id , tool.to_json(good));
            save_global_goods();
            editGlobalGoodBar(player , back , page);

        }else{
            if(r.delete){
                tool.array_clear(global_goods , id);
                clear_data("Good." + id);
                save_global_goods();
                editGlobalGoodBar(player , back , page);
                return;
            }
            if(r.refresh){
                refresh_good(good);
            }
            if(r.id !== id && r.id !== "" && !tool.array_has(global_goods , r.id)){
                tool.array_clear(global_goods , id);
                clear_data("Good." + id);
                id = r.id;
                global_goods.push(id);
                save_global_goods();
            }
            save_data("Good." + id , tool.to_json(good));
            editGlobalGoodBar(player , back , page);
        }
    });

}

function refresh_good(good){
    good.global_count_last = good.global_count;
    good.update_index += 1;
}

function viewGoodBar(player , id , back){
    const good = get_good(id);
    if(!is_good_data_valid(good)){
        back();
        logger.log(2,1,"试图浏览商品[0]时出错:商品不存在!",[id]);
        return;
    }

    try_refresh_good(good , id);
    const unvalid_texts = get_good_unvalid_texts(good);
    if(unvalid_texts.length === 0 && good.type === 0 && good.count_type === 1){
        buy_internal(player , good , id ,back , good.item_count , true);
        back();
        return;
    }
    const body = [
        `§e商品名:§r${good.name}`,
        `§e商品描述:§r${good.description}`,
        `§e限量:§r${(good.global_count === 0) ? "无限" : String(good.global_count - good.global_count_last) + "/" + String(good.global_count)}`,
        `§e个人限量:§r${(good.personal_count === 0) ? "无限" : String(get_personal_count(player,good, id)) + "/" + String(good.personal_count)}`,
    ];
    if(good.type === 0){
        if(good.currency === "USE_CURRENCY_ITEM"){
            body.push("§e用于兑换的物品:§r" + good.currency_item_name);
            body.push("§e需要的物品数量(单价):§r" + String(good.price));
        }else{
            body.push("§e货币:§r" + get_system("pay").get_currency_name(good.currency));
            body.push("§e单价:§r" + String(good.price));
            body.push("§e单次购买的物品数量:§r" + String(good.item_count));
        }
    }
    if(good.type === 1){
        body.push("§e货币:§r" + get_system("pay").get_currency_name(good.currency));
        body.push("§e回收单价:§r" + String(good.price));
    }
    body.push("");

    if(good.type === 2){
        const ui = new btnBar();
        ui.cancel = () => {
            back();
        }
        ui.title = "礼品获取";
        ui.body = body;
        ui.btns = [{
            text : "领取",
            func : () => {
                //TODO
            }
        }];
        ui.show(player);
    }
    else{
        if(unvalid_texts.length > 0){
            const ui = new btnBar();
            ui.title = "商品查看";
            ui.cancel = () => {
                back();
            }
            unvalid_texts.splice(0,0,"§e");
            ui.body = body.concat(unvalid_texts);
            ui.btns = [{
                text : "返回",
                func : () => {
                    back();
                }
            }];
            ui.show(player);
        }else{
            const ui = new infoBar();
            ui.title = "商品" + (good.type === 0) ? "购买" : "收购";
            ui.cancel = () => {
                back();
            }
            body.push((good.type === 0) ? "购买" : "收购" + "数量:");
            if(good.type === 0){
                if(good.count_type === 0){
                    if(good.item_count !== 1){
                        body.push(`(请输入${good.item_count})的倍数`);
                    }
                    ui.input("count" , tool.array2line(body) , "请输入数字!" , "");
                }else{
                    ui.range("count" , tool.array2line(body) , good.item_count , good.item_count * [0,0,5,10,20,50,100][good.count_type] , good.item_count , good.item_count);
                }
            }else{
                if(good.count_type === 0){
                    ui.input("count" , tool.array2line(body) , "请输入数字!" , "");
                }else{
                    ui.range("count" , tool.array2line(body) , 1 , good.item_count * [0,10,20,32,64,128,256][good.count_type] , 1 , 1);
                }
            }
            ui.show(player , (r) => {
                const good = get_good(id);
                const count = (tool.is_number(r.count)) ? r.count : tool.parse_number(r.count , 0);
                if(count <= 0 || Math.round(count) !== count ||
                 (good.type === 0 && good.item_count !== 1 && count % good.item_count !== 0) || 
                (good.type !== 2 && good.global_count !== 0 && good.global_count_last < count)||
                (good.type !== 2 && good.personal_count !== 0 && get_personal_count(player , good , id) + count > good.personal_count)){
                    tip(player , "您输入的数字不合法或超出限量！",() => {
                        viewGoodBar(player , id  ,count , back);
                        return;
                    });
                    return;
                }

                if(good.type === 0){
                    buy_internal(player , good , id , back);
                }else{
                    recycle(player , good , id ,back , count);
                }
                
            });
        }
    }
}

function recycle(player , good , id ,back , count){
    let total_count = 0;
    let last_count = count;
    const goal_items = {};
    for(let index = 0;index <= player.slots.size ; index++){
        const item = player.slots.getItem(index);
        if(!tool.un(item) && item.typeId === good.item){
            total_count += item.amount;
            goal_items[index] = item.amount;
        }
    }
    if(total_count >= count){
        for(let index of Object.keys(goal_items)){
            if(last_count === 0 ){continue;}
            if(last_count >= goal_items[index]){
                last_count -= goal_items[index];
                player.slots.setItem(index);
            }else{
                player.slots.getSlot(index).amount -= last_count;
                last_count = 0;
            }
        }
        get_system("pay").add_money(player , good.currency , count * good.price);
        back();
    }else{
        if(!immediate_buy){
            tip(player , "用于回收的物品不足！",() => {
                viewGoodBar(player , id , back);
            });
        }else{
            back();
        }
    }
}

function buy_internal( player , good , id , back , count, immediate_buy = false){
    const give = () =>{
        good_add_count(good,player , id,count);
        if(good.type === 0){
            const item = (good.sell_type === 0) ? new ItemStack(good.item , 1) : get_chest_item(good.chest_id , good.slot_id);
            if(!tool.un(item)){
                for(let i = 0;i < count ; i ++){
                    player.dimension.spawnItem(item,player.location);
                }
            }
        }
    }

    if(good.currency !== "USE_CURRENCY_ITEM"){
        if(immediate_buy){
            if(get_system("pay").get_currency_balance(player , good.currency) >= good.price * count){
                get_system("pay").pay_money(player , good.currency , good.price * count);
                give();
            }
            back();
        }
        get_system("pay").pay(player , [good.currency] , [good.price * count] , good.name , good.description , (s) => {
            if(!s){
                viewGoodBar(player , id , back);
                return;
            }
            give();
            back();
        });
    }else{
        let total_count = 0;
        let last_count = count;
        const goal_items = {};
        for(let index = 0;index <= player.slots.size ; index++){
            const item = player.slots.getItem(index);
            if(!tool.un(item) && item.typeId === good.item){
                total_count += item.amount;
                goal_items[index] = item.amount;
            }
        }
        if(total_count >= count){
            for(let index of Object.keys(goal_items)){
                if(last_count === 0 ){continue;}
                if(last_count >= goal_items[index]){
                    last_count -= goal_items[index];
                    player.slots.setItem(index);
                }else{
                    player.slots.getSlot(index).amount -= last_count;
                    last_count = 0;
                }
            }
            give();
            back();
        }else{
            if(!immediate_buy){
                tip(player , "用于兑换的物品不足！",() => {
                    viewGoodBar(player , id , back);
                });
            }else{
                back();
            }
        }
    }
}

function good_add_count(good , player ,id , count){
    if(good.personal_count !== 0){add_personal_count(player , good , id , count);}
    if(good.global_count !== 0){good.global_count_last -= count;save_data("Good." + id , tool.to_json(good));}
}

function try_refresh_good(good , id){
    if(good.update_type === 0){return true;}
    const update_times = good.update_time.split(",").map((c) => {return tool.parse_number(c);});
    const start_time = good.last_update;
    const now_time = Date.now();
    const last_update_index = good.last_update_index;
    if(start_time === 0){
        const times = good.update_start.split(".").map((c) => {return Math.max(0,Math.round(tool.parse_number(c)));});
        if(times.length !== 4){return false;}
        start_date = new Date(times[0] , times[1] , times[2] , times[3]).getTime();
    }

    const new_time = -1;
    while(start_time < now_time){
        const index = (last_update_index + 1) % update_times.length;
        start_time += update_times[index] * 1000;
        if(start_time <= now_time){
            last_update_index = index;
            new_time = start_time;
        }
    }

    if(new_time !== -1){
        good.global_count_last = good.global_count;
        good.last_update = new_time;
        good.last_update_index = last_update_index;
        good.update_index += 1;
    }
    save_data("Good." + id , tool.to_json(good));
    return true;
}

function get_chest_item(chest_id , slot_id){
    const block;
    try{
        block = get_block(overworld , {
            x : 5,
            y : 319,
            z : 5
        });
    }catch(err){}
    if(tool.un(block)){
        return;
    }

    const chest_data = tool.to_object(tool.parse_json(get_data("Chest_" + chest_id)));
    if(tool.is_number(chest_data[slot_id])){
        const manager = get_structure_manager();
        const structure = manager.get("usf:Chest_" + chest_id);
        if(tool.is_object(structure)){
            manager.place(structure , overworld , {x : 5,y : 319,z : 5});
            const container = block.getComponent("minecraft:inventory").container;
            return container.getItem(chest_data[slot_id]);
        }
    }
    return undefined;
}

var store_pool = [];
function store_chest_item(good , item){
    const slot_id = String(Date.now());
    const chest_id = config.store_chest === "" ? String(Date.now()) : config.store_chest;
    config.store_chest = "";
    save_config();
    good.slot_id = slot_id;
    good.chest_id = chest_id;
    store_pool.push({
         chest_id : chest_id,
         item : item,
         slot_id : slot_id,
    });
}

run_interval(() => {
    if(store_pool.length === 0){return;}
    const block;
    try{
        block = get_block(overworld , {
            x : 5,
            y : 319,
            z : 5
        });
    }catch(err){}
    if(tool.un(block)){
        overworld.runCommand("tickingarea add 0 0 0 15 0 15 USF");
        return;
    }

    const work = store_pool[0];
    const chest_data = get_data("Chest_" + work.chest_id);
    const is_new = false;
    if(chest_data === ""){
        is_new = true;
        chest_data = {};
    }else{
        chest_data = tool.to_object(tool.parse_json(chest_data));
    }

    const manager = get_structure_manager();
    const structure = manager.get("usf:Chest_" + work.chest_id);
    if(structure === undefined){
        is_new = true;
        chest_data = {};
    }

    if(is_new){
        block.setType("minecraft:chest");
        const container = block.getComponent("minecraft:inventory").container;
        container.setItem(0,work.item);
        manager.createFromWorld("usf:Chest_" + work.chest_id ,overworld, {x : 5,y : 319,z : 5},{x : 5,y : 319,z : 5},{
            includeBlocks : true,
            includeEntities:false,
            saveMode : "World",
        });
        chest_data[work.slot_id] = 0;
        save_data("Chest_" + work.chest_id , tool.to_json(chest_data));
        block.setType("minecraft:air");
        config.store_chest = work.chest_id;
    }else{
        manager.place(structure , overworld , {x : 5,y : 319,z : 5});
        const container = block.getComponent("minecraft:inventory").container;
        const first_slot = container.firstEmptySlot();
        if(tool.is_number(first_slot)){
            container.setItem(first_slot , work.item);
            chest_data[work.slot_id] = first_slot;
            manager.delete("usf:Chest_" + work.chest_id);
            manager.createFromWorld("usf:Chest_" + work.chest_id ,overworld, {x : 5,y : 319,z : 5},{x : 5,y : 319,z : 5},{
                includeBlocks : true,
                includeEntities:false,
                saveMode : "World",
            });
            save_data("Chest_" + work.chest_id , tool.to_json(chest_data));
            first_slot = container.firstEmptySlot();
            if(tool.is_number(first_slot)){
                config.store_chest = work.chest_id;
            }
            block.setType("minecraft:air");
        }
    }
    
    store_pool.splice(0,1);

},5);

function get_personal_count(player, good , id){
    if(tool.is_object(player.buy_record[id]) && player.buy_record[id].index !== good.update_index){
        player.buy_record[id].count = 0;
        player.buy_record[id].index = good.update_index;
        save_player_buy_record(player);
    }
    return (tool.is_object(player.buy_record[id])) ? player.buy_record[id].count : 0;
}

function add_personal_count(player , good ,id ,count){
    if(tool.is_object(player.buy_record[id])){
        player.buy_record[id].count += count;
    }else{
        player.buy_record[id] = {
            index : good.update_index,
            count : count,
        }
    }
    save_player_buy_record(player);
}

function get_good_unvalid_texts(good ,id , player){
    const texts  = [];
    const min_count = (good.type === 0) ? good.item_count : 1;

    if(!good.able){
        texts.push("该商品停售中!");
    }

    if(good.type !== 2 && good.global_count !== 0 && good.global_count_last < min_count){
        texts.push("该商品剩余数量不足!");
    }

    if(good.type !== 2 && good.personal_count !== 0){
        
        const buyed_count = get_personal_count(player , good , id);
        if(buyed_count + min_count > good.personal_count){
            texts.push("个人购买数量已达上限");
        }
    }
    
    if(good.type !== 2 && !get_system("pay").is_currency_valid(good.currency)){
        texts.push("该商品使用的货币不存在!");
    }
    else if(good.type !== 2 && get_system("pay").get_currency_balance(good.currency) < good.price * min_count){
        texts.push("您的余额不足！");
    }

    if(good.type === 0 && good.currency === "USE_CURRENCY_ITEM" && !has_item_type(good.currency_item)){
        texts.push("以物易物的物品不存在!");
    }

    if(good.type === 0 && good.sell_type === 0 && !has_item_type(good.item)){
        texts.push("购买的物品ID不存在!");
    }

    if(good.type === 0 && good.sell_type === 1 && good.chest_id === ""){
        texts.push("购买的物品未录入!");
    }


}

function is_good_id_valid(id){
    return tool.array_has(global_goods,id);
}

function is_good_data_valid(good){
    return !tool.un(good.type);
}

function get_good(id){
    if(!is_good_id_valid(id)){return {}}
    return tool.to_object(tool.parse_json(get_data("Good."+id)));
}

function save_global_goods(){
    save_data("global_goods_v2" , tool.to_json(global_goods));
}