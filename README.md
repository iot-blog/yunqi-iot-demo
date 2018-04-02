# yunqi-iot-demo
深圳云栖大会阿里云IoT物联网套件开发实战
## aliyun-iot-client
设备端sdk使用案例
* 设备端和阿里云IoT建立连接
* 上报温湿度数据
* 转储表格存储TableStore
* 转发钉钉群机器人
* 接收服务端指令，开启/关闭LED灯

## aliyun-iot-server
服务端POP API使用案例
* 通过API远程控制设备端led灯开/关

# 一.温湿度计采集数据通过阿里云IoT套件转储到表格存储(OTS)
![](https://cdn.yuque.com/lark/2018/png/15292/1522636558119-6aacbc99-8ad9-429a-9512-c9e997c60086.png)
## 1.阿里云IoT物联网套件
* 开通物联网套件 https://www.aliyun.com/product/iot
* =>产品管理>创建产品
* =>产品管理>产品详情>设备管理>创建设备
* =>产品管理>产品详情>设备管理>添加自定义属性 tag，imei
| 属性名key | 属性值value | 描述|
| ------| ------ | ------ |
| tag | 西溪园区 1-2-56 | 自定义设备位置 |
| imei | XIXI2018034532 | 自定义设备序列号 |


* =>产品管理>产品详情>消息通信

| Topic | 权限 | 描述|
| ------| ------ | ------ |
| /productKey/${deviceName}/data | 发布 | 上报数据 |
| /productKey/${deviceName}/control | 订阅 | 下行指令 |

```
上报数据payload为json示例：
{"temperature":23,"humidity":63}

下行指令payload为json示例：
{"device": "iotLed","state": "on"}
```

* =>规则引擎>创建规则 toTableStore
* =>规则引擎>规则详情>数据处理

```
字段：
deviceName() as deviceName ,                        //函数
timestamp('yyyy-MM-ddHH:mm:ss') as time,           //函数
attribute('tag') as tag,attribute('imei') as imei,  //取自定义属性
humidity, temperature                               //取payload数据

Topic：
/productKey/+/data
```
![数据处理](https://cdn.yuque.com/lark/2018/png/15292/1522114891160-c022b6a9-8794-4023-bcfb-103893bacead.png)

## 2.表格存储ots

* 开通ots服务 https://www.aliyun.com/product/ots
* 创建实例iotStore
* 建表iotMsg主键 device，类型STRING
* 创建otsRole角色
* 配置规则引擎转发到iotMsg实例中的iot_data表 
* device主键映射sql结果中的 ${deviceName}

* =>规则引擎>规则详情>转发数据目的地
![转发数据目的地](https://cdn.yuque.com/lark/2018/png/15292/1522114915229-8d4e21fd-7161-4f18-bfd4-5716055faeda.png)

## 3.硬件端开发

* 创建文件夹 mkdir ali-iot-client
* 进入文件夹 cd ali-iot-client
* 创建工程 rap init
* 添加硬件和驱动 rap device add humirature
* 查看硬件接线 rap layout --visual

完整过程
```
$ mkdir ali-iot-client
$ cd ali-iot-client
$ rap init
? app name: ali-iot-client
? version: 0.1.0
? description: 
? author: 
Installing main board module...
Done, happy crafting!

$ rap device add humirature
? model: DHT11
Searching supported drivers from Rap registry...
? select a driver for device "humirature"(DHT11): dht11@0.3.6
$ rap layout --visual
```

* 在package.json中增加iot的sdk包 aliyun-iot-device-mqtt
```
"ruff": {
    "dependencies": {
      //添加阿里云IoT的设备端sdk
      "aliyun-iot-device-mqtt": "^0.0.5", 
      "dht11": "^0.3.6"
    },
    "version": 1
  }
```
* 安装依赖 
```
$ rap install
```
* 安装完目录结构如下：
![转发数据目的地](https://cdn.yuque.com/lark/2018/png/15292/1522114958206-3985fb7c-ae17-4431-9bc5-2c63f238dbcc.png)
* 编写业务逻辑 /src/index.js
```
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
```
* 连接Ruff_Rxxxxx的wifi，发布到硬件板  
```
$ rap deploy –s
```
## 4.设备通电，验证
* 验证设备连接成功
![](https://cdn.yuque.com/lark/2018/png/15292/1522242630924-b607cff2-96d0-4772-ba05-e78dc0dce139.png)
* 验证数据上传成功
![](https://cdn.yuque.com/lark/2018/png/15292/1522242685121-1ef75310-f3dc-4b91-946f-e5a20ab559c9.png)
* 验证表格存储OTS有数据
![](https://cdn.yuque.com/lark/2018/png/15292/1522115060665-e13b9b56-06e8-4742-b8e3-dfd94b424d69.png)

# 二.通过函数计算FC将数据发布到钉钉群
![](https://cdn.yuque.com/lark/2018/png/15292/1522115086809-45a0f0fb-a487-4659-b485-06da55a85e67.png)
## 1.函数计算fc

* 开通FC函数计算服务https://www.aliyun.com/product/fc
* 创建服务，创建Nodejs函数
```
const https = require('https');
//深圳云栖Workshop钉钉群机器人token
const accessToken = '';

module.exports.handler = function(event, context, callback) {
    var eventJson = JSON.parse(event.toString());

    const postData = JSON.stringify({
        "msgtype": "markdown",
        "markdown": {
            "title": "温湿度传感器",
            "text": "#### 温湿度传感器上报\n" +
                "> 设备位置：" + eventJson.tag + "\n\n" +
                "> 设备编号：" + eventJson.imei+ "\n\n" +
                "> 实时温度：" + eventJson.temperature + "℃\n\n" +
                "> 相对湿度：" + eventJson.humidity + "%\n\n" +
                "> ###### " + eventJson.time + " 发布  by [物联网套件](https://www.atatech.org/articles/98370) \n"
          //https://www.aliyun.com/product/iot
        },
        "at": {
            "isAtAll": false
        }
    });

    const options = {
        hostname: 'oapi.dingtalk.com',
        port: 443,
        path: '/robot/send?access_token='+accessToken,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    const req = https.request(options, (res) => {

        res.setEncoding('utf8');
        res.on('data', (chunk) => {});
        res.on('end', () => {
            callback(null, 'success');
        });
    });

    req.on('error', (e) => {
        callback(e);
    });

    // 写入数据请求主体
    req.write(postData);
    req.end();

};
```
## 2.IoT套件规则引擎
* 配置规则引擎，转发到函数计算图片: ![](https://cdn.yuque.com/lark/2018/png/15292/1522115116279-4b760249-07e8-4f2c-9c63-055f9a37fc84.png)

# 三.通过服务端sdk控制设备
## 1.IoT套件控制台方式
* 通过IoT套件控制台下发指令 /{productKey}/+/control 
```
//on开灯，off关灯
{"device": "iotLed","state": "on"}
```
## 2.通过阿里云POP API实现指令下发
* 创建文件夹
mkdir ali-iot-server
* 添加 package.json,
* 增加iot服务端sdk依赖aliyun-iot-server-sdk
```
{
  "name": "aliyun-iot-server-sdk-demo",
  "version": "0.0.1",
  "description": "阿里云IoT套件 Server sdk",
  "private": true,
  "dependencies": {
    "aliyun-iot-server-sdk": "^0.0.2",
    "co": "4.6.0"
  },
  "author": "",
  "license": "MIT"
}
```
添加index.js
```
'use strict';
var IotServerSDK = require('aliyun-iot-server-sdk');
const co = require('co');

var options = {
        accessKey: '', //主账号accessKey
        accessKeySecret: '',//主账号accessKeySecret
};

var serverAPI = IotServerSDK.getIotServerClient(options);

co(function*() {
    
    //开关灯数据指令
    var pubBody = {
        device: "iotLed",
        state: "on" //on 开灯，off关灯
    }
    var params = {
        ProductKey: "RY8ExdyS6lU", //产品productKey
        TopicFullName: "/RY8ExdyS6lU/bedRoomThermometer/control", //设备订阅的topic
        MessageContent: new Buffer(JSON.stringify(pubBody)).toString('base64'),
        Qos: "0"
    };
    //发布指令到阿里云IoT平台，iot平台会推送到设备端
    var data = yield serverAPI.pub(params);

    console.log(data);
});
```
* 目录结构

![](https://cdn.yuque.com/lark/2018/png/15292/1522637045310-f60685b2-111e-49d2-81b7-afc51334662d.png)

* 执行程序
```
$ npm install --registry=https://registry.npm.taobao.org
$ node index.js
```

# 帮助&反馈
![](https://cdn.yuque.com/lark/2018/png/15292/1522115158720-65d25f72-ce35-4214-b166-81a83469e3bb.png)


![](https://cdn.yuque.com/lark/2018/png/15292/1522115173842-a9d0ee66-4199-456c-a17c-0dd8bfc1f399.png)
