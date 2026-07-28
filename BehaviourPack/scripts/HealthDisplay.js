import * as event from "./Basic/Event.js";
import * as tool from "./Basic/Tool.js";
import * as mc from "./Basic/Mc.js";
import { infoBar} from "./Basic/ui.js";
import { save_config , config} from "./Basic/Core.js";

/*
HealthDisplay.js
功能：血量显示
*/

event.register_mc_event(false,"entityHurt",undefined,afterEntityHurt)
event.connect_custom_event("world_load",(things) => {
    //注册设置
    if(has_system("setting")){
          get_system("setting").register_setting("health_display","血量显示设置",settingBar);
    }

    logger.log(0,1,"————血量显示系统已加载————");
});

function afterEntityHurt(event) {
    if(!config.hurt.able){return;}

    const hurt = event.hurtEntity
    const hurter = event.damageSource.damagingEntity
    const damage = event.damage

    if (typeof (hurter) === "object") {
        if (hurter.typeId == "minecraft:player") {
        if (hurt.hasComponent("minecraft:health")) {
            const max = hurt.getComponent("minecraft:health").effectiveMax;
            const now = hurt.getComponent("minecraft:health").currentValue;
            if (now >= 0) {
                let text = ""
                let level = now / max * 100
                level = (level <= 100) ? level : 100
                switch (config.hurt.type) {
                    case 0:
                    text += "§a"
                    for (let cf = 0; cf < Math.ceil(level / 5); cf++) {
                        text += "||"
                    }
                    text += "§f"
                    for (let cf = 0; cf < 20 - Math.ceil(level / 5); cf++) {
                        text += "||"
                    }
                    text += "  " + String(Math.round(now)) + "/" + String(Math.round(max))
                    break
                    case 1:
                    if (now <= 20) {
                        for (let cf = 0; cf < Math.ceil(now / 2); cf++) {
                        text += ""
                        }
                    } else {
                        text = " × " + String(Math.ceil(now / 2))
                    }
                    break
                }
                mc.set_ActionBar(hurter,text,false);
            }
        }
        }
    }
}

function settingBar(player,back = false){
    const ui = new infoBar();
    ui.title = "血量显示设置";
    ui.cancel = () => {
        event.emit_custom_event("setting_changed",{player : player , back : back});
    }
    ui.toggle("able", "伤害血量提示[关闭 | 开启]", config.hurt.able);
    ui.options("type", "显示模式", ["条状", "心形"], config.hurt.type);

    ui.show(player,(r) => {
        config.hurt.able = r.able;
        config.hurt.type = r.type;
        save_config();
        event.emit_custom_event("setting_changed",{player : player , back : back});
    });
}

