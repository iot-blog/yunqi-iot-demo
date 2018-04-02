// 引入aliyun-iot-sdk
var MQTT = require('aliyun-iot-device-mqtt');

// 个人账号
var options = {
    productKey: "",//替换为自己的
    deviceName: "",//替换为自己的
    deviceSecret: "",//替换为自己的
    regionId: "cn-shanghai",//华东2
};
// 发布/订阅 topic
var pubTopic = "/" + options.productKey + "/" + options.deviceName + "/data";
var subTopic = "/" + options.productKey + "/" + options.deviceName + "/control";

// 建立连接
var client = MQTT.createAliyunIotMqttClient(options);

$.ready(function(error) {
    if (error) {
        console.log(error);
        return;
    }
	//10s上报一次
    setInterval(publishData, 10 * 1000);
	//订阅topic
    client.subscribe(subTopic)
    //添加topic处理函数
    client.on('message', doHandler)

});

//上报温湿度
function publishData() {
    $('#humirature').getTemperature(function(error, temperature) {
        if (error) {
            console.error(error);
            return;
        }
        $('#humirature').getRelativeHumidity(function(error, humidity) {
            if (error) {
                console.error(error);
                return;
            }
            var data = {
                "temperature": temperature,//温度
                "humidity": humidity       //湿度
            };
            console.log(JSON.stringify(data))
            //发布topic，上报数据
            client.publish(pubTopic, JSON.stringify(data));
        });
    });
}

//接收topic，处理下行指令
function doHandler(topic, message) {

    console.log(topic + "," + message.toString())

    if (topic === subTopic) {
        var msgJson = JSON.parse(message.toString());
        //如果指定设备为iotLed
        if (msgJson.device === 'iotLed') {
            //state为on，那么打开led-r灯
            if (msgJson.state === 'on') {

                $('#led-r').turnOn();

            } else {
                $('#led-r').turnOff();
                
            }
        }
    }
}