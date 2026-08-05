import * as mc from "./Basic/Mc.js";
import * as tool from "./Basic/Tool.js";
import { register_system } from "./Basic/Core.js";
import { get_data, pictures, save_data, ui_icon } from "./Basic/Data.js";
import { btnBar ,infoBar , arrayEditor} from "./Basic/ui.js";
import { format } from "./Basic/Text.js";
import { confirm , tip , add_pictures_choice } from "./Basic/UniversalUI.js";

/*
Page.js
功能：自定义页面
*/

function pageSetManager(player){
	const config_item = player.slots.getItem(player.selectedSlotIndex);
	if(tool.un(config_item) || config_item.typeId === "usf:config_file"){
		return;
	}
	
	const data = tool.to_object(tool.parse_json(get_data("page_set" , config_item)));
	if(!tool.is_string(data.init)){
		data.init = "";
		data.pages = {};
	}

	const ui = new btnBar();
	ui.title = "编辑页面集";
	ui.btns = [{
		text : "配置页面集信息",
		icon : ui_icon.setting,
		func : () => {
			const ui2  = new infoBar();
			ui2.cancel = () => {
				pageSetManager(player);
			}
			ui2.title = "配置页面集";
			ui2.input("init" , "页面集首页的ID" , "请输入ID" , data.init);
			ui2.input("name" , "该配置文件的名称" , "请输入名称" , (tool.un(config_item.nameTag)) ? "" : config_item.nameTag);
			ui2.show(player , (r) => {
				data.init = r.init;
				config_item.nameTag = r.name;
				save(config_item , data);
				pageSetManager(player);
			});
		}
	},{
		text : "添加页面",
		icon : ui_icon.add,
		func : () => {
			let id = "new";
			while(!tool.un(data.pages[id])){id += "_new";}
			data.pages[id] = {
				title : "标题",
				body : [],
				enter_runner : "",
				exit_runner : "",
				close_page : "",
				btns : [],
			}
		}
	}];

	for(let id of Object.keys(data.pages)){
		ui.btns.push({
			text : format("页面ID:[0]\n标题:[1]",[id , data.pages[id].title]),
			op : {id : id},
			func : (op) => {
				editPageBar(player , data , op.id);
			}
		});
	}
	
	ui.show(player);
}

function editPageBar(player , data , id){
	const config_item = player.slots.getItem(player.selectedSlotIndex);
	if(tool.un(config_item) || config_item.typeId === "usf:config_file"){
		return;
	}

	const page = data.pages[id];
	const ui = new btnBar();
	ui.title = "编辑页面";
	ui.cancel = () => {
		pageSetManager(player);
	}
	ui.body = [
		`页面ID:${id}`,
		`打开页面时运行的执行集:${page.enter_runner}`,
		`关闭页面时运行的执行集:${page.exit_runner}`,
		`关闭页面时返回的页面ID:${page.close_page}`,
		`页面标题:${page.title}`,
		`按钮数量:${page.btns.length}`,
		`页面内容:`,
	].concat(page.body);

	ui.btns = [{
		text : "编辑页面配置",
		icon : ui_icon.compass,
		func : () => {
			const ui2 = new infoBar();
			ui2.cancel = () => {
				editPageBar(player , data , id)
			}
			ui2.title = "编辑页面配置";
			ui2.input("id" , "页面ID" , "请输入ID" , id);
			ui2.input("title" , "页面标题" , "请输入单行文字" , page.title);
			ui2.input("enter_runner" , "打开页面时运行的执行集(不使用则留空)" , "请输入执行集ID" , page.enter_runner);
			ui2.input("exit_runner" , "关闭页面时运行的执行集(不使用则留空)" , "请输入执行集ID" , page.exit_runner);
			ui2.input("close_page" , "关闭页面跳转的页面ID(不使用则留空)" , "请输入页面ID" , page.close_page);
			ui2.show(player , (r) => {
				page.enter_runner = r.enter_runner;
				page.exit_runner = r.exit_runner;
				page.title = r.title;
				page.close_page = r.close_page;
				if(r.id !== "" && r.id !== id && tool.un(data.pages[r.id])){
					delete data.pages[id];
					data.pages[r.id] = page;
				}
				save(config_item , data);
				editPageBar(player , data , id);
			});
		}
	},{
		text : "编辑页面内容",
		icon : ui_icon.content,
		func : () => {
			const editor = new arrayEditor();
			editor.back = () => {
				editPageBar(player , data , id);
			}
			editor.tran = true;
			editor.edit(player,page.body);
		}
	},{
		text : "删除页面",
		icon : ui_icon.rubbish,
		func : () => {
			confirm(player , "确定删除?" , (r) => {
				if(r){
					delete data.pages[id];
					save(config_item , data);
					pageSetManager(player);
				}else{
					editPageBar(player , data , id);
				}
			});
		}
	},{
		text : "添加按钮",
		icon : ui_icon.add,
		func : () => {
			editBtnConfigBar(player , data , id);
		}
	}];

	for(let i = 0; i < page.btns.length; i++){
		const btn = page.btns[i];
		ui.btns.push({
			text : btn.name,
			icon : get_btn_icon(btn),
			op : {index : i},
			func : () => {
				editBtnBar(player , data , page_id , index);
			}
		});
	}

	ui.show(player);
}

const btn_types = [ "jump" , "runner" , "pos" , "good" , "confirm_runner" , "global_ui" , "pay"];
const btn_type_texts = [ "跳转至页面" , "执行集" , "传送点" , "商品" , "执行集(执行前弹出确认界面)" , "打开界面" , "拉起支付系统"];
function editBtnConfigBar(player , data , id , index = -1){
	const config_item = player.slots.getItem(player.selectedSlotIndex);
	if(tool.un(config_item) || config_item.typeId === "usf:config_file"){
		return;
	}

	const btn = (index !== -1) ? data.pages[id].btns[index] : {
		name : "",
		priority : 0,
		type : "jump",
		icon : null,
		icon_path : "",
		after : 0,
	};
	const ui = new infoBar();
	ui.title = "配置按钮";
	ui.cancel = () => {
		editPageBar(player , data , id);
	}
	ui.input("name" , "按钮名称" , "请输入文本" , btn.name);
	ui.range("priority" , "优先级(越大越考前)" , 0 , 100 , 1 , btn.priority);
	ui.options("after" , "点击按钮后的页面操作" , ["直接关闭自定义页面" , "显示当前页面" , "显示首页"] , btn.after);
	add_pictures_choice(ui , "图标" , btn.icon);
	ui.input("icon_path" , "自定义图标路径(不用时请留空)" , "请输入图片路径" , btn.icon_path);
	if(index === -1){
		ui.options("btn_type" , "按钮类型(后续无法修改)" , btn_type_texts , tool.array_index(btn_types , btn.type , 0));
	}
	ui.show(player , (r) => {
		btn.name = r.name;
		btn.priority = r.priority;
		if(index === -1){
			btn.type = btn_types[r.btn_type];
		}
		btn.icon = r.icon;
		btn.icon_path = r.icon_path;
		btn.after = r.after;
		if(index === -1){
			data.pages[id].btns.push(btn);
		}
		save(config_item , data);
		editBtnBar(player , data , id , index);
	});
}

function editBtnBar(player , data , page_id , index){
	const config_item = player.slots.getItem(player.selectedSlotIndex);
	if(tool.un(config_item) || config_item.typeId === "usf:config_file"){
		return;
	}

	const btn = data.pages[id].btns[index];
	const ui = new btnBar();
	ui.title = "编辑按钮";
	ui.cancel = () => {
		editPageBar(player , data , page_id);
	}
	ui.body = [
		`按钮名称:${btn.name}`,
		`按钮类型:${btn_type_texts[tool.array_index(btn_types,btn.type,0)]}`
	];
	ui.btns = () => [{
		text : "编辑按钮配置",
		icon : ui_icon.compass,
		func : () => {
			editBtnConfigBar(player , data , page_id , index);
		}
	},{
		text : "删除按钮",
		icon : ui_icon.rubbish,
		func : () => {
			confirm(player , "确定删除?" , (r) => {
				if(r){
					data.pages[id].btns.splice(index , 1);
					save(config_item , data);
				}else{
					editBtnBar(player , data , page_id , index);
				}
			});
		}
	},{
		text : "编辑按钮内容",
		icon : ui_icon.command,
		func : () => {
			editBtnTypeBar(player , data , id , index);
		}
	}];

}

function editBtnTypeBar(player , data , id , index){
	const config_item = player.slots.getItem(player.selectedSlotIndex);
	if(tool.un(config_item) || config_item.typeId === "usf:config_file"){
		return;
	}

	const btn = data.pages[id].btns[index];
	//TODO
}

function get_btn_icon(btn){
	if(btn.icon_path === ""){
		return (btn.icon === null) ? null : pictures[btn.icon]; 
	}else{
		return btn.icon_path;
	}
}

function editBtnBar(player , data , page_id , index){

}

function save(item , data){
	save_data("page_set" , tool.to_json(data) , item);
	player.slots.setItem(player.selectedSlotIndex , item);
}