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
function getSaveFilename() {
  return 'savedID.json'
}

// Perform update of the save data file
function updateSavedData(savedData, newID) {
  savedData[newID] = true;
  if (fs.existsSync(getSaveFilename())) {
    fs.unlinkSync(getSaveFilename());
  }
  fs.writeFileSync(getSaveFilename(), JSON.stringify(savedData));
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

// iterate over every message and send new one to slack
function messageNotifier(json) {
  for (let i = 0; i < json.length; i++){
    let msg = json[i];
    let id = msg.id;

    let savedData = {};
    if (fs.existsSync(getSaveFilename())) {
      savedData = JSON.parse(fs.readFileSync(getSaveFilename(), 'utf8'));
    }

    if (savedData.length == 0 || !(id in savedData)) {
      let title = decodeHTMLEntities(msg.title);
      title = title.split('href="').join('href="https://intra.epitech.eu');
      title = slackify(title);
      console.log(title);
      //sendSlackMessage(title);
      updateSavedData(savedData, id);
    }
  }
}

function main() {
  getContent(linkAPI).then(function(content) {
    let json = JSON.parse(content);

    messageNotifier(json.history);

  }).catch(function(err) {
    console.log(err);
  });
}

main();
