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
