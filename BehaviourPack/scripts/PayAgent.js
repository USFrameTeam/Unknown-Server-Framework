import * as event from "./Basic/Event.js";
import { register_system , has_system , get_system, config } from "./Basic/Core.js";
import { data_format, get_data , save_data, ui_icon } from "./Basic/Data.js";
import * as tool from "./Basic/Tool.js";
import * as mc from "./Basic/Mc.js";
import { infoBar , btnBar } from "./Basic/ui.js";
import { format } from "./Basic/Text.js";
import { tip , confirm } from "./Basic/UniversalUI.js";

var currencys = {};
var is_var_system_valid = false;

load_currencys();

event.connect_custom_event("world_load",(things) => {
    //注册设置
    if(has_system("setting")){
      get_system("setting").register_setting("pay","支付系统设置",settingBar);
    }

    if(!has_system("var")){
        logger.log(0,1,"————自定义变量系统错误！自定义变量系统不存在！————");
    }else{
        is_var_system_valid = true;
    }

    logger.log(0,1,"————自定义变量系统已加载————");
});

function load_currencys(){
    currencys = tool.to_object(tool.parse_json(get_data("currencys")));
}

function save_currencys(){
    save_data("currencys" , tool.to_json(currencys));
}

function settingBar(player , back = false){
    const ui = new btnBar();
    ui1.cancel = () => {
        settingBar(player , back);
    }
    ui.title = "支付系统设置";
    ui.body = "此处可管理所有货币";
    ui.btns = [{
        text : "添加新货币",
        icon : ui_icon.add,
        func : () => {
            editCurrencyBar(player , "" , back);
        }
    }];
    for(let id of Object.keys(currencys)){
        ui.btns.push({
            text : currencys[id].name,
            op : {
                id : id
            },
            func : (op) => {
                editCurrencyBar(player , op.id , back);
            }
        })
    }
    ui.show(player);
}

function editCurrencyBar(player , id , back){
    let currency = {};
    if(id !== "" && tool.is_object(currencys[id])){
        currency = currencys[id];
    }
    const ui = new infoBar();
    ui.title = "货币设置";
    ui.cancel = () => {
        settingBar(player , back);
    }
    ui.input("name", "货币名" , "请输入货币名称" , tool.to_string(currency.name));
    ui.input("id", "货币ID(用于设置货币时填入)(不可带分号)" , "请输入货币ID" , tool.to_string(currency.id));
    ui.options("type" , "货币数据类型" , ["自定义变量" , "计分板"] , tool.to_number(currency.type));
    ui.input("goal", "货币对应的变量ID/计分板ID" , "请输入ID" , tool.to_string(currency.id));
    ui.input("value" , "货币价值(用于计算汇率)(必须>=1)" , "价值" , tool.to_number(currency.value , 1));
    ui.show(player , (r) => {
        currency.name = r.name;
        currency.id = r.id.replaceAll(";","-");
        currency.type = r.type;
        currency.goal = r.goal;
        currency.value = Math.max(1 , tool.parse_number(r.value));
        if(id === "" && currency.id !== ""){
            currencys[currency.id] = currency;
        }
        save_currencys();
        settingBar(player,back);
    });
}

function is_valid(id){
    return is_var_system_valid;
}

function is_currency_valid(id){
    if(tool.un(currencys[id])){return false;}
    if(!is_var_system_valid){return false;}
    let cur = currencys[id];
    if(cur.type === 0 && cur.goal === ""){return false;}
    if(cur.type === 1 && !mc.has_score_board(cur.goal)){return false;}
    return true;
}

function get_currency_balance(player , id){
    if(!is_currency_valid(id)){return 0;}
    let cur = currencys[id];
    if(cur.type === 0){
        return tool.to_number(get_system("var").get_var(cur.goal,false,player) , 0);
    }
    if(cur.type === 1){
        return mc.scoreboard_get(player , cur.goal);
    }
}

function is_currency_enough(player , id , count){
    if(!is_currency_valid(id)){return false;}
    if(get_currency_balance(id) >= count){return true;}
    return false;
}

function pay(player , currency_ids = [] , counts = [] , program_name , description , result = function(success){}){
    let valid_ids = [];
    let enough_ids = [];
    for(let index=0 ; index <= currency_ids.length ; index++){
        let id = currency_ids[index];
        if(id === ""){continue;}
        valid_ids.push(id);
        if(is_currency_enough(player,id,counts[index])){
            enough_ids.push(id);
        }
    }

    if(valid_ids.length === 0 || counts.filter((c) => {return c >= 0;}).length > 0){
        tip(player,"当前支付项目有误！请稍后重试！",() => {result(false);})
    }

    let text = format("支付中...\n您正在支付的项目:[0]\n备注:[1]\n——————\n您的资产:",[
        program_name , description
    ]);
    for(let id of valid_ids){
        text += format("\n[0]:金额:[1] ; 余额[2][3]",[
            currencys[id].name ,counts[tool.array_index(currency_ids,id)] , get_currency_balance(id) , tool.array_has(enough_ids,id) ? "(可支付)" : "(余额不足)",
        ]);
    }
    if(enough_ids.length === 0){
        tip(player , text + "\n\n 没有可支付的货币！" , () => {success(false);});
    }else{
        const ui = new infoBar();
        ui.cancel = () => {
            result(false);
        }
        let options = [];
        for(let i = 0; i < enough_ids.length ; i++){
            options.push(currencys[enough_ids[i]].name);
        }
        ui.options("id" , text + "\n\n请选择支付的货币" , options , 0);
        confirm(player , text , (is_confirm) => {
            if(is_confirm){
                pay_money(player , enough_ids[r.id] , counts[tool.array_index(currency_ids,r.id)]);
                result(true);
            }else{
                result(false);
            }
        })
    }
    
}

function pay_money(player , currency_id , count){
    let currency = currencys[currency_id];
    switch(currency.type){
        case 0:
            const type = get_system("var").get_var_type(currency.goal , player);
            if(type === 0){
                get_system("var").set_var(currency.goal , 2 , -count , player);
            }
            else if(type === 2){
                get_system("var").set_var(currency.goal , 2 , get_system("var").get_var(currency.goal , false , player) - count , player);
            }
            break;
        case 1:
            mc.scoreboard_add(player , currency.goal , -count);
            break;
    }
    mc.chat(format("[支付系统]支付成功！货币余额:[0]" , [get_currency_balance(player,currency_id)]) , [player]);
}

function add_money(player , currency_id , count){
    let currency = currencys[currency_id];
    switch(currency.type){
        case 0:
            const type = get_system("var").get_var_type(currency.goal , player);
            if(type === 0){
                get_system("var").set_var(currency.goal , 2 , count , player);
            }
            else if(type === 2){
                get_system("var").set_var(currency.goal , 2 , get_system("var").get_var(currency.goal , false , player) + count , player);
            }
            break;
        case 1:
            mc.scoreboard_add(player , currency.goal , count);
            break;
    }
    mc.chat(format("[支付系统]您的货币[0]收到一笔转账，货币余额:[1]" , [get_currency_name(currency_id) , get_currency_balance(player,currency_id)]) , [player]);
}

function get_currency_counts(){
    return currencys.length;
}
function get_currency_ids(){
    return Object.keys(currencys);
}

function get_currency(id){
    return currencys[id];
}

function get_currency_name(id){
    if(!is_currency_valid(id)){return "Unkonwn"};
    return get_currency(id).name;
}

register_system("pay" , {
    is_valid : is_valid,
    is_currency_valid : is_currency_valid,
    pay : pay,
    get_currency_counts : get_currency_counts,
    get_currency_ids : get_currency_ids,
    get_currency : get_currency,
    get_currency_balance : get_currency_balance,
    get_currency_name : get_currency_name,
    pay_money : pay_money,
    add_money : add_money,
})