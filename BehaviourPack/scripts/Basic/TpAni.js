//++++++++++++传送动画(1.20.10~1.20.60)+++++++++++++++++
//已经通过接口适配1.21+
import { world, system } from "@minecraft/server";
import { config } from "./Core.js";

// 维度工具
function get_di_by_id(id) {
    switch (id) {
        case "minecraft:nether":
            return world.getDimension("minecraft:nether");
        case "minecraft:the_end":
            return world.getDimension("minecraft:the_end");
        case "minecraft:overworld":
            return world.getDimension("minecraft:overworld");
    }
}

// 动画
const CAM = { rise: 2, move: 3, fall: 1 };

// 新增：简单传送函数（无动画）
function simpleTeleport(player, targetLocation, targetDimension, onDone) {
    player.teleport(targetLocation, { dimension: targetDimension });
    if (onDone) onDone();
}
// 修改：根据配置决定使用哪种传送方式
export function tpWithAnimation(player, loc, dim, onDone = () => {}) {
    performTeleportAnimation(player, loc, dim).then(onDone).catch(() => {});
}

// 等待
export function performTeleportAnimation(player, targetLocation, targetDimension) {
    return new Promise((resolve) => {
        let tick = 0;
        const totalTicks = 2 * 20;          // 2 秒倒计时
        const interval = system.runInterval(() => {
            const pct = Math.floor(++tick / totalTicks * 100);
            player.onScreenDisplay.setActionBar(`§a传送加载中... ${pct}%`);
            if (tick >= totalTicks) {
                system.clearRun(interval);
                executeTeleportSequence(player, targetLocation, targetDimension, resolve);
            }
        });
    });
}

// 摄像机动画
function executeTeleportSequence(player, loc, dim, done) {
    // 1. 上升
    player.runCommand(`camera @s set minecraft:free ease ${CAM.rise} out_expo pos ~ ~50 ~ facing ~ ~-1 ~`);
    player.onScreenDisplay.setActionBar(`√传送系统执行√`);

    system.runTimeout(() => {
        // 2. 传送到目标维度高空
        player.teleport({ x: loc.x, y: 10000, z: loc.z }, { dimension: dim });
        player.onScreenDisplay.setActionBar(`√开始移动至坐标点√`);

        // 3. 移动到目标上方
        player.runCommand(`camera @s set minecraft:free ease ${CAM.move} in_out_expo pos ${loc.x} ${loc.y + 50} ${loc.z}`);

        system.runTimeout(() => {
            // 4. 下降到目标点
            player.teleport(loc, { dimension: dim });
            player.runCommand(`camera @s set minecraft:free ease ${CAM.fall} in_cubic pos ~ ~1.6 ~ facing ^ ^1.5 ^10`);
            player.onScreenDisplay.setActionBar(`√开始降落√`);

            system.runTimeout(() => {
                player.runCommand(`camera @s clear`);
                player.onScreenDisplay.setActionBar(`§a√§f动画传送完成§a√`);//脑补
                done();
            }, CAM.fall * 20);
        }, CAM.move * 20);
    }, CAM.rise * 20);
}

// 接口 1.20+
/*export function enhancedTeleport(player, x, y, z, dimensionId) {
    performTeleportAnimation(player, { x, y, z }, get_di_by_id(dimensionId));
}

export function enhancedEntityTeleport(source, target) {
    performTeleportAnimation(source, target.location, target.dimension);
}*/

//灵感来自于hyy,传送动画
//小洋骢