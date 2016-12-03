const fs = require('fs');
const https = require('https')
const Slack = require('slack-node');
const slackify = require('slackify-html');

// Retrieve config
var config = require('./config.json');

// Send the slack message to the config's webhook
function sendSlackMessage(text, content, date) {
	var msgParameters = {
		username: config.slackHookName,
		text: text,
	};
	if (content !== null && date !== null) {
		msgParameters.attachments = [
			{
				color: "#015a9f",
				fields:[
					{
						title:date,
						value:content,
						short:false
					}
				]
			}
		]
	}
	var slack = new Slack();
	slack.setWebhook(config.slackHookUrl);
	slack.webhook(msgParameters, function (err, response) {
		if (response.statusCode !== 200) {
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

// return potential saved data from file
function getSavedData(type) {
	var savedData = {};
	if (fs.existsSync(getSaveFilename(type))) {
		savedData = JSON.parse(fs.readFileSync(getSaveFilename(type), 'utf8'));
	}

	return savedData;
}

// iterate over every messages and send new one to slack
function messageNotifier(json, type) {
	var savedData = getSavedData(type);

	for (var i = 0; i < json.length; i++){
		var msg = json[i];
		var id = msg.id;

		if (!(id in savedData)) {
			var title = decodeHTMLEntities(msg.title);
			title = title.split('href="').join('href="https://intra.epitech.eu');
			title = slackify(title);
			var content = slackify(msg.content);
			var date = slackify(msg.date);
			sendSlackMessage(title, content, date);
			updateSavedData(savedData, type, id);
		}
	}
}

// iterate over every modules and send new one to slack
function moduleNotifier(json, type) {
	var savedData = getSavedData(type);

	for (var i = 0; i < json.length; i++){
		var module = json[i];
		var id = module.title_link;

		if (!(id in savedData)) {
			var title = "*New module available* : ";
			title += "<" + "https://intra.epitech.eu" + decodeHTMLEntities(module.title_link);
			title += "|" + decodeHTMLEntities(module.title) + ">";
			sendSlackMessage(title, null, null);
			updateSavedData(savedData, type, id);
		}
	}
}

function main() {
	var postBody = '{"login": "'+config.login+'", "password": "'+config.password+'"}';
	var options = {
		hostname: config.hostname,
		path: config.path,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
	  }
	};
	callback = function(res) {
		var response = '';
		res.setEncoding('utf8');
		res.on('data', function (body) {
			response += body;
		});
	 	res.on('end', function () {
			var json = JSON.parse(response);
			messageNotifier(json.history, "history");
			moduleNotifier(json.board.modules, "modules");
		});
	};
	var req = https.request(options, callback);
	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	});
	// write data to request body
	req.write(postBody);
	req.end();
}

main();
