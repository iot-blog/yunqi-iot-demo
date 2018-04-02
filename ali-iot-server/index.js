'use strict';
var IotServerSDK = require('aliyun-iot-server-sdk');
const co = require('co');

var options = {
        accessKey: '',//主账号 accessKey
        accessKeySecret: '',//主账号 accessKeySecret
};

var serverAPI = IotServerSDK.getIotServerClient(options);

co(function*() {
    
    //开关灯数据指令
    var pubBody = {
        device: "iotLed",
        state: "on" //on 开灯，off关灯
    }
    var params = {
        ProductKey: "RY8ExdyS6lU", //产品 productKey
        TopicFullName: "/RY8ExdyS6lU/bedRoomThermometer/control", //设备订阅的 topic
        MessageContent: new Buffer(JSON.stringify(pubBody)).toString('base64'),
        Qos: "0"
    };
    //发布指令到阿里云IoT平台，iot平台会推送到设备端
    var data = yield serverAPI.pub(params);

    console.log(data);
});