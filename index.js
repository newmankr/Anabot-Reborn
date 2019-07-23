const express     = require('express');
const url         = require('url');
const fetch       = require('node-fetch');
const MongoClient = require('mongodb').MongoClient;
const app         = express();
const api_url     = 'https://api.telegram.org/bot' + process.env.BOT_TOKEN;
const db_uri      = process.env.DB_URI;

app.get('/', (req, res) => { res.send('Hello World!') });

app.use(express.json());

let cachedDB = null;

// TODO: This can probably be refactored
connectToDB = async () => {
	if (cachedDB) return cachedDB;

	const client = await MongoClient.connect(db_uri, { useNewUrlParser : true });

	const db = await client.db(process.env.DB_NAME);

	cachedDB = db;

	return db;
};

owofy = (str) => {
	str = str.replace(/OVE/g, 'UV');
	str = str.replace(/O/g, 'OwO');
	str = str.replace(/Y/g, 'WY');
	str = str.replace(/N/g, 'NY');
	str = str.replace(/L/g, 'W');
	str = str.replace(/R/g, 'W');

	str = str.replace(/ove/g, 'uv');
	str = str.replace(/o/g, 'OwO');
	str = str.replace(/y/g, 'wy');
	str = str.replace(/n/g, 'ny');
	str = str.replace(/l/g, 'w');
	str = str.replace(/r/g, 'w');

	return str;
};

// Send message to a given ID
sendMessage = async (id, data) => {
	return await fetch(api_url + '/sendMessage', {
		       method : 'POST',
		       headers : { 'Content-Type' : 'application/json' },
		body : JSON.stringify({ chat_id : id, text : data })
	       })
	  .then(res => res.json());
};

sendMessage = async (id, data, reply_to) => {
	return await fetch(api_url + '/sendMessage', {
		       method : 'POST',
		       headers : { 'Content-Type' : 'application/json' },
		body : JSON.stringify(
		  { chat_id : id, text : data, reply_to_message_id : reply_to })
	       })
	  .then(res => res.json());
};

parseVariables = (command, message, from, to) => {
	let { answer } = command;
	answer         = answer.replace(/%{from\.username}/g, from.username);
	answer         = answer.replace(/%{from\.first_name}/g, from.first_name);
	answer         = answer.replace(/%{count}/g, command.count);
	answer         = answer.replace(/%{text}/g, message);

	if (to) {
		answer = answer.replace(/%{to\.username}/g, to.username);
		answer = answer.replace(/%{to\.first_name}/g, to.first_name);
	}

	command.answer = answer;
	return command;
};

random = (min, max) => {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
};

app.post('/' + process.env.ROUTE, async (req, res) => {
	if (!req.body) {
		res.status(200).send('Ok');
		return;
	}

	const { message } = req.body;

	console.log(message);

	if (!message) {
		res.status(200).send('Ok');
		return;
	}

	let { text }                           = message;
	const { chat, from }                   = message;
	const { reply_to_message, message_id } = message;
	const reply_from = (reply_to_message) ? reply_to_message.from : undefined;
	let reply_to     = undefined;

	if (!text) {
		res.status(200).send('Ok');
		return;
	}

	if (text == '/') {
		await sendMessage(parseInt(chat.id), 'Main Menu');
		res.status(200).send('Ok');
		return;
	}

	if (text.startsWith('/debug') && from.username == 'Anaboth') {
		await sendMessage(parseInt(chat.id), message);
		res.status(200).send('Ok');
		return;
	}

	const db       = await       connectToDB();
	const admins   = await   db.collection('admins');
	const commands = await db.collection('commands');

	if (text.startsWith('/')) {
		// it's command
		const command = text.match(/(\/\w+)(@\w+)?/)[1].substring(1);
		text          = text.replace(/\/\w+(@\w+)?(\s+)?/, '');
		const adm     = await admins.findOne({ 'id' : from.id });

		let answer;

		switch (command) {
			case 'owofy': answer = owofy(text); break;
			case 'calc':
				const sanitized = text.replace(/[^-()\d/*+.]/g, '');
				try {
					answer = eval(sanitized);
				} catch (error) { answer = 'Something is wrong ( -_-)'; }
				reply_to = message_id;
				break;
			case 'random':
				if (text == '') {
					answer   = random(0, 10);
					reply_to = message_id;
					break;
				}
				const splited = text.split(' ');
				if (!splited[1])
					answer = random(0, splited[0]);
				else
					answer = random(splited[0], splited[1]);
				reply_to = message_id;
				break;
			case 'addcmd':
				if (!adm) {
					answer   = 'Only for admins ( ò_ó)';
					reply_to = message_id;
					break;
				}
				if (adm.level < 0) {
					answer = 'Your admin level don\'t have permission to do that ( O_o)';
					reply_to = message_id;
					break;
				}
				const new_cmd    = text.split(' ')[0];
				const new_answer = text.substring(new_cmd.length + 1);
				commands.insert(
				  { 'command' : new_cmd, 'answer' : new_answer, 'count' : 0 });
				answer   = 'Command ' + new_cmd + ' added ( ・ω・)';
				reply_to = message_id;
				break;
			case 'updatecmd':
				if (!adm) {
					answer   = 'Only for admins ( ò_ó)';
					reply_to = message_id;
					break;
				}
				if (adm.level < 0) {
					answer = 'Your admin level don\'t have permission to do that ( O_o)';
					reply_to = message_id;
					break;
				}
				const update_cmd    = text.split(' ')[0];
				const update_answer = text.substring(update_cmd.length + 1);
				await commands.updateOne({ 'command' : update_cmd },
				                         { $set : { 'answer' : update_answer } });
				answer   = 'Command ' + update_cmd + ' updated ( ^w^)';
				reply_to = message_id;
				break;
			case 'removecmd':
				if (!adm) {
					answer   = 'Only for admins ( ò_ó)';
					reply_to = message_id;
					break;
				}
				if (adm.level < 0) {
					answer = 'Your admin level don\'t have permission to do that ( O_o)';
					reply_to = message_id;
					break;
				}
				await commands.deleteOne({ 'command' : text.split(' ')[0] });
				answer   = 'Command ' + text.split(' ')[0] + ' removed! ( ._.) F';
				reply_to = message_id;
				break;
			case 'addadmin':
				if (!adm) {
					answer   = 'Only for admins ( ò_ó)';
					reply_to = message_id;
					break;
				}
				if (adm.level < 4) {
					answer = 'Your admin level don\'t have permission to do that ( O_o)';
					reply_to = message_id;
					break;
				}
				await admins.insert({
					'id' : reply_from.id,
					'username' : reply_from.username,
					'level' : 0
				});
				answer   = reply_from.username + ' added as admin ( ≧∇≦)';
				reply_to = message_id;
				break;
			case 'setadminlvl':
				if (!adm) {
					answer   = 'Only for admins ( ò_ó)';
					reply_to = message_id;
					break;
				}
				if (adm.level < 4) {
					answer = 'Your admin level don\'t have permission to do that ( O_o)';
					reply_to = message_id;
					break;
				}
				const new_lvl = parseInt(text);
				if (adm.level <= new_lvl) {
					answer =
					  'You cannot set a level higher or equals to yours for another Admin ( ¬_¬")';
					break;
				}
				await admins.updateOne({ 'id' : reply_from.id },
				                       { $set : { 'level' : parseInt(text) } });
				answer   = 'Admin level set ( ^.^)';
				reply_to = message_id;
				break;
			case 'removeadmin':
				if (!adm) {
					answer   = 'Only for admins ( ò_ó)';
					reply_to = message_id;
					break;
				}
				if (adm.level < 4) {
					answer = 'Your admin level don\'t have permission to do that ( O_o)';
					reply_to = message_id;
					break;
				}
				await admins.deleteOne({ 'id' : reply_from.id });
				answer   = reply_from.username + ' removed from admins ( õ_ó)';
				reply_to = message_id;
				break;
			default:
				cmd = await commands.findOne({ 'command' : command });

				// If the command doesn't exist on the DB just ignore it to
				// not conflict with other bots
				if (!cmd) {
					res.status(200).send('Ok');
					return;
				}

				cmd = parseVariables(cmd, text, from, reply_from);
				await commands.updateOne({ 'command' : command },
				                         { $set : { 'count' : cmd.count + 1 } });

				answer = cmd.answer;
				break;
		}

		if (reply_to) {
			await sendMessage(parseInt(chat.id), answer, parseInt(reply_to));
		} else {
			await sendMessage(parseInt(chat.id), answer);
		}
		res.status(200).send('Ok');
		return;
	}

	// ignore
	res.status(200).send('Ok');
	return;
});

module.exports = app;