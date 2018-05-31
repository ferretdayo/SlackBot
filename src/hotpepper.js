const request = require('request')

modules.export = (err, convo) => {
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

function askPrice(response, convo) {
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
                "text": "500円以内",
                "value": "500"
              },
              {
                "text": "1000円以内",
                "value": "1000"
              },
              {
                "text": "1500円以内",
                "value": "1500"
              },
              {
                  "text": "2000円以内",
                  "value": "2000"
              },
              {
                  "text": "2500円以内",
                  "value": "2500"
              },
              {
                  "text": "3000円以内",
                  "value": "3000"
              },
              {
                  "text": "3500円以内",
                  "value": "3500"
              },
              {
                  "text": "4000円以内",
                  "value": "4000"
              }
            ]
          }
        ]
      }
    ]
  }, (response, convo) => {
    price = response.actions[0].selected_options[0].value
    convo.say(price + " yen...\nHey, wealthy people! I spend too much money on meals. \nGive me money!")
    convo.next()
  })
  askFoodGenre(response, convo)
  convo.next()
}

async function askFoodGenre(response, convo){
  let genresAction = []
  await request.get({
    url: 'https://webservice.recruit.co.jp/hotpepper/genre/v1',
    qs: {
      key: process.env.hotpepper_api_key,
      format: 'json'
    }
  }, (err, response, body) => {
    const json = JSON.parse(body)
    const genres = json.results.genre
    genres.forEach(genre => {
      genresAction.push({
        "text": genre.name,
        "value": genre.code
      })
    })
    console.log("1st action")
  })
  console.log("2st action")
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
    convo.say('Umm...It\'s ok.')
    showFoodList(response, convo)
    convo.next()
  })
}

async function showFoodList(response, convo) {
  console.log("place: " + place)
  console.log("price: " + price + "円")
  console.log("genre: " + genre)
  await request.get({
    url: 'https://webservice.recruit.co.jp/hotpepper/gourmet/v1',
    qs: {
      key: process.env.hotpepper_api_key,
      keyword: place,
      genre: genre,
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
  })
  convo.next()
}