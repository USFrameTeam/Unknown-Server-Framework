const readline = require('readline');
const fs = require("fs");
const process = require("process");
const WebSocket = require('ws');

let config = undefined

function get_time(){
    let date = new Date()
    return `[${date.getMonth()+1}.${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}]`
}

function log(text){
    console.log(`${get_time()}${text}`)
}

function get_date(){
    let date = new Date()
    return `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()}`
}

try{
    let data = fs.readFileSync('./LogServer.json').toString()
    config = JSON.parse(data)
}catch(err){
    log("无法读取LogServer.json文件，即将退出程序...")
    process.exit()
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (text) => {
    if(text === "stop"){
        log("退出日志程序！")
        process.exit()
    }else{
		if(server !== undefined){
			ws.send(JSON.stringify({ type : "message" , message: "[服主]" + text }));
		}
	}
});

// ---------- 创建 WebSocket 服务器 ----------
const wss = new WebSocket.Server({
    host: config.address,
    port: config.port
});

let server;

wss.on('connection', (ws) => {
	server = ws;
    log(`新客户端已连接（${wss.clients.size} 个在线）`);

    // 监听客户端发来的消息
    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message.toString());  // message 是 Buffer，转为字符串
        } catch (err) {
            // 解析失败则忽略
            return;
        }

        // 确保是对象且包含必要字段
        if (typeof data === 'object' && data.type) {
            // 对 text 和 path 做解码（如果客户端未事先编码，也可不处理，保留以防万一）
            if (data.text) data.text = decodeURI(data.text);
            if (data.path) data.path = decodeURI(data.path);

            switch (data.type) {
                case "log":
                    const dateStr = get_date();
                    const path = `./Log/${dateStr}/${data.path}.log`;
                    // 确保目录存在
                    fs.mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
                    // 追加写入
                    fs.writeFile(path, get_time() + data.text + "\n", { flag: "a" }, (err) => {
                        if (err) {
                            log(`写入失败:\nPath:${path}\nText:${data.text}`);
                        } else {
                            // 可选：向客户端回复成功
                            //ws.send(JSON.stringify({ status: "ok", message: "logged" }));
                        }
                    });
                    break;
                case "print":
                    log(data.text);
                    // 可选回复
                    //ws.send(JSON.stringify({ status: "ok", message: "printed" }));
                    break;
                default:
                    // 未知类型可忽略或报错
                    break;
            }
        }
    });

    // 连接关闭事件
    ws.on('close', () => {
        log(`客户端断开（剩余 ${wss.clients.size} 个在线）`);
    });

    // 错误处理
    ws.on('error', (err) => {
        log(`WebSocket 错误: ${err.message}`);
    });
});

wss.on('listening', () => {
    log(`日志服务器（WebSocket）已搭建完成！监听 ${config.address}:${config.port}`);
});