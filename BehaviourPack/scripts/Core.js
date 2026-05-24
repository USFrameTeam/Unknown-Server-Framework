import { world, system } from "@minecraft/server";

export const version_code = "0.7.22E";
export const version_text = `欢迎使用无名氏服务器框架\n插件版本:${version_code}\n作者：EarthDLL(USFrameTeam)，感谢所有社区贡献者的贡献\n快速适配版本，如有Bug，及时反馈`;
//命名空间
export const namespace = "usfV2:";

var config = {};

var reloaded = false;

var overworld;
var end;
var nether;
var dimensions;
system.run(() => {
  overworld = world.getDimension("minecraft:overworld");
  nether = world.getDimension("minecraft:nether");
  end = world.getDimension("minecraft:the_end");

  //给予三个维度名字
  overworld.name = get_text("overworld.name");
  end.name = get_text("end.name");
  nether.name = get_text("nether.name");
  dimensions = [overworld, nether, end];
});