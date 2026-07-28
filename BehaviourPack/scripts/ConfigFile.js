import { config, get_system , has_system, register_system , exported_datas , export_data , import_data} from "./Basic/Core.js";
import * as tool from "./Basic/Tool.js";
import { btnBar , infoBar } from "./Basic/ui.js";
import * as event from "./Basic/Event.js";
import * as mc from "./Basic/Mc.js";
import { get_data , save_data, ui_icon , pictures} from "./Basic/Data.js";
import { get_op_level } from "./Basic/Permission.js";
import { confirm } from "./Basic/UniversalUI.js";

event.register_mc_event(true , "playerInteractWithBlock" , undefined , (event) => {
	if(get_op_level(event.player) < 1){return;}
	const item = mc.get_player_hand_item(event.player);
	if(!tool.un(item) && item.typeId === "usf:config_file"){
		event.cancel = true;
		mc.run(()=>{
			configFileBar(event.player);
		});
	}
});

function configFileBar(player){
	const item = mc.get_player_hand_item(player);
	if(tool.un(item) || item.typeId !== "usf:config_file"){
		return;
	}
	
	switch(tool.to_string(get_data("type",item))){
		case "":
			const ui = new btnBar();
			ui.title = "配置文件 - 类型选择";
			ui.body = [
				"介绍：",
				"配置文件是USF中的数据保存介质",
				"所有自定义功能的数据都需要存储在配置文件中才能任由使用者编辑",
				"请选择该配置文件的功能",
				"自定义功能 - 编辑准则列表、页面集、执行集数据",
				"导出/导入插件数据 - 字面意思"
			];
			ui.btns = [{
				text : "自定义功能",
				icon : pictures.book,
				func : () =>{
					save_data("type" , "data_set" , item);
					player.slots.setItem(player.selectedSlotIndex , item);
					configFileBar(player);
				}
			},{
				text : "导出/导入插件数据",
				icon : ui_icon.manager,
				func : () => {
					save_data("type" , "backup" , item);
					player.slots.setItem(player.selectedSlotIndex , item);
					configFileBar(player);
				}
			}];
			ui.show(player);
			break;
		case "backup":
			backupBar(player);
			break;
		case "data_set":
			dataSetBar(player);
			//TODO
			break;
	}
}

function backupBar(player){
	const item = mc.get_player_hand_item(player);
	if(tool.un(item) || item.typeId !== "usf:config_file"){
		return;
	}
	
	let backup_list = tool.to_array(tool.parse_json(get_data("backup_list",item)));
	const ui = new btnBar();
	ui.title = "导出/导入插件数据";
	ui.btns = [{
		text : "编辑该配置文件名称",
		ui_icon : ui_icon.edit,
		func : () => {
			const ui2 = new infoBar();
			ui2.title = "编辑该配置文件名称";
			ui2.cancel = () => {
				backupBar(player);
			ui2.input("name" , "配置文件名称" , "请输入名称" , (tool.un(item.nameTag)) ? "" , item.nameTag);
			ui2.show(player , (r) => {
				item.nameTag = r.name;
				player.slots.setItem(player.selectedSlotIndex , item);
				backupBar(player);
			});
		}
	},{
		text : "导出插件数据到此文件",
		func : () => {
			export_data();
			mc.run_timeout(() => {
				const list = [];
				const datas = exported_datas;
				const ui2 = new infoBar();
				ui2.title = "选择需要导出的数据";
				ui2.cancel = () => {
					backupBar(player);
				}
				for(let i = 0 ; i < datas.length ; i++){
					ui2.toggle("index" , datas[i].description , false);
				}
				ui2.show(player , (r) => {
					for(let i = 0 ; i < r.index.length ; i++){
						if(r.index[i]){
							list.push(datas[i].id);
							save_data(datas[i].id , datas[i].data , item);
						}
					}
					if(list.length > 0){
						save_data("backup_list" , tool.to_json(list) , item);
						player.slots.setItem(player.selectedSlotIndex , item);
					}
					backupBar(player);
				});
			}, 1 * 20);
		}
	}];
	
	if(backup_list.length > 0){
		ui.btns.push({
			text : "从该文件导入数据",
			func : () => {
				confirm(player , ["你确定要导入数据吗？","原插件数据将会被覆盖，且无法恢复！"], (r) => {
					if(r){
						for(let id of backup_list){
							import_data(tool.parse_json(get_data(id , item)));
						}
						mc.chat("[配置文件]已成功导入插件数据!",[player]);
					}else{
						backupBar(player);
					}
				});
			}
		});
	}
	
}
