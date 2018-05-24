const Botkit = require('botkit')
const os = require('os')

if (!process.env.token) {
  console.log('Error: Specify token in environment')
  process.exit(1)
}

const controller = Botkit.slackbot({
  debug: true,
})

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

controller.hears(['(.*)お店(.*)', '(.*)居酒屋(.*)', '(.*)ランチ(.*)', '(.*)ご飯(.*)', '(.*)ごはん(.*)'], 'ambient,direct_message,direct_mention,mention', function (bot, message) {
  var askPlace = function(err, convo) {
    convo.ask('最寄り駅は？', function(response, convo) {
       convo.say('It\'s nice.')
       askPrice(response, convo)
       convo.next()
    })
  }
  var askPrice = function(response, convo) {
      convo.ask('予算は？', function(response, convo) {
        convo.say('Hey, wealthy people! I spend too much money on meals. Give me money!')
        askFoodGenre(response, convo)
        convo.next()
      })
  };
  var askFoodGenre = function(response, convo) {
      convo.ask('料理のジャンルは？', function(response, convo) {
        convo.say('Umm...It\'s ok.')
        convo.next()
      })
  };

  bot.startConversation(message, askFlavor);
  // bot.reply(message, JSON.stringify(message))
})
