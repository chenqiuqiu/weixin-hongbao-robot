const {Wechaty, Room, Contact} = require('wechaty')
const { getUrl, isIncludeUrl, isSendUrl, getUserOwnInfo, isMeituan, getUrlType} = require("./utils")
const axios = require("axios")

const bot = Wechaty.instance({profile: '球球是你们的奶奶'}) //‘Promise’为微信名， 避免每次启动程序重新扫码
let userInfos = []   //用户信息（姓名，红包）

bot
.on('scan', (url, code)=>{
    console.log(url)
    let loginUrl = url.replace('qrcode', 'l')
    require('qrcode-terminal').generate(loginUrl)
})
.on('login', user=>{
    console.log(`${user} login`)
})
.on('friend', async (contact, request) => {
  const fileHelper = Contact.load('filehelper')

  try {
    if (request) {
       //New Friend Request
       await request.accept()
       console.log("好友申请: ",contact.name())
    } else {
      await contact.say("转发外卖红包到此微信号,提示后发送手机号领取最大红包")
    }
  } catch (e) {
    console.log(e.message)
  }

})
.on('message', async m => {
    /**
     * [发送到文件助手或者发送给微信号]
     */
    if (m.room())  return
    if (m.to().name() !== "File Transfer" && !m.to().self())  return

    // 文件助手
    const filehelper = await Contact.load('filehelper')
    //红包类型
    const type = getUrlType(m.content())
    //美团维护中
    if (type === 2) {
        //发送到机器人
        if (m.to().self()) {
            await m.from().say("美团红包暂时无法使用，饿了么或成最大赢家")
        }
        return
    }

    if( type > 0){
        const url = getUrl(m.content())

        userInfos.push({name: m.from().name(), url: url})
        console.log(m.from().name()+" 转发了红包 ","红包总数："+userInfos.length)

        if (type !== 4) {
            //发送到机器人
            if (m.to().self()) {
                await m.from().say("发送手机号码领取最大红包")
            }
            //发送到文件助手
            if (m.to().name() === "File Transfer") {
                await filehelper.say("发送手机号码领取最大红包")
            }
        }else {
            //发送到机器人
            if (m.to().self()) {
                await m.from().say("发送手机号码,帮你抢年终奖")
            }
            //发送到文件助手
            if (m.to().name() === "File Transfer") {
                await filehelper.say("发送手机号码,帮你抢年终奖")
            }
        }
    }

    /**
     * [是否为手机号码]
     */
    if (/^[1][3,4,5,7,8][0-9]{9}$/i.test(m.content())) {
        const mobile = m.content()
        let res = {}

        //是否发过红包
        if (isSendUrl(userInfos, m.from().name())) {
            try {
                const userOwnInfo = getUserOwnInfo(userInfos, m.from().name())
                // 检查用户是否发过红包
                console.log(userOwnInfo.name + " 正在领取红包：" + mobile, userOwnInfo.url)

                if (m.to().self()) {
                    await m.from().say("正在为您破解...")
                }
                res = await axios.post('http://47.98.107.68:3007/hongbao', {url: userOwnInfo.url, mobile})
                const delInfo = userInfos.splice(userInfos.indexOf(userOwnInfo), 1)
                console.log(delInfo[0].name+ " 的红包领取完毕")

            } catch (e) {
                console.log("出错",e.message)
                //发送到微信
                await m.from().say("请求出错，请重试")
            }
        }else {
            //发送到微信
            if (m.to().self()) {
                await m.from().say("你还没有转发外卖红包")
            }

            //发送到文件助手
            if (m.to().name() === "File Transfer") {
                await filehelper.say("你还没有转发外卖红包")
            }
            return
        }

        //发送到微信
        if (m.to().self()) {
            await m.from().say(res.data.message)
        }

        //发送到文件助手
        if (m.to().name() === "File Transfer") {
            await filehelper.say(res.data.message)
        }
    }
})
.start()
