
import * as event from "./Basic/Event.js";
import { ui_icon , get_data , save_data , clear_data } from "./Basic/Data.js";
import * as logger from "./Basic/Logger.js";
import * as tool from "./Basic/Tool.js";
import { has_system ,get_system } from "./Basic/Core.js";
import { btnBar, infoBar } from "./Basic/ui.js";
import { tip } from "./Basic/UniversalUI.js";
import { format } from "./Basic/Text.js";

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

    const max_index = Math.min(global_goods.length , page * 50 + 50);
    for(let index = page * 50 ; index < max_index ; index++){
        const good = get_good(global_goods[index]);
        ui.btns.push({
            text : format("商品名称:[0]\n备注:[1]",[good.name , good.explain]),
            op : {index : index},
            func : (op) => {
                editGoodBar(player , back , page , global_goods[op.index]);
            }
        });
    }

    ui.show(player);

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
            update_type : 0, //0-不刷新 1-固定时间 2-每小时 3-每天 4-每月 5-每周
            update_start : "",
            update_time : 60, //刷新间隔时间/s，选择固定时间后才有用

            currency : "", //币种(售卖、收购)
            price : 1 , //单价(售卖、收购)
            currency_item : "minecraft:", //以物易物id(售卖)
            chest : "", //容器id(售卖)
            slot : 0, //物品序号id(售卖)
            item : "minecraft:", //物品id(收购、售卖)
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
    ui.options("update_type" , "限量刷新频率" , ["不刷新" , "固定时间" , "每小时" , "每天" , "每月" ,"每周" ] , good.update_type);
    ui.input("update_time" , "刷新间隔/s(选择固定时间刷新时使用)" , "请输入秒数" , String(good.update_time));
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
        }
        ui.input("price" , "物品单价" , "请输入数字" , String(good.price));
        ui.input("item",format("[0]的物品ID" , [good.type === 0 ? "售卖" : "出售"]),"请输入物品ID" , good.item);
    }
    if(good.type === 0){
        ui.input("item_count" , "一次交易的物品数量" , "请输入数量" , String(good.item_count));
        ui.options("count_type" , "物品数量条的样式" , ["输入数量" , "快捷售卖(点击商品立即售卖)" ,  "范围条(最大值为一次交易数量的5倍)" , "范围条(最大值为一次交易数量的10倍)" , "范围条(最大值为一次交易数量的20倍)" , "范围条(最大值为一次交易数量的50倍)" , "范围条(最大值为一次交易数量的100倍)"],good.count_type);
    }
    if(good.type === 1){
        ui.options("count_type" , "物品数量条的样式" , ["输入数量" ,  "范围条(1-10)" , "范围条(1-20)" , "范围条(1-32)" , "范围条(1-64)" , "范围条(1-128)"],good.count_type);
    }
    if(good.type === 2){
        ui.input("runner" , "领取礼品后要执行的执行集" , "请输入执行集ID" , good.runner);
    }

    ui.show(player , (r) => {
        good.able = r.able;
        good.name = r.name;
        good.explain = r.explain;
        good.description = r.description;
        good.global_count = tool.to_number(tool.parse_number(r.global_count,good.global_count));
        good.personal_count = tool.to_number(tool.parse_number(r.personal_count,good.personal_count));
        good.update_type = r.update_type;
        good.update_start = r.update_start;
        good.update_time = tool.to_number(tool.parse_number(r.update_time,good.update_time));

        switch(good.type){
            case 0:
                good.currency = r.currency;
                good.currency_item = r.currency_item;
                good.price = tool.to_number(tool.parse_number(r.price,good.price));
                good.item = r.item;
                good.count_type = r.count_type;
                good.item_count = tool.to_number(tool.parse_number(r.item_count,good.item_count));
                break;
            case 1:
                good.currency = r.currency;
                good.price = tool.to_number(tool.parse_number(r.price,good.price));
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
                good.global_count_last = good.global_count;
                good.last_update = Date.now();
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