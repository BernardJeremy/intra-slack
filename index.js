const fs = require('fs');
const https = require('https');
const Slack = require('slack-node');
const slackify = require('slackify-html');

// Retrieve config
const config = require('./config.json');

// Send the slack message to the config's webhook
function sendSlackMessage(text, content, date) {
  const msgParameters = {
    username: config.slackHookName,
    text,
  };
  if (content !== null && date !== null) {
    msgParameters.attachments = [
      {
        color: '#015a9f',
        fields: [
          {
            title: date,
            value: content,
            short: false,
          },
        ],
      },
    ];
  }
  const slack = new Slack();
  slack.setWebhook(config.slackHookUrl);
  slack.webhook(msgParameters, (err, response) => {
    if (response.statusCode !== 200) {
      console.log(err, response);
    }
  });
}

// return filename
function getSaveFilename(type) {
  return `savedID_intra_${type}.json`;
}

// Perform update of the save data file
function updateSavedData(savedData, type, newID) {
  const newSavedData = savedData;
  newSavedData[newID] = true;
  if (fs.existsSync(getSaveFilename(type))) {
    fs.unlinkSync(getSaveFilename(type));
  }
  fs.writeFileSync(getSaveFilename(type), JSON.stringify(newSavedData));
}

function decodeHTMLEntities(text) {
  const entities = [
    ['apos', '\''],
    ['amp', '&'],
    ['lt', '<'],
    ['gt', '>'],
  ];
  let decodedText = text;

  for (let i = 0, max = entities.length; i < max; i += 1) {
    decodedText = decodedText.replace(new RegExp(`&${entities[i][0]};`, 'g'), entities[i][1]);
  }

  return decodedText;
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
  const savedData = getSavedData(type);

  for (let i = 0; i < json.length; i += 1) {
    const msg = json[i];
    const id = msg.id;

    if (!(id in savedData)) {
      let title = decodeHTMLEntities(msg.title);
      title = title.split('href="').join('href="https://intra.epitech.eu');
      title = slackify(title);
      const content = slackify(msg.content);
      const date = slackify(msg.date);
      sendSlackMessage(title, content, date);
      updateSavedData(savedData, type, id);
    }
  }
}

// iterate over every modules and send new one to slack
function moduleNotifier(json, type) {
  const savedData = getSavedData(type);

  for (let i = 0; i < json.length; i += 1) {
    const module = json[i];
    const id = module.title_link;

    if (!(id in savedData)) {
      let title = '*New module available* : ';
      title += `<https://intra.epitech.eu${decodeHTMLEntities(module.title_link)}`;
      title += `|${decodeHTMLEntities(module.title)}>`;
      sendSlackMessage(title, null, null);
      updateSavedData(savedData, type, id);
    }
  }
}

function main() {
  const postBody = `{"login": "${config.login}", "password": "${config.password}"}`;
  const options = {
    hostname: config.hostname,
    path: config.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const callback = (res) => {
    let response = '';
    res.setEncoding('utf8');
    res.on('data', (body) => {
      response += body;
    });
    res.on('end', () => {
      const json = JSON.parse(response);
      messageNotifier(json.history, 'history');
      moduleNotifier(json.board.modules, 'modules');
    });
  };
  const req = https.request(options, callback);
  req.on('error', (e) => {
    console.log(`Problem with intra request: ${e.message}`);
  });
  // write data to request body
  req.write(postBody);
  req.end();
}

main();
