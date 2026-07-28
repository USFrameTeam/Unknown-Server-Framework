import * as event from "./Basic/Event.js";
import { register_system , has_system , get_system, config, save_config } from "./Basic/Core.js";
import { data_format, get_data , pictures, save_data, ui_icon } from "./Basic/Data.js";
import * as tool from "./Basic/Tool.js";
import * as mc from "./Basic/Mc.js";
import { infoBar , btnBar } from "./Basic/ui.js";
import { format, get_text, push_text, tran_text } from "./Basic/Text.js";
import { tip , register_global_ui, playerChooser, chooseBar } from "./Basic/UniversalUI.js";
import { get_player_name } from "./Basic/Player.js";

/*
Bank.js
功能：银行系统
*/

event.connect_custom_event("world_load",(things) => {
    //注册设置
    if(has_system("setting")){
      get_system("setting").register_setting("var","银行设置",settingBar);
    }

    

    logger.log(0,1,"————银行系统已加载————");
});


function tranBar(player , options){
    if(!config.bank.able){
        return;
    }

    const ui = new btnBar();
    ui.title = "银行系统";
    push_text( "tran_bar" ,"此处管理您的资产")
    ui.body = tran_text(get_text("tran_bar"));
    if(tool.is_function(options.cancel)){
        ui.cancel = () => {options.cancel(player);}
    }

    ui.btns = [{
        text : "向其他玩家转账",
        icon : ui_icon.trade,
        func : () => {
            transferBar(player , options);
        }
    },{
        text : "货币兑换",
        icon : pictures.coin,
        func : () => {
            transformBar(player , options);
        }
    }]
    
}

function transferBar(player , options){
    if(config.bank.allow_transfer.length === 0){
        tip(player , "无可用的转账项目!" , () => {
            tranBar(player , options);
        });
        return;
    }

    let valid_currencys = config.bank.allow_transfer.filter((id) => {return get_system("pay").is_currency_valid(id);})
    var ui = new infoBar()
    ui.title = "转账"
    ui.options("id", "转账货币", valid_currencys.map((id) => {return format(["[0] - 余额:[1]"],[ get_system("pay").get_currency_name(id) , get_system("pay").get_currency_balance(id)])}) , 0)
    ui.input("count", `输入数额(手续费:${config.bank.tip}％)`, "款数", "1");
    ui.show(player , (r) => {
        let count = tool.parse_number(r.count);
        if(count <= 0){
            tip(player , "金额不合法!无法转账!" , () => {
                tranBar(player , options);
            });
            return;
        }

        let tips = Math.floor(tool.parse_number((config.bank.tip / 100 * count).toFixed(2)));
        let players = (mc.get_all_players().filter((p) => {return p !== player;}));
        playerChooser(player , players,(ps) => {
            get_system("pay").pay(player,[valid_currencys[r.id]] , [(count + tips) * ps.length] , "转账" ,
            format("转账给:[0]\n单个玩家金额:[1]\n单个玩家手续费:[2]\n总额:[3]",[tool.array2line(ps.map((p) => {return get_player_name(p);})) , count , tips , (count + tips) * ps.length])
            ,(result) => {
                if(!result){
                    tranBar(player ,options);
                    return;
                }
                
                let success_players = [];
                for(let p of ps){
                    if(mc.is_entity_valid(p)){
                        get_system("pay").add_money(p,valid_currencys[r.id],count);
                        success_players.push(p);
                    }else{
                        get_system("pay").add_money(player,valid_currencys[r.id],count + tips);
                    }
                }
                tip(player , "已向以下玩家转账:" + tool.array2line(success_players.map((p) => {return get_player_name(p);})) + "\n若部分玩家无法转账,金额已退回",()=>{
                    tranBar(player,options);
                })
            });
        })
    })
}

function transformBar(player , options){
    let programs = [];
    for(let i = 0 ; i < config.bank.transform.length ; i++){
        let form = config.bank.transform[i];
        if(get_system("pay").is_currency_valid(form.from) && get_system("pay").is_currency_valid(form.to)){
            programs.push(i);
        }
    }
    if(programs.length === 0){
        tip(player , "当前无有效的兑换项目!" , () => {
            tranBar(player , options);
        });
        return;
    }


    const ui = new infoBar();
    ui.title = "货币兑换";
    ui.cancel = () => {
        tranBar(player , options);
    }

    ui.options("index" , "选择转账的项目" , get_descriptions_by_ids(programs) , 0);
    ui.input("count" , "金额(大于0)" , "请输入金额" , "1");
    ui.show(player , (r) => {
        let count = tool.parse_number(r.count);
        if(count <= 0){
            tip(player , "金额不合法!无法兑换!" , () => {
                tranBar(player , options);
            });
            return;
        }

        let form = config.bank.transform[programs[r.index]];
        let to_cur = get_system("pay").get_currency(form.to);
        let tips = Math.floor(count * form.tip / 100);
        let text = format("目标货币([0])余额:[1]\n此次兑换的手续费:[2]",[ to_cur.name , get_system("pay").get_currency_balance(player,form.to) , tips]);
        get_system("pay").pay(player , [form.from] , [count + tips] , "货币兑换" , text , (result) =>{
            if(result){
                tip(player,format("兑换成功!\n余额:\n[0]:[1]\n[2]:[3]" , [
                    get_system("pay").get_currency_name(form.from),
                    get_system("pay").get_currency_balance(player,form.from),
                    get_system("pay").get_currency_name(form.to),
                    get_system("pay").get_currency_balance(player,form.to),
                ]) , () => { tranBar(player , options); });
            }else{
                tranBar(player , options);
            }
        })
    })
}

function get_descriptions_by_ids(programs){
    let texts = [];
    for(let i = 0 ; i < programs.length ; i ++){
        let form = config.bank.transform[programs[i]];
        let from_cur = get_system("pay").get_currency(form.from);
        let to_cur = get_system("pay").get_currency(form.to);
        texts.push(format("[0] -> [1] (汇率:[2] ; 手续费:[3]%)" , [from_cur.name , to_cur.name , tool.parse_number((to_cur.value / from_cur.value).toFixed(2)) , form.tip]))
    }
    return texts;
}

function settingBar(player , back = false){
    const ui = new btnBar();
    ui.title = "银行系统设置";
    ui.cancel = () => {
        event.emit_custom_event("setting_changed",{player : player , back : back});
    }
    ui.body = "在此处管理所有银行设置\n注：所有手续费只有>1时才收取";
    ui.btns = [{
        text : format("状态 - [0]" , [(config.bank.able) ? "启用" : "禁用"]),
        icon : (config.bank.able) ? ui_icon.ok : ui_icon.x,
        func : () => {
            config.bank.able = !config.bank.able;
            save_config();
            settingBar(player , back);
        }
    },{
        text : "管理玩家可相互转账的货币",
        icon : ui_icon.compass,
        func : () => {
            editTransferBar(player , back);
        }
    },{
        text : "添加可转换的货币",
        icon : ui_icon.compass,
        func : () => {
            editTransformBar(player , -1 , back);
        }
    }];

    for(let index = 0;index < config.bank.transform.length ; index++){
        let form = config.bank.transform[index];
        ui.btns.push({
            text : format("货币转换:[0] -> [1]" , [form.from , form.to]),
            op : { index : index },
            func : (op) => {
                editTransformBar(player , op.index , back);
            }
        })
    }
}

function editTransferBar(player , back){
    if(!has_system("pay")){
        settingBar(player , back);
        return;
    }
    if(get_system("pay").get_currency_counts() === 0){
        tip(player , "当前无可用货币!请前往支付系统设置" , () => {
            settingBar(player , back);
        });
        return;
    }

    const ui = new infoBar();
    ui.title = "管理玩家可相互转账的货币";
    ui.cancel = () => {
        settingBar(player , back);
    }
    for(let id of get_system("pay").get_currency_ids()){
        ui.toggle(id , id , tool.array_has(config.bank.allow_transfer , id));
    }
    ui.show(player , (r) => {
        config.bank.allow_transfer = [];
        for(let id of Object.keys(r)){
            if(r[id]){
                config.bank.allow_transfer.push(id);
            }
        }
        save_config();
        settingBar(player , back);
    })
}

function editTransformBar(player , index , back){
    let form = {
        from : "",
        to : "",
        tip : 0,
    };
    if(index !== -1){
        form  = config.bank.transform[index];
    }
    const ui = new infoBar();
    ui.title = "货币转换设置";
    ui.cancel = () => {
        settingBar(player , back);
    }
    ui.input("from" , "用于转换的货币ID" , "请输入支付系统的货币ID" , form.from);
    ui.input("to" , "转换成的目标货币ID" , "请输入支付系统的货币ID" , form.to);
    ui.range("tip" , "手续费(百分比)" , 0 , 100 , 0.5 , form.tip);
    ui.toggle("de" , "删除" , false);
    ui.show(player , (r) => {
        if(r.de){
            if(index === -1){
                settingBar(player , back);
                return;
            }else{
                config.bank.transform.splice(index , 1);
                save_config();
                settingBar(player , back);
                return;
            }
        }

        form.from = r.from;
        form.to = r.to;
        form.tip = r.tip;
        if(index === -1){
            config.bank.transform.push(form);
        }
        save_config();
        settingBar(player , back);
    });
}