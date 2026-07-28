import * as mc from "./Basic/Mc.js";
import * as tool from "./Basic/Tool.js";
import { register_system } from "./Basic/Core.js";


/*
Page.js
功能：自定义页面
*/

function pagesManager(player){
	const config_item = player.slots.getItem(player.selectedSlotIndex);
	if(tool.un(config_item) || config_item.typeId === "usf:config_file"){
		return;
	}
	
	
}