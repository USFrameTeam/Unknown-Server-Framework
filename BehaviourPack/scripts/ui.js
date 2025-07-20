/* USF V2(0.6.10+) UI系统
    版权©归 EarthDLL所有
    开源代码，二次传播、修改无需同意
*/

import { system } from "@minecraft/server";
import { ActionFormData,
    MessageFormData,
    ModalFormData,
    ActionFormResponse
  } from "@minecraft/server-ui";
import {get_text}  from "./text.js"

function to_array(value , none = []){
    return Array.isArray(value) ? value : none
}

function to_string(value , none = ""){
    return typeof(value) == "string" ? value : none
}

function array2string(array = [] , none = ""){
    if(is_string(array)){return array}
    else{
        if(is_array(array)){
            var text = ""
            for(var cf of array){
                text += "\n" + cf
            }
            return text.slice(1)
        }
    }
    return none
}

function array_get(arr , index , none = ""){
    if(arr.length > index){
        return arr[index]
    }
    return none
}

function is_string(v ){
     return typeof(v) == "string" ? true : false
}

function is_object(v ){
     return typeof(v) == "object" ? true : false
}

function is_array(v ){
     return Array.isArray(v)
}

export function btnBar(){
    
    this.title = ""
    this.body = ""
    this.btns = []
    this.busy = function() {}
    this.busy_wait = 1
    this.cancel = function(){}

    this.ui = new ActionFormData()
    .title(this.title).body(this.body)
    
    
    this.show = function(player){
        this.ui = this.ui.title(this.title)
        
        var body = this.body
        if(is_array(body)){
            body = array2string(body)
        }
        this.ui = this.ui.body(body)
        
        for(var cf of this.btns){
            
            var icon = null
            if(is_string(cf.icon)){
                icon = cf.icon
            }
            
            this.ui = this.ui.button(to_string(cf.text),icon)
        }
        
        this.show_out(player)
    }
    
    this.show_out = function(player){
        this.ui.show(player).then((result) => {
            if(result.canceled){
                if(result.cancelationReason === "UserClosed"){
                    this.cancel()
                }
                else{
                    if(typeof(this.busy) !== "function"){
                        system.runTimeout(()=>{
                            this.show_out(player)
                        },this.busy_wait)
                    }
                    else{
                        this.busy()
                    }
                }
            }else{
                const selectedIndex = result.selection;
                if (
                selectedIndex >= 0 &&
                selectedIndex < this.btns.length &&
                typeof this.btns[selectedIndex]?.func === "function"
                ) {
                    const { func, op } = this.btns[selectedIndex];
                    func(op);
                } else {
                      console.error("无效的按钮选择:", selectedIndex);
                }
            }
        })
    }
}

export function infoBar(){

    this.ui = new ModalFormData()
    .title("")
    
    this.title = ""
    this.busy = function(){}
    this.busy_wait = 1
    this.cancel = function(){}
    this.things = []
    this.back = function(result){}
   
   
    this.match = function (array){
        if(is_array(array) && this.things.length > 0){
            this.things[this.things.length - 1].match = array
        }
    }
    this.options = function( id = "" , text = "" , options = [""] , value = 0){
        var input = {
            "type" : "options",
            "text" : text,
            "id" : id,
            "options" : options,
            "value" : value
        }
        this.things.push(input)
    }
    this.input = function( id = "" ,text = "" , place = "" , value = ""){
        var input = {
            "type" : "input",
            "text" : text,
            "id" : id,
            "place" : place,
            "value" : value
        }
        this.things.push(input)
    }
    this.toggle = function( id = "" ,text = "" , value = false){
        var input = {
            "type" : "toggle",
            "text" : text,
            "id" : id,
            "value" : value
        }
        this.things.push(input)
    }
    this.range = function(id = "", text = "", min = 0, max = 1, step = 1, value = 0) {
  const input = {
    type: "range",
    text: text,
    id: id,
    min: min,
    max: max,
    step: Math.max(1, step), // 步长至少为1
    value: Math.max(min, Math.min(value, max)) // 确保默认值在范围内
  };
  this.things.push(input);
};
    
    this.show = function(player,call_back){
        this.back = call_back
        this.ui = this.ui.title(this.title)
        
        for(var cf of this.things){
            switch(cf.type){
                case "toggle":
                    this.ui = this.ui.toggle(cf.text,{ defaultValue: cf.value })
                    break;
                case "input":
                    this.ui = this.ui.textField(cf.text,cf.place,{ defaultValue: cf.value })
                    break;
                case "range":
                    this.ui = this.ui.slider(cf.text,cf.min,cf.max,
                   {
                     step: cf.step,
                     defaultValue: cf.value }
                   )
                    break;
                case "options":
                    this.ui = this.ui.dropdown(cf.text, cf.options, { defaultValueIndex: cf.value })
                    break;
            }
        }
        this.show_out(player)
    }
    
    this.show_out = function(player){
        this.ui.show(player).then((result) => {
            if(result.canceled){
                if(result.cancelationReason === "UserClosed"){
                    this.cancel()
                }
                else{
                    if(typeof(this.busy) !== "function"){
                        system.runTimeout(()=>{
                            this.show_out(player)
                        },this.busy_wait)
                    }
                    else{
                        this.busy()
                    }
                }
            }else{
                var object = {}
                for(var cf=0; cf<this.things.length;cf++){
                    var data = result.formValues[cf]
                    if(this.things[cf].type === "options"){
                        if(is_array(this.things[cf].match)){
                            data = array_get(this.things[cf].match,data,data)
                        }
                    }
                    if(this.things[cf].type === "range"){
                        if(data < this.things[cf].min || data > this.things[cf].max){
                            data = this.things[cf].min
                        }
                    }
                    if(object[this.things[cf].id] === undefined){
                        object[this.things[cf].id] = data
                    }
                    else{
                        if(is_array(object[this.things[cf].id])){
                            object[this.things[cf].id].push(data)
                        }
                        else{
                            object[this.things[cf].id] = [object[this.things[cf].id] , data]
                        }
                    }
                }
                
                this.back(object)
            }
        })
    }
}

export function arrayEditor(){
    this.back = function(){}
    this.array = []
    this.tran = false
    this.look = ()=>{
        return this.array
    }
    
    this.edit = function(player,array){
        this.array = array
        this.show(player,array)
    }
    
    this.show = function(player,array){
        var ui = new infoBar()
        ui.title = "多行文本编辑器"
        ui.cancel = ()=>{
            this.back()
        }
        ui.toggle("look","预览：\n"+array2string(this.look()),true)
        for(var i=0;i < array.length;i++){
            ui.input("texts",`行${i+1}`,"输入内容(无内容则删除)",array[i])
        }
        if(this.tran){
            ui.toggle("look",get_text("tran_text"),true)
        }
        ui.range("add","要添加的行数",0,10,1,0)
        ui.toggle("finish","结束编辑",false)
        ui.show(player,(r)=>{
            var texts = r.texts
            if(is_string(texts)){
            texts = [texts]
            }
            if(texts === undefined){
            texts = []
            }
            array.length = 0
            for(var i=0;i<texts.length;i++){
                if(texts[i] !== ""){
                    array.push(texts[i])
                }
            }
            for(var i = 0;i < r.add;i++){
                array.push("")
            }
           if(r.finish){
            this.back()
           }
           else{
                this.show(player,this.array)
           }
        })
    }
}