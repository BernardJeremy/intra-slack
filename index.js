const fs = require('fs');
const phantom = require('phantom')
const Slack = require('slack-node');
const slackify = require('slackify-html');

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36';

// Retrieve config
const login = require('./config.json').login;
const password = require('./config.json').password;
const linkAPI = require('./config.json').linkAPI;
const slackUrl = require('./config.json').slackHookUrl;
const slackName = require('./config.json').slackHookName;

// Retrieve message from intra API
function getContent(url) {
  return new Promise(function(fulfill, reject) {
    let postBody = 'login=' + login + '&password=' + password;
    let phInstance = null;
    let sitepage = null;
    phantom.create()
      .then(instance => {
          phInstance = instance;
          return instance.createPage();
      })
      .then(page => {
          page.setting("userAgent", USER_AGENT);
          sitepage = page;
          return page.open(url, 'POST', postBody);
      })
      .then(status => {
          return sitepage.property('plainText');
      })
      .then(content => {
          fulfill(content);
          sitepage.close();
          phInstance.exit();
      })
      .catch(error => {
          reject(error);
          phInstance.exit();
      });
  });
}

// Send the slack message to the config's webhook
function sendSlackMessage(text) {
  let msgParameters = {
    username: slackName,
    text: text,
  };
  let slack = new Slack();
  slack.setWebhook(slackUrl);
  slack.webhook(msgParameters, function (err, response) {
    if (response.statusCode != 200) {
      console.log(err, response);
    }
  });
}

// return filename
function getSaveFilename(type) {
  return 'savedID_intra_' + type + '.json'
}

// Perform update of the save data file
function updateSavedData(savedData, type, newID) {
  savedData[newID] = true;
  if (fs.existsSync(getSaveFilename(type))) {
    fs.unlinkSync(getSaveFilename(type));
  }
  fs.writeFileSync(getSaveFilename(type), JSON.stringify(savedData));
}

function decodeHTMLEntities(text) {
    var entities = [
        ['apos', '\''],
        ['amp', '&'],
        ['lt', '<'],
        ['gt', '>']
    ];

    for (var i = 0, max = entities.length; i < max; ++i)
        text = text.replace(new RegExp('&'+entities[i][0]+';', 'g'), entities[i][1]);

    return text;
}

function objIsEmpty(obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

// return potential saved data from file
function getSavedData(type) {
  let savedData = {};
  if (fs.existsSync(getSaveFilename(type))) {
    savedData = JSON.parse(fs.readFileSync(getSaveFilename(type), 'utf8'));
  }

  return savedData;
}

// iterate over every messages and send new one to slack
function messageNotifier(json, type) {
  let savedData = getSavedData(type);
  let initializing = objIsEmpty(savedData);

  for (let i = 0; i < json.length; i++){
    let msg = json[i];
    let id = msg.id;

    if (initializing || !(id in savedData)) {
      let title = decodeHTMLEntities(msg.title);
      title = title.split('href="').join('href="https://intra.epitech.eu');
      title = slackify(title);
      if (initializing == false) {
        sendSlackMessage(title);
      }
      updateSavedData(savedData, type, id);
    }
  }
}

// iterate over every modules and send new one to slack
function moduleNotifier(json, type) {
  let savedData = getSavedData(type);
  let initializing = objIsEmpty(savedData);

  for (let i = 0; i < json.length; i++){
    let module = json[i];
    let id = module.title_link;

    if (initializing || !(id in savedData)) {
      let title = "*New module available* : ";
      title += "<" + "https://intra.epitech.eu" + decodeHTMLEntities(module.title_link);
      title += "|" + decodeHTMLEntities(module.title) + ">";
      if (initializing == false) {
        sendSlackMessage(title);
      }
      updateSavedData(savedData, type, id);
    }
  }
}

function main() {
  getContent(linkAPI).then(function(content) {
    let json = JSON.parse(content);

    messageNotifier(json.history, "history");
    moduleNotifier(json.board.modules, "modules");

  }).catch(function(err) {
    console.log(err);
  });
}

main();
