intra-slack
===========
PHP script allowing to send Epitech intranet's messages to Slack.

## Features
- Retrieves messages from Epitech's intranet
- Send the title of any new messages to a configured Slack hook
- Replace potential HTML link by a Slack compliant version

## Installation
- Simply clone this depot anywhere on your server.
- Copy [config.json.exemple](https://github.com/BernardJeremy/intra-slack/blob/master/config.json.exemple) file into a `config.json` file.
- Add your intranet login/password to the `config.json` file.
- Install a [incoming-webhooks](https://api.slack.com/incoming-webhooks) on your Slack.
- Add your link of the Slack incoming-webhooks in the `config.json` file.
- Optional (but recommended) : Install a task scheduler (like `CRON`) to run the script regularly.

## Configuration
- `login` : Your intranet login.
- `password` : Your intranet password.
- `message_url` : Link to the intranet API to retrieve all messages.
- `slack_hook_url` :  Link to your Slack incoming-webhooks.
