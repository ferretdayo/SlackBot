const request = require('request')
const Botkit = require('botkit')
const os = require('os')

if (!process.env.token || !process.env.hotpepper_api_key || !process.env.client_id || !process.env.client_secret) {
  console.log('Error: Specify token in environment')
  process.exit(1)
}

const controller = Botkit.slackbot({
  // interactive_replies: true, // tells botkit to send button clicks into conversations
  json_file_store: './db_slackbutton_bot/',
  debug: true
}).configureSlackApp(
  {
    clientId: process.env.client_id,
    clientSecret: process.env.client_secret,
    scopes: ['bot'],
  }
)

controller.setupWebserver(process.env.PORT,function(err,webserver) {

  // set up web endpoints for oauth, receiving webhooks, etc.
  controller
    .createHomepageEndpoint(controller.webserver)
    .createOauthEndpoints(controller.webserver, (err,req,res) => {
      if (err) {
        res.status(500).send('ERROR: ' + err)
        console.log('Faild!')
      } else {
        res.send('Success!');
        console.log('Success!')
      }
    })
    .createWebhookEndpoints(controller.webserver);

});


const bot = controller.spawn({
  token: process.env.token
}).startRTM()

controller.hears(['(.*)って呼んで'], 'direct_message,direct_mention,mention', function (bot, message) {

  // 「◯◯って呼んで」の、◯◯の部分を取り出します。
  // message.match[1] には、hearsの正規表現にマッチした単語が入っています。

  const name_from_msg = message.match[1]

  // まず、controller.storage.users.getで、ユーザーデータを取得します。

  // message.userには、ユーザーIDが入っています。
  // ユーザーデータは、ユーザーIDと紐付けていますので、第一引数には、必ずmessage.userを入れます。

  controller.storage.users.get(message.user, function (err, user_info) {
      // ▼ データ取得後の処理 ▼

      // ユーザーデータが存在しているかどうか調べる
      // ※第二引数で指定した変数(ここでは'user_info')に、ユーザーデータが入っています。
      if (!user_info) {
          // ▼ ユーザーデータがなかった場合の処理 ▼
          // ユーザーidとユーザー名 のオブジェクトを、user_infoとして作成します。
          user_info = {
              id: message.user,
              name: name_from_msg
          }
      }

      // user_infoを保存します。
      controller.storage.users.save(user_info, function (err, id) {
          // ▼ 保存完了後の処理▼
          bot.reply(message, 'あなたのお名前は *' + user_info.name + '* さんですね！覚えました！')
      })
  })
})

controller.hears(['(.*)お店(.*)', '(.*)居酒屋(.*)', '(.*)ランチ(.*)', '(.*)ご飯(.*)', '(.*)ごはん(.*)'], 'direct_message,direct_mention,mention', function (bot, message) {
  let place = ''
  let price = 0
  let genre = ''
  const askPlace = (err, convo) => {
    convo.ask('最寄り駅は？(ex:\'○○駅\')', (response, convo) => {
      let match = response.text.match(/.*駅/g)
      if (!!response.text && match) {
        place = response.text
        convo.say('It\'s nice.')
        askPrice(response, convo)
        convo.next()
      } else {
        convo.say('フォーマットは\'○○駅\'だよ！')
        askPlace(response, convo)
        convo.next()
      }
    })
  }
  const askPrice = (response, convo) => {
    convo.ask({
      attachments:[
        {
          title: '予算はいくら以内？',
          callback_id: '123',
          attachment_type: 'default',
          actions: [
            {
                "name":"500",
                "text": "500円以内",
                "value": "500",
                "type": "button",
            },
            {
                "name":"100",
                "text": "1000円以内",
                "value": "1000",
                "type": "button",
            },
            {
                "name":"1500",
                "text": "1500円以内",
                "value": "1500",
                "type": "button",
            },
            {
                "name":"2000",
                "text": "2000円以内",
                "value": "2000",
                "type": "button",
            },
            {
                "name":"2500",
                "text": "2500円以内",
                "value": "2500",
                "type": "button",
            },
            {
                "name":"3000",
                "text": "3000円以内",
                "value": "3000",
                "type": "button",
            },
            {
                "name":"3500",
                "text": "3500円以内",
                "value": "3500",
                "type": "button",
            },
            {
                "name":"4000",
                "text": "4000円以内",
                "value": "4000",
                "type": "button",
            }
          ]
        }]
      }, (response, convo) => {
        console.log(JSON.stringify(response))
        askFoodGenre(response, convo)
        convo.next()
      // let match = response.text.match(/[1-9]+\d+/g)
      // if (match) {
      //   price = match[0]
      //   convo.say('Hey, wealthy people! I spend too much money on meals. Give me money!')
      //   askFoodGenre(response, convo)
      //   convo.next()
      // } else {
      //   convo.say('ちゃんと予算入力しろや!')
      //   askPrice(response, convo)
      //   convo.next()
      // }
    })
  };
  const askFoodGenre = (response, convo) => {
      convo.ask('料理のジャンルは？', (response, convo) => {
        if (!!response.text) {
          genre = response.text
          convo.say('Umm...It\'s ok.')
        }
        showFoodList(response, convo)
        convo.next()
      })
  }
  const showFoodList = (response, convo) => {
    request.get({
      url: 'https://webservice.recruit.co.jp/hotpepper/gourmet/v1',
      qs: {
        key: process.env.hotpepper_api_key,
        keyword: place + ',' + genre,
        budget: {
          average: '〜' + price
        },
        order: 4,
        format: 'json'
      }
    }, (err, response, body) => {
      const json = JSON.parse(body)
      const shops = json.results.shop
      shops.forEach(shop => {
        bot.reply(message, shop.name + ", " + shop.urls.pc)
      })
      convo.next()
    })
  }

  bot.startConversation(message, askPlace)
})

controller.on('interactive_message_callback', function(bot, message) {
  if (message.callback_id == "123") {
    console.log(JSON.stringify(message))
    bot.replyInteractive(message, {
      "text": JSON.stringify(message)
    })
  }
})