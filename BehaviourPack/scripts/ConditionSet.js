import { ui_icon } from "./Basic/Data.js";
import { btnBar, infoBar } from "./Basic/ui.js";
import * as tool from "./Basic/Tool.js";
import { confirm, tip } from "./Basic/UniversalUI.js";
import { format } from "./Basic/Text.js";
import * as logger from "./Basic/Logger.js";
import { get_system, has_system, register_system } from "./Basic/Core.js";
import { get_op_level } from "./Basic/Permission.js";
import * as mc from "./Basic/Mc.js";


//intention: save(保存模式) back(退出模式)
function editConditionList(player , list = {} , back = (intention) => {}){
    const ui = new btnBar();
    ui.title = "编辑准则集列表";
    ui.cancel = back;
    ui.body = "管理该准则集列表中的所有准则集";
    ui.btns = [{
        text : "添加准则集",
        icon : ui_icon.add,
        func : () => {
            const ui2 = new infoBar();
            ui2.title = "添加准则集";
            ui2.cancel = () => {
                editConditionList(player , list , back);
            }
            ui2.input("id" , "规则集ID" , "请输入id" , "");
            ui2.input("name" , "规则集备注" , "请输入帮助记忆的文本" , "");
            ui2.show(player , (r) => {
                if(!tool.un(list[r.id])){
                    tip(player , "已存在重复的ID" , () => {
                        editConditionList(player , list , back);
                    });
                    return;
                }
                list[r.id] = {...condition_set_format};
                list[r.id].name = r.name;
                back("save");
                editConditionList(player , list , back);
            });
        }
    }];

    const ids = Object.keys(list);
    for(let id of ids){
        ui.btns.push({
            text : format("准则集ID:[0]\n备注:[1]",[id , list[id].name]),
            op : { id : id },
            func : () => {
                editConditionSet(player , list , op.id , back);
            }
        })
    }

    ui.show(player);
}

function editConditionSet(player , list , id , back){
    let condition_set = list[id];

    const ui = new btnBar();
    ui.title = "编辑准则集";
    ui.cancel = () => {
        back("back");
    };
    ui.body = format("准则集ID:[0]\n备注:[1]",[id , condition_set.name]);
    ui.btns = [{
        text : "编辑准则集配置",
        icon : ui_icon.brush,
        func : () => {
            const ui2 = new infoBar();
            ui2.cancel = () => {
                editConditionSet(player , list , id , back);
            }
            ui2.input("name" , "准则集备注" , "请输入备注" , condition_set.name);
            ui2.toggle("opposite" , "翻转结果(假变真,真变假)" , condition_set.opposite);
            const text = "说明:下方配置只有当全部符合时该准则集的结果才会为真\n\n";
            ui2.range("trues" , text + "最前___个准则必须为真" , 0 , 20 , 1 , 0);
            ui2.range("falses" , "最后___个准则必须为假" , 0 , 20 , 1 , 0);
            ui2.options("condition_type" , "判断准则" , ["任意n个准则为假" , "任意n个准则为真" , "全部为假" , "全部为真"] , tool.array_index(condition_types , condition_set.config.condition_type , 0));
            ui2.range("any_count" , "n的值为" , 0 , 30 , 1 , 0);
            ui2.show(player , (r) => {
                condition_set.name = r.name;
                condition_set.opposite = r.opposite;
                condition_set.trues = r.trues;
                condition_set.falses = r.falses;
                condition_set.condition_type = condition_types[r.condition_type];
                condition_set.any_count = r.any_count;
                back("save");
                editConditionSet(player , list , id , back);
            });
        }
    },{
        text : "测试运行准则集",
        icon : ui_icon.delete,
        func : () => {
            logs = [];
            test(player , list , id , true);
            const ui2 = new btnBar();
            ui2.title = "测试结果";
            ui2.body = logs;
            ui2.cancel = () => {
                editConditionSet(player , list , id , back);
            }
            ui2.btns = [{
                text : "关闭",
                icon : ui_icon.x,
                func : () => {
                    editConditionSet(player , list , id , back);
                }
            }];
            ui2.show(player);
        }
    },{
        text : "删除准则集",
        icon : ui_icon.delete,
        func : () => {
            confirm(player , "您确定要删除此准则集?删除后不可恢复!" , (r) => {
                if(r){
                    delete list[id];
                    back("save");
                    editConditionList(player , list , back);
                }else{
                    editConditionSet(player , list , id , back);
                }
            });
        }
    },{
        text : "添加准则",
        icon : ui_icon.add,
        func : () => {
            const ui2 = new infoBar();
            ui2.cancel = () => {
                editConditionSet(player , list , id , back);
            }
            ui2.title = "添加准则";
            ui2.input("name" , "备注" , "请输入备注" , "");
            const types = Object.keys(condition_format);
            ui2.options("type" , "准则类型" , types.map((type_id) => {return condition_format[type_id].name}),0);
            ui2.show(player , (r) => {
                const condition = {
                    type : types[r.type],
                    name : r.name,
                    values : {},
                }
                editCondition(player , list , id  , -1 , back , condition);
            })
        }
    }];

    for(let index = 0 ; index < condition_set.conditions.length ; index ++){
        ui.btns.push({
            text : format("[0]\n类型:[1]",[condition_set.conditions[index].name , condition_format[condition_set.conditions[index].type].name]),
            op : {index : index},
            func : (op) => {
                editCondition(player , list , id , op.index , back);
            }
        });
    }
}


function editCondition(player , list , id , index , back , new_condition = undefined ){
    let condition_set = list[id];
    let condition = (index === -1) ? new_condition : condition_set.conditions[index];
    const ui = new infoBar();
    ui.title = "编辑准则 - " + condition_format[condition_set.type].name;
    ui.cancel = () => {
        editConditionSet(player , list , id , back);
    }
    if(tool.un(condition_format[condition_set.type])){
        return;
    }

    const values = condition_format[condition_set.type].values;
    for(let value_id of Object.keys(values)){
        const value_config = values[value_id];
        switch(value_config.type){
            case "String":
                ui.input(value_id , value_config.description , "请输入文本" , tool.to_string(condition.values[value_id] , tool.to_string(value_config.default_value)));
                break;
            case "Number":
                ui.input(value_id , value_config.description , "请输入数字(留空则为无限大/无限小)" , tool.un(condition.values[value_id]) ? String(tool.to_number(value_config.default_value)) : String(condition.values[value_id]));
                break;
            case "bool" :
                ui.toggle(value_id , value_config.description , tool.to_bool(condition.values[value_id] , tool.to_bool(value_config.default_value)));
                break;
            case "Options":
                ui.options(value_id , value_config.description , value_config.options_text , tool.array_index(value_config.options , tool.to_string(condition.values[value_id]) , 0));
                break;
        }
    }
    ui.toggle("delete" , "删除该准则" , false);
    ui.show(player , (r) => {
        if(r.delete){
            if(index === -1){
                editConditionSet(player , list , id , back);
                return;
            }else{
                condition_set.splice(index , 1);
                back("save");
                editConditionSet(player , list , id , back);
                return;
            }
        }


        for(let value_id of Object.keys(values)){
            const value_config = values[value_id];
            switch(value_config.type){
                case "String":
                    condition.values[value_id] = r[value_id];
                    break;
                case "Number":
                    condition.values[value_id] = r[value_id] === "" ? "" : tool.to_number(tool.parse_number(r[value_id]) , tool.to_number(value_config.default_value,0));
                    break;
                case "bool" :
                    condition.values[value_id] = r[value_id];
                    break;
                case "Options":
                    condition.values[value_id] = value_config.options[Math.min(r[value_id] , value_config.options.length -1)];
                    break;
            }

            if(index === -1){
                condition_set.conditions.push(condition);
            }

            back("save");
            editConditionSet(player , list , id , back);
        }
    });


}

var logs = [];
var is_debuging = false;
logger.reporter_register((message , is_global) => {
    if(is_debuging && message.startsWith("[准则集]")){
        logs.push(message);
    }
});

function is_between(value , max , min){
    if(tool.is_number(max) && value > max){
        return false;
    }
    if(tool.is_number(min) && value < min){
        return false;
    }
    return true;
}

function test(player , list , set_id , debug = false , tested_id_list = []){
    const set = list[set_id];
    if(debug){
        logs = [];
        is_debuging = true;
        logger.log( 0 , 1 , format("[准则集]开始执行准则集[0]",[set_id]));
    }
    if(tool.un(set)){
        logger.log( 1 , 1 , format("[准则集]要检测的准则集[0]不存在!",[set_id]));
        return false;
    }
    if(tool.array_has(tested_id_list , set_id)){
        logger.log( 1 , 1 , format("[准则集]要检测的准则集[0]无法重复使用!",[set_id]));
        return false;
    }

    
    const results = [];
    let final_result = false;
    let lock = false;
    for(let condition of set.conditions){
        let values = condition.values;
        let result = false;
        if(!tool.un(condition_format[condition.type].system) && !has_system(condition_format[condition.type].system)){
            result.push(result);
            if(debug){logger.log( 0 , 1 , format("[准则集]准则[0]需要的系统[1]不存在!",[condition.name , condition_format[condition.type].system]));}
            continue;
        }
        condition_test : switch(condition.type){
            case "string_var_equal":
                const value = tool.to_string(get_system("var").get_var(values.id , false , player));
                if(value = values.value){result = true;}
                break;
            case "string_var_has":
                const value = tool.to_string(get_system("var").get_var(values.id , false , player));
                if(value.includes(values.value)){result = true;}
                break;
            case "string_var_start":
                const value = tool.to_string(get_system("var").get_var(values.id , false , player));
                if(value.startsWith(values.value)){result = true;}
                break;
            case "string_var_end":
                const value = tool.to_string(get_system("var").get_var(values.id , false , player));
                if(value.endsWith(values.value)){result = true;}
                break;
            case "num_var_between":
                const value = tool.to_number(get_system("var").get_var(values.id , false , player));
                if(is_between(value , values.max , values.min)){result = true;}
                break;
            case "level":
                const level = player.level;
                if(is_between(level , values.max , values.min)){result = true;}
                break;
            case "ping":
                const ping = player.getPing();
                if(is_between(ping , values.max , values.min)){result = true;}
                break;
            case "is_sneaking":
                if(player.isSneaking){result = true;}
                break;
            case "effect":
                if(!tool.un(player.getEffect(values.effect))){result = true;}
                break;
            case "tag":
                if(player.hasTag(values.tag)){result = true;}
                break;
            case "op":
                if(get_op_level(player) > 0){result = true;}
                break;
            case "condition":
                if(test(player , list , values.id , debug , tested_id_list)){result = true;}
                break;
            case "scoreboard_between":
                const count = mc.has_score_board(values.id) ? mc.scoreboard_get(player , values.id) : 0;
                if(is_between(count , values.max , values.min)){result = true;}
                break;
            case "view_direction_block":
                const block_id = player.getBlockFromViewDirection({
                    includeLiquidBlocks : true,
                    includePassableBlocks : true,
                });
                block_id = (tool.un(block_id)) ? "air" : block_id.block.typeId;
                if(values.id === block_id || values.id === tool.cut_minecraft(block_id)){result = true;}
                break;
            case "stand_on_block":
                const block_id = player.getBlockStandingOn({
                    ignoreThinBlocks : false,
                });
                block_id = (tool.un(block_id)) ? "air" : block_id.typeId;
                if(values.id === block_id || values.id === tool.cut_minecraft(block_id)){result = true;}
                break;
            case "di":
                const id = tool.cut_minecraft(player.dimension.id);
                if(id === values.type || id === values.id){result = true;}
                break;
            case "gamemode":
                if(mc.get_game_mode(player) === values.type){result = true;}
                break;
            case "riding":
                const com = player.getComponent("minecraft:riding");
                if(!tool.un(com)){
                    if(values.id === com.entityRidingOn.typeId || values.id === tool.cut_minecraft(com.entityRidingOn.typeId)){result = true;}
                }else{lock = true;}
                break;
            case "in_land":
                if(tool.to_object(player.in_land).id === values.id){result = true;}
                break;
            case "in_group":
                const group = get_system("group").get_group(values.id);
                if(!get_system("group").is_group_valid(group)){lock = true;}
                else if(get_system("group").is_group_has(group , player)){result = true;}
                break;
            case "has_land":
                if(!get_system("land").is_land_id_valid(values.id)){lock = true;}
                else if(get_system("land").get_land_member_level(player , get_system("land").get_land(values.id)) > 0){result = true;}
                break;
             case "has_group":
                const group = get_system("group").get_group(values.id);
                if(!get_system("group").is_group_valid(group)){lock = true;}
                else if(get_system("group").get_group_level(player , group) === 3){result = true;}
                break;
            case "currency_between":
                if(!get_system("pay").is_currency_valid(values.id)){lock = true;}
                else if(get_system("pay").get_currency_balance(player , values.id)){result = true;}
                break;
            case "item":
                let items = [];
                let inventory_type = 0;
                switch(values.range){
                    case "ender_chest":
                        inventory_type = 1;
                    case "inventory":
                        const slots = (inventory_type === 0) ? player.slots : player.getComponent("minecraft:ender_inventory").container;
                        if(values.index_able){
                            if(values.index >= slots.size){
                                result = values.con_index_valid;
                                break condition_test;
                            }
                            const this_item = slots.getItem(values.index);
                            if(!tool.un(this_item) && (this_item.typeId === values.id || tool.cut_minecraft(this_item.typeId) === values.id)){
                                items.push(this_item);
                            }
                        }else{
                            for(let i = 0; i< slots.size ; i++){
                                const this_item = slots.getItem(i);
                                if(!tool.un(this_item) && (this_item.typeId === values.id || tool.cut_minecraft(this_item.typeId) === values.id)){
                                    items.push(this_item);
                                }
                            }
                        }
                        break;
                    case "hotbar":
                        if(values.index_able){
                            if(values.index > 8 || values.index < 8){
                                result = values.con_index_valid;
                                break condition_test;
                            }
                            const this_item = player.slots.getItem(27 + values.index);
                            if(!tool.un(this_item) && (this_item.typeId === values.id || tool.cut_minecraft(this_item.typeId) === values.id)){
                                items.push(this_item);
                            }
                        }else{
                            for(let i = 27; i< player.slots.size ; i++){
                                const this_item = player.slots.getItem(i);
                                if(!tool.un(this_item) && (this_item.typeId === values.id || tool.cut_minecraft(this_item.typeId) === values.id)){
                                    items.push(this_item);
                                }
                            }
                        }
                        break;
                    case "Body":
                    case "Chest":
                    case "Feet":
                    case "Legs":
                    case "Mainhand":
                    case "Offhand":
                        const this_item = player.getComponent("minecraft:equippable").getEquipment(values.range);
                        if(!tool.un(this_item) && (this_item.typeId === values.id || tool.cut_minecraft(this_item.typeId) === values.id)){
                            items.push(this_item);
                        }
                        break;
                }

                if(items.length === 0){
                    result = values.con_unvalid;
                    break condition_test;
                }

                if(values.amount_able && items[0].isStackable){
                    items = items.filter((item) => { return is_between(item.amount , values.amount_max , values.amount_min)});
                }

                if(values.durability_able && !items[0].isStackable && item[0].hasComponent("minecraft:durability")){
                    
                    items = items.filter((item) => { 
                        const com = item.getComponent("minecraft:durability");
                        return is_between((com.maxDurability - com.damage)/com.maxDurability*100 , values.amount_max , values.amount_min);
                    });
                }

                if(items.length === 0){
                    result = values.con_unvalid;
                    break condition_test;
                }else{
                    result = values.con_has;
                    break condition_test;
                }
                break;
        }
        if(values.con === false && !lock){result = !result;}
        result.push(result);
        if(debug){logger.log( 0 , 1 , format("[准则集]准则[0]结果为[1]",[condition.name , (result) ? "真" : "假"]));}
    }

    if(!lock){
        if(!results.slice(0,Math.min(results.length , set.config.trues)).every((r) => {return r;})){
            final_result = false;
            lock = true;
        }
    }
    if(!lock){
        if(!results.slice(Math.max(0 , results.length - set.config.trues)).every((r) => {return !r;})){
            final_result = false;
            lock = true;
        }
    }
    results = results.slice(Math.min(results.length , set.config.trues) , Math.max(0 , results.length - set.config.trues));
    const count = tool.array_count(results , true);
    if(!lock){
        switch(set.config.condition_type){
            case "any_true":
                if(count >= set.config.any_count){final_result = true;}
                break;
            case "any_false":
                if(results.length - count >= set.config.any_count){final_result = true;}
                break;
            case "all_false":
                if(count === 0){final_result = true;}
                break;
            case "all_false":
                if(count === results.length){final_result = true;}
                break;
        }
    }


    if(opposite){final_result = !final_result;}
    return final_result;
}

const condition_set_format = {
    name : "",
    config : {
        "trues" : 0, //前n项必须为true
        "falses" : 0, //后n项必须为true
        "condition_type" : "any_false", //any_false / any_true / all_false / all_true
        "any_count" : 1,
        "opposite" : false,
    },
    conditions : [],
}

const condition_types = ["any_false" , "any_true" , "all_false" , "all_true"];

const condition_format = {
    string_var_equal : {
        name : "字符串变量相同",
        system : "var",
        values : {
            id : {
                type : "String",
                description : "字符串ID",
                default_value : "",
            },
            value : {
                type : "String",
                description : "要比较相同的内容",
                default_value : "",
            },
            con : {
                type : "bool",
                description : "判断准则:[不含内容|含有内容]时该条件为真",
                default_value : true,
            },
        }
    },
    string_var_has : {
        name : "字符串变量内含有内容",
        system : "var",
        values : {
            id : {
                type : "String",
                description : "字符串ID",
                default_value : "",
            },
            value : {
                type : "String",
                description : "要含有的内容",
                default_value : "",
            },
            con : {
                type : "bool",
                description : "判断准则:[不含内容|含有内容]时该条件为真",
                default_value : true,
            },
        }
    },
    string_var_start : {
        name : "字符串变量以某内容开头",
        system : "var",
        values : {
            id : {
                type : "String",
                description : "字符串ID",
                default_value : "",
            },
            value : {
                type : "String",
                description : "开头的内容",
                default_value : "",
            }
        }
    },
    string_var_end : {
        name : "字符串变量末尾含有内容",
        system : "var",
        values : {
            id : {
                type : "String",
                description : "字符串ID",
                default_value : "",
            },
            value : {
                type : "String",
                description : "末尾的内容",
                default_value : "",
            }
        }
    },
    num_var_between : {
        name : "数字变量在最大值与最小值之间",
        system : "var",
        values : {
            id : {
                type : "String",
                description : "字符串ID",
                default_value : "",
            },
            max : {
                type : "Number",
                description : "最大值",
                default_value : 0,
            },
            min : {
                type : "Number",
                description : "最小值",
                default_value : 0,
            },
            con : {
                type : "bool",
                description : "判断准则:[在范围外|在范围内]时该条件为真",
                default_value : true,
            },
        }
    },
    level :{
        name : "玩家经验在最大值与最小值之间",
        values : {
            max : {
                type : "Number",
                description : "最大值",
                default_value : 0,
            },
            min : {
                type : "Number",
                description : "最小值",
                default_value : 0,
            },
            con : {
                type : "bool",
                description : "判断准则:[在范围外|在范围内]时该条件为真",
                default_value : true,
            },
        }
    },
    ping :{
        name : "玩家延迟(ms)在最大值与最小值之间",
        values : {
            max : {
                type : "Number",
                description : "最大值",
                default_value : 0,
            },
            min : {
                type : "Number",
                description : "最小值",
                default_value : 0,
            },
            con : {
                type : "bool",
                description : "判断准则:[在范围外|在范围内]时该条件为真",
                default_value : true,
            },
        }
    },
    is_sneaking : {
        name : "玩家正在潜行",
        values : {
            con : {
                type : "bool",
                description : "判断准则:[未潜行|正在潜行]时该条件为真",
                default_value : true,
            }
        }
    },
    op : {
        name : "玩家为USF管理员/owner",
        values : {
            con : {
                type : "bool",
                description : "判断准则:[不是管理员|是管理员]时该条件为真",
                default_value : true,
            }
        }
    },
    scoreboard_between : {
        name : "玩家计分板分数在最大值与最小值之间",
        values : {
            id : {
                type : "String",
                description : "计分板ID(无效时分数为0)",
                default_value : "",
            },
            max : {
                type : "Number",
                description : "最大值",
                default_value : 0,
            },
            min : {
                type : "Number",
                description : "最小值",
                default_value : 0,
            },
            con : {
                type : "bool",
                description : "判断准则:[在范围外|在范围内]时该条件为真",
                default_value : true,
            },
        }
    },
    effect : {
        name : "玩家含有效果",
        values : {
            effect : {
                type : "String",
                description : "要含有的效果ID",
                default_value : "",
            },
            con : {
                type : "bool",
                description : "判断准则:[不含效果|含有效果]时该条件为真",
                default_value : true,
            },
        }
    },
    tag : {
        name : "玩家含有标签tag",
        values : {
            tag : {
                type : "String",
                description : "要含有的标签",
                default_value : "",
            },
            con : {
                type : "bool",
                description : "判断准则:[不含标签|含有标签]时该条件为真",
                default_value : true,
            },
        }
    },
    condition : {
        name : "准则列表内另一个准则集的结果",
        values : {
            id : {
                type : "String",
                description : "准则集ID(无效时结果为假)",
                default_value : "",
            },
            con : {
                type : "bool",
                description : "判断准则:[该准则集为假|该准则集为真]时该条件为真",
                default_value : true,
            },
        }
    },
    view_direction_block : {
        name : "玩家准星对准某方块",
        values : {
            id : {
                type : "String",
                description : "对准的方块ID(准星未对准方块则为air)",
                default_value : "",
            },
            con : {
                type : "bool",
                description : "判断准则:[未对准该方块|对准该方块]时该条件为真",
                default_value : true,
            },
        }
    },
    stand_on_block : {
        name : "玩家站在某方块上",
        values : {
            id : {
                type : "String",
                description : "脚下的方块ID",
                default_value : "",
            },
            con : {
                type : "bool",
                description : "判断准则:[脚下不是该方块|脚下是该方块]时该条件为真",
                default_value : true,
            },
        }
    },
    di : {
        name : "玩家在某个维度",
        values : {
            type : {
                type : "Options",
                description : "维度类型",
                options : ["overworld" , "nether" , "the_end" , "custom"],
                options_text : ["主世界" , "下界" , "末地" , "自定义维度"],
                default_value : "overworld",
            },
            id : {
                type : "String",
                description : "选择自定义维度时的维度ID",
                default_value : "",
            },
            con : {
                type : "bool",
                description : "判断准则:[不在该维度|在该维度]时该条件为真",
                default_value : true,
            },
        }
    },
    gamemode : {
        name : "玩家为某游戏模式",
        values : {
            type : {
                type : "Options",
                description : "游戏模式",
                options : [ 0 , 1 , 2 , 3 ],
                options_text : ["生存" , "创造" , "冒险" , "观察者"],
                default_value : 0,
            },
            con : {
                type : "bool",
                description : "判断准则:[不是该模式|是该模式]时该条件为真",
                default_value : true,
            },
        }
    },
    item : {
        name : "玩家含有某物品",
        values : {
            range : {
                type : "Options",
                description : "搜索范围",
                options : [ "inventory" , "hotbar" , "ender_chest" , "Offhand" , "Mainhand" , "Head" , "Chest" , "Legs" , "Feet"],
                options_text : ["背包(包含物品栏)" , "物品栏" , "末影箱" , "副手" , "主手" , "头部" , "护甲" , "护腿" , "靴子"],
                default_value : "inventory",
            },
            id : {
                type : "String",
                description : "需要检测的物品ID",
                default_value : "",
            },
            con_unvalid : {
                type : "bool",
                description : "判断准则:搜索不到该物品时该条件为[假|真]",
                default_value : false,
            },
            con_has : {
                type : "bool",
                description : "判断准则:搜索到该物品时该条件为[假|真]\n若使用下方限定条件则以下方为准",
                default_value : true,
            },
            index_able : {
                type : "bool",
                description : "[禁用|使用]只对范围中的具体位置进行搜查(对背包、物品栏、末影箱)",
                default_value : false,
            },
            index : {
                type : "Number",
                description : "具体位置的ID\n根据上到下、左到右对物品列表顺序,由0开始\n背包:0~35(物品栏为最后9个)\n末影箱:0~26\n物品栏:0-8",
                default_value : 0,
            },
            con_index_valid : {
                type : "bool",
                description : "判断准则:当具体位置不存在(ID超过范围)时该条件为[假|真]",
                default_value : true,
            },
            amount_able : {
                type : "bool",
                description : "[禁用|使用]数量限制(仅适用于可堆叠物品)",
                default_value : false,
            },
            amount_max : {
                type : "Number",
                description : "最大数量",
                default_value : 1,
            },
            amount_min : {
                type : "Number",
                description : "最小数量",
                default_value : 1,
            },
            durability_able : {
                type : "bool",
                description : "[禁用|使用]耐久限制(仅适用于不可堆叠物品)",
                default_value : false,
            },
            durability_max : {
                type : "Number",
                description : "最大耐久百分数%(0-100)",
                default_value : 100,
            },
            durability_max : {
                type : "Number",
                description : "最小耐久百分数%(0-100)",
                default_value : 0,
            },
        }
    },
    riding : {
        name : "玩家正在骑乘生物",
        values : {
            id : {
                type : "String",
                description : "骑乘生物的ID",
                default_value : "",
            }
        }
    },
    in_land : {
        name : "玩家正在领地中",
        system : "land",
        values : {
            id : {
                type : "String",
                description : "检测的领地ID",
                default_value : "",
            },
            con_valid : {
                type : "bool",
                description : "当玩家不在任何领地时条件为[假|真]",
                default_value : false,
            },
            con_land : {
                type : "bool",
                description : "当玩家[不在这个领地|在这个领地]时条件为真",
                default_value : true,
            }
        }
    },
    has_land : {
        name : "玩家拥有领地",
        system : "land",
        values : {
            id : {
                type : "String",
                description : "领地ID",
                default_value : "",
            },
            con : {
                type : "bool",
                description : "当玩家[不含这个领地|含这个领地]时条件为真",
                default_value : true,
            }
        }
    },
    in_group : {
        name : "玩家在群组内",
        system : "group",
        values : {
            id : {
                type : "String",
                description : "群组ID",
                default_value : "",
            },
            con : {
                type : "bool",
                description : "当玩家[不在群组内|在群组内]时条件为真",
                default_value : true,
            }
        }
    },
    has_group : {
        name : "玩家为某群组创建者",
        system : "group",
        values : {
            id : {
                type : "String",
                description : "群组ID",
                default_value : "",
            },
            con : {
                type : "bool",
                description : "当玩家[不是创建者|是创建者]时条件为真",
                default_value : true,
            }
        }
    },
    currency_between : {
        name : "货币余额在最大值和最小值之间",
        system : "pay",
        values : {
            id : {
                type : "String",
                description : "货币ID(不存在时结果为假)",
                default_value : "",
            },
            max : {
                type : "Number",
                description : "余额最大值",
                default_value : 0,
            },
            min : {
                type : "Number",
                description : "余额最小值",
                default_value : 0,
            },
            con : {
                type : "bool",
                description : "判断准则:[在范围外|在范围内]时该条件为真",
                default_value : true,
            },
        },
    }
}

register_system("condition" , {
    test : test,
    editConditionList : editConditionList,
})