import { get_data, pictures, save_data, ui_icon } from "./Basic/Data.js";
import * as text from "./Basic/Text.js";
import { btnBar, infoBar } from "./Basic/ui.js";
import {  confirm , tip, show_global_ui, playerChooser} from "./Basic/UniversalUI.js";
import * as event from "./Basic/Event.js";
import * as logger from "./Basic/Logger.js";
import { get_system } from "./Basic/Core.js";
import * as tool from "./Basic/Tool.js";

/*
DictionaryEditor.js
功能：字段编辑器
*/

var override_dictionary = {};

event.connect_custom_event("world_load",(things) => {
    //注册设置
    get_system("manager").register_manager_bar_btn({
        text : "字段编辑器",
        icon : ui_icon.brush,
        func : (op) => {
            dictionaryEditor(op.player);
        }
    });
    load_dictionary();

    logger.log(0,1,"————字段编辑器已加载————");
});

function dictionaryEditor(player){
    const ui = new btnBar();
    ui.cancel = () => {
        show_global_ui(player , "manager");
    }
    ui.title = "字段编辑器";
    ui.body = "此处编辑插件内定义的所有动态字段";
    ui.btns = [{
        text : "根据内容查找字段",
        icon : pictures.glass,
        func : ()=>{
            searchBar(player);
        }
    },{
        text : "删除所有自定义字段",
        icon : ui_icon.rubbish,
        func : ()=>{
            confirm(player , "你确定要删除所有自定义字段吗？该操作无法恢复!",(r) => {
                if(r){
                    override_dictionary = {};
                    save_dictionary();
                }else{
                    dictionaryEditor(player);
                }
            });
        }
    }];
}

function searchBar(player){
    const ui = new infoBar();
    ui.cancel = () => {
        dictionaryEditor(player);
    }
    ui.title = "搜索字段";
    ui.input("str" , "输入字段包含的字符","请输入文本","");
    ui.show(player , (r) => {
        const results = [];
        for(let key of Object.keys(text.text_dictionary)){
            if(tool.string_has(text.text_dictionary[key],r.str)){
                results.push(key);
            }
        }

        let _text = text.format("搜索完成!共有[0]个结果.(最多显示30个结果)",[results.length]);
        results = results.slice(0,30);
        for(let i = 0; i< results.length ; i++){
            _text += text.format("\n[0].[1]",[i+1 , text.text_dictionary[results[i]]]);
        }
        let options = ["返回(不编辑)"];
        for(let i = 0; i< results.length ; i++){
            options.push(String(i+1));
        }
        const ui2 = new infoBar();
        ui2.cancel = () => {
            dictionaryEditor(player);
        }
        ui2.title = "搜索结果";
        ui2.options("index" , "请选择要编辑的字段序号",options,0);
        ui2.show(player , (r) => {
            if(r.index === 0){dictionaryEditor(player);}
            else{
                editWord(player , results[r.index -1]);
            }
        });
    });
}

function editWord(player , id){
    const ui = new infoBar();
    ui.cancel = ()=> {
        dictionaryEditor(player);
    }
    ui.title = "编辑字段 - " + id;
    ui.input("text" , "新的字段" , "请输入文本" , text.text_dictionary[id]);
    ui.show(player , (r) => {
        override_dictionary[id] = r.text;
        text.push_text(id , r.text , true);
        save_dictionary();
    });
}

function load_dictionary(){
    let able = true;
    let index = 0;
    while(able === true){
        const data = get_data("dictionary." + String(index));
        if(data === ""){able = false;}
        else{
            tool.object_override(override_dictionary , tool.to_object(tool.parse_json(data)));
        }
    }
    for(let id of Object.keys(override_dictionary)){
        text.push_text(id , override_dictionary[id] , true);
    }
}

function save_dictionary(){
    let keys = Object.keys(override_dictionary);
    let indexs = Math.ceil(keys.length / 100);
    const length = keys.length;
    for(let i = 0 ; i< indexs ; i++){
        const obj = {};
        for(let index = i * 100; index < Math.min(length , i * 100 + 100) ; i ++){
            obj[keys[index]] = override_dictionary[keys[index]]; 
        }
        save_data("dictionary." + String(i) , tool.to_json(obj));
    }
}