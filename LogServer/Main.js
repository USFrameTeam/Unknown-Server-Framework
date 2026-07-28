const readline = require('readline');
const fs = require("fs");
const process = require("process");
var http = require('http');

var config = undefined

function get_time(){
    var date = new Date()
    return `[${date.getMonth()+1}.${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}]`
}

function log(text){
    console.log(`${get_time()}${text}`)
}

function get_date(){
    var date = new Date()
    return `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()}`
}

try{
    var data = fs.readFileSync('./LogServer.json').toString()
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
    }
});

var server = http.createServer(function (req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end("usf");

    var data = req.headers.usf
    try{
        data = JSON.parse(data)
    }catch(err){}

    if(typeof(data) === "object"){
        data.text = decodeURI(data.text)
        data.path = decodeURI(data.path)
        switch(data.type){
            case "log":
                var path = "./Log/" + get_date() + "/" + data.path + ".log"
                fs.mkdirSync(path.slice(0,path.lastIndexOf("/")),{ recursive: true })
                fs.writeFile(path,get_time() + data.text + "\n",{
                    flag : "a"
                },(err)=>{
                    if(err != null){
                        log(`Can't Record:\nPath:${path}\nText:${data.text}`)
                    }
                })
                break
            case "print":
                log(data.text)
                break
        }
    }
  })

  server.listen(config.port,config.address,()=>{
    log("日志服务器已搭建完成！")
  });
