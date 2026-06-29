import * as event from "./Basic/Event.js";

/*
Setting.js
作用：
设置界面管理
*/

//事件sitting_changed
//由其他文件发出,引导页面返回,发出信号应当带参数{ type : 设置类型 }，退回对应类型的设置界面
event.report_custom_event("sitting_changed");
