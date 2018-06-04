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

controller.hears(['(.*)お店(.*)', '(.*)お酒(.*)', '(.*)飲み(.*)', '(.*)居酒屋(.*)', '(.*)ランチ(.*)', '(.*)ご飯(.*)', '(.*)ごはん(.*)'], 'direct_message,direct_mention,mention', function (bot, message) {
  let place = ''
  let budget = { name: '', value:'' }
  let genre = ''
  let freeDrinkFlag = 0


  addReaction(bot, message, 'robot_face')

  const askPlace = (err, convo) => {
    convo.ask('最寄り駅は？(ex:\'○○駅\')', (response, convo) => {
      let match = response.text.match(/.*駅/g)
      if (!!response.text && match) {
        place = response.text
        console.log("[PLACE]: " + place)
        addReaction(bot, response, 'station')
        convo.say('It\'s nice.')
        convo.next()
        askBudget(response, convo)
      } else {
        convo.say('フォーマットは\'○○駅\'だよ！')
        convo.next()
        askPlace(response, convo)
      }
    })
  }

  const askBudget = (response, convo) => {
    request.get({
      url: 'https://webservice.recruit.co.jp/hotpepper/budget/v1',
      qs: {
        key: process.env.hotpepper_api_key,
        format: 'json'
      }
    }, (err, response, body) => {
      const json = JSON.parse(body)
      const budgets = json.results.budget
      let budgetsAction = []
      budgets.forEach(budget => {
        budgetsAction.push({
          "text": budget.name,
          "value": budget.code
        })
      })
      convo.ask({
        text: "予算はいくら以内ですか？",
        response_type: "in_channel",
        attachments: [
          {
            text: "金額を選んでください．",
            fallback: "If you could read this message, you'd be choosing something fun to do right now.",
            color: "#3AA3E3",
            attachment_type: "default",
            callback_id: "123",
            actions: [
              {
                name: "prices_list",
                text: "Pick a price...",
                type: "select",
                options: [
                  {
                    name: "指定なし",
                    value: ''
                  },
                  ...budgetsAction]
              }
            ]
          }
        ]
      }, (response, convo) => {
        budget.value = response.actions[0].selected_options[0].value
        budget.name = response.actions[0].selected_options[0].name
        console.log("[BUDGET]: " + budget)
        convo.say(budget.name + " yen...\nHey, wealthy people! You spend too much money on meals. \nGive me money!")
        convo.next()
        askFoodGenre(response, convo)
      })
    })
    setTimeout(() => convo.say("次は予算だよー!"), 200)
  }

  const askFoodGenre = (response, convo) => {
    request.get({
      url: 'https://webservice.recruit.co.jp/hotpepper/genre/v1',
      qs: {
        key: process.env.hotpepper_api_key,
        format: 'json'
      }
    }, (err, response, body) => {
      const json = JSON.parse(body)
      const genres = json.results.genre
      let genresAction = []
      genres.forEach(genre => {
        genresAction.push({
          "text": genre.name,
          "value": genre.code
        })
      })
      convo.ask({
        text: "料理のジャンルは？",
        response_type: "in_channel",
        attachments: [
          {
            text: "ジャンルを選んでください．",
            fallback: "If you could read this message, you'd be choosing something fun to do right now.",
            color: "#3AA3E3",
            attachment_type: "default",
            callback_id: "genre_selection",
            actions: [
              {
                name: "genres_list",
                text: "Pick a genre...",
                type: "select",
                options: [...genresAction]
              }
            ]
          }
        ]
      }, (response, convo) => {
        genre = response.actions[0].selected_options[0].value
        console.log("[GENRE]: " + genre)
        convo.next()
        freeDrink(response, convo)
      })
    })
    setTimeout(() => convo.say("次はジャンルだよー!"), 200)
  }

  const freeDrink = (response, convo) => {
    convo.ask({
      text: "飲み放題がいいですか？",
      response_type: "in_channel",
      attachments: [
        {
          text: "どちらがいいか選んでください．",
          fallback: "If you could read this message, you'd be choosing something fun to do right now.",
          color: "#3AA3E3",
          attachment_type: "default",
          callback_id: "free_drink",
          actions: [
            {
              name: "free_drink_option",
              text: "Pick a option...",
              type: "select",
              options: [
                {
                  "text": "飲み放題",
                  "value": "1"
                },
                {
                  "text": "飲み放題じゃなくていい",
                  "value": "0"
                }
              ]
            }
          ]
        }
      ]
    }, (response, convo) => {
      freeDrinkFlag = parseInt(response.actions[0].selected_options[0].value)
      console.log("[FREE DRINK FLAG]: " + freeDrinkFlag)
      if (!!freeDrinkFlag) {
        convo.say("Do not drink too much and do not get drunk :beers:")
      } else {
        convo.say("That\'s peace :innocent:")
      }
      convo.next()
      showFoodList(response, convo)
    })
  }
  
  const showFoodList = (response, convo) => {
    console.log("place: " + place)
    console.log("price: " + budget.name + "円")
    console.log("genre: " + genre)
    request.get({
      url: 'https://webservice.recruit.co.jp/hotpepper/gourmet/v1',
      qs: {
        key: process.env.hotpepper_api_key,
        keyword: place,
        genre: genre,
        budget: budget.value,
        free_drink: freeDrinkFlag,
        order: 4,
        format: 'json'
      }
    }, (err, response, body) => {
      const json = JSON.parse(body)
      const shops = json.results.shop
      console.log("[SHOP LIST] : " + JSON.stringify(shops))
      if (shops.length > 0) {
        bot.reply(message, 'Umm...It\'s ok.')
        shops.forEach(shop => {
          bot.reply(message, shop.name + ", " + shop.urls.pc)
        })
      } else {
        bot.reply(message, "Sorry... I don\'t find restaurant:sob:")
      }
    })
  }

  bot.startConversation(message, askPlace)
})

function addReaction(bot, response, reactionType) {
  bot.api.reactions.add({
    timestamp: response.ts,
    channel: response.channel,
    name: reactionType,
  }, function(err,res) {
    if (err) {
      bot.botkit.log("Failed to add emoji reaction :(", err)
    }
  })
}