# yunqi-iot-demo
阿里云IoT物联网套件开发实战
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
![](https://raw.githubusercontent.com/iot-blog/yunqi-iot-demo/master/images/iot-ots.png)
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

```JavaScript
上报数据payload为json示例：
{"temperature":23,"humidity":63}

下行指令payload为json示例：
{"device": "iotLed","state": "on"}
```

* =>规则引擎>创建规则 toTableStore
* =>规则引擎>规则详情>数据处理

```JavaScript
字段：
deviceName() as deviceName ,                        //函数
timestamp('yyyy-MM-ddHH:mm:ss') as time,           //函数
attribute('tag') as tag,attribute('imei') as imei,  //取自定义属性
humidity, temperature                               //取payload数据

Topic：
/productKey/+/data
```
![数据处理](https://raw.githubusercontent.com/iot-blog/yunqi-iot-demo/master/images/rule-sql.png)

## 2.表格存储ots

* 开通ots服务 https://www.aliyun.com/product/ots
* 创建实例iotStore
* 建表iotMsg主键 device，类型STRING
* 创建otsRole角色
* 配置规则引擎转发到iotMsg实例中的iot_data表
* device主键映射sql结果中的 ${deviceName}

* =>规则引擎>规则详情>转发数据目的地
![转发数据目的地](https://raw.githubusercontent.com/iot-blog/yunqi-iot-demo/master/images/rule-ots.png)

## 3.硬件端开发

* 创建文件夹 mkdir ali-iot-client
* 进入文件夹 cd ali-iot-client
* 创建工程 rap init
* 添加硬件和驱动 rap device add humirature
* 设备型号 DHT11
* 查看硬件接线 rap layout --visual

完整过程
```bash
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
```JavaScript
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
```bash
$ rap install
```
* 安装完目录结构如下：
![转发数据目的地](https://raw.githubusercontent.com/iot-blog/yunqi-iot-demo/master/images/iot-client.png)
* 编写业务逻辑 /src/index.js
```JavaScript
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
```bash
$ rap deploy -s
```
## 4.设备通电，验证
* 验证设备连接成功
![](https://raw.githubusercontent.com/iot-blog/yunqi-iot-demo/master/images/iot-online.png)
* 验证数据上传成功
![](https://raw.githubusercontent.com/iot-blog/yunqi-iot-demo/master/images/iot-data-up.png)
* 验证表格存储OTS有数据
![](https://raw.githubusercontent.com/iot-blog/yunqi-iot-demo/master/images/ots.png)

# 二.通过函数计算FC将数据发布到钉钉群
![](https://raw.githubusercontent.com/iot-blog/yunqi-iot-demo/master/images/iot-fc.png)
## 1.函数计算fc

* 开通FC函数计算服务https://www.aliyun.com/product/fc
* 创建服务，创建Nodejs函数

```JavaScript
'use strict';

const Bot = require('dingbot');

//深圳云栖Workshop钉钉群机器人token
const accessToken = '';

const bot = new Bot(`https://oapi.dingtalk.com/robot/send?access_token=${accessToken}`);

function hook(asyncCall) {
  return function (event, context, callback) {
    asyncCall(event, context).then(() => {
        callback(null);
    }, (err) => {
        callback(err);
    });
  }
}

exports.handler = hook(async function(event, context) {
    var eventJson = JSON.parse(event.toString());

    await bot.markdown("温湿度传感器", "#### 温湿度传感器上报\n" +
        "> 设备位置：" + eventJson.tag + "\n\n" +
        "> 设备编号：" + eventJson.imei+ "\n\n" +
        "> 实时温度：" + eventJson.temperature + "℃\n\n" +
        "> 相对湿度：" + eventJson.humidity + "%\n\n" +
        "> ###### " + eventJson.time + " 发布  by [物联网套件](https://www.aliyun.com/product/iot) \n");
});
```

编写 faas.yaml 文件

```yaml
function-compute:
  region: 'cn-shanghai'
  services:
    - name: 'IoT_Service'
      description: 'IoT_Service demo'
      functions:
        - name: 'pushData2DingTalk'
          description: 'demo'
          handler: index.handler
          runtime: nodejs8
          codes:
            - 'index.js'
```

在 ali-iot-fc 目录下执行 `fun deploy` 将函数部署。

## 2.IoT套件规则引擎
* 配置规则引擎，转发到函数计算图片: ![](https://raw.githubusercontent.com/iot-blog/yunqi-iot-demo/master/images/rule-fc.png)

# 三.通过服务端sdk控制设备
## 1.IoT套件控制台方式
* 通过IoT套件控制台下发指令 /{productKey}/+/control
```JavaScript
//on开灯，off关灯
{"device": "iotLed","state": "on"}
```
## 2.通过阿里云POP API实现指令下发
* 创建文件夹
mkdir ali-iot-server
* 添加 package.json,
* 增加iot服务端sdk依赖aliyun-iot-server-sdk
```JavaScript
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
```JavaScript
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

![](https://raw.githubusercontent.com/iot-blog/yunqi-iot-demo/master/images/iot-server.png)

* 执行程序
```bash
$ npm install --registry=https://registry.npm.taobao.org
$ node index.js
```

# IoT物联网技术-微信公共账号

<img src='https://raw.githubusercontent.com/wongxming/ecs/master/iot-tech-weixin.png' width="260" height="260" />
