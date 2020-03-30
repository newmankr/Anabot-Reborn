/* eslint-disable require-atomic-updates */

/* eslint-disable no-mixed-spaces-and-tabs */
const express     = require('express');
const fetch       = require('node-fetch');
const cheerio     = require('cheerio');
const MongoClient = require('mongodb').MongoClient;
const app         = express();
const api_url     = 'https://api.telegram.org/bot' + process.env.BOT_TOKEN;
const db_uri      = process.env.DB_URI;

app.get('/', (req, res) => { res.send('Hello World!') });

app.use(express.json());

let cachedDB = null;

// TODO: This can probably be refactored
const connectToDB = async () => {
	if (cachedDB) return cachedDB;

	const client = await MongoClient.connect(db_uri, { useNewUrlParser : true });

	const db = await client.db(process.env.DB_NAME);

	cachedDB = db;

	return db;
};

const owofy = (str) => {
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

const mockfy = (str) => {
	let result = '';

	for (let i in str)
		if (i % 2 == 0)
			result += str[i].toUpperCase();
		else
			result += str[i].toLowerCase();
	;

	return result;
};

const kym = async (meme) => {
	meme = meme.replace(' ', '+');

	let res           = await fetch(`https://knowyourmeme.com/search?q=${meme}`);
	let             $ = cheerio.load(await res.text());
	const router      = $('.entry_list a').first().attr('href');

	res            = await fetch(`https://knowyourmeme.com${router}`);
	$              = cheerio.load(await res.text());
	let definition = $('.bodycopy p').first().text();

	if (definition != 'About')
		return definition;
	else
		return $('.bodycopy p').next().text();
};

const ud = async (query) => {
	query = query.replace(' ', '+');

	let     res =
	  await fetch(`https://www.urbandictionary.com/define.php?term=${query}`);
	let     $        = cheerio.load(await res.text());
	const word       = $('.word').first().text();
	const definition = $('.meaning').first().text();
	const example    = $('.example').first().text();

	return { word, definition, example };
};

// Send message to a given ID
const sendMessage = async (id, data, parse) => {
	return await fetch(api_url + '/sendMessage', {
		       method : 'POST',
		       headers : { 'Content-Type' : 'application/json' },
		       body : JSON.stringify({
			       chat_id : id,
			       text : data,
			       parse_mode : (parse) ? 'Markdown' : ''
		       })
	       })
	  .then(res => res.json());
};

const sendMessageReply = async (id, data, reply_to, parse) => {
	return await fetch(api_url + '/sendMessage', {
		       method : 'POST',
		       headers : { 'Content-Type' : 'application/json' },
		       body : JSON.stringify({
			       chat_id : id,
			       text : data,
			       reply_to_message_id : reply_to,
			       parse_mode : (parse) ? 'Markdown' : ''
		       })
	       })
	  .then(res => res.json());
};

const parseVariables = (command, message, from, date, reply) => {
	const options = {
		weekday : 'long',
		year : 'numeric',
		month : 'long',
		day : 'numeric',
		hour : '2-digit',
		minute : '2-digit',
		timeZone : 'America/Sao_Paulo',
		hour12 : false
	};

	date = (new Date(date * 1000)).toLocaleString('en-GB', options);

	let { answer } = command;
	answer         = answer.replace(/%{from\.username}/g, from.username);
	answer         = answer.replace(/%{from\.first_name}/g, from.first_name);
	answer         = answer.replace(/%{from\.last_name}/g, from.last_name);
	answer         = answer.replace(/%{count}/g, parseInt(command.count) + 1);
	answer         = answer.replace(/%{text}/g, message);
	answer         = answer.replace(/%{date}/g, date);

	if (reply) {
		reply.date = (new Date(reply.date * 1000)).toLocaleString('en-GB', options);
		answer     = answer.replace(/%{reply\.username}/g, reply.username);
		answer     = answer.replace(/%{reply\.first_name}/g, reply.first_name);
		answer     = answer.replace(/%{reply\.last_name}/g, reply.last_name);
		answer     = answer.replace(/%{reply\.text}/g, reply.text);
		answer     = answer.replace(/%{reply\.date}/g, reply.date);
	}

	command.answer = answer;
	return command;
};

const random = (min, max) => {
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

	let parse                              = true;
	let { text }                           = message;
	const { chat, from, date }             = message;
	const { reply_to_message, message_id } = message;
	const reply = (reply_to_message) ? reply_to_message.from : undefined;
	if (reply) reply.text = reply_to_message.text;
	if (reply) reply.date = reply_to_message.date;
	let reply_to = (reply_to_message) ? reply_to_message.message_id : message_id;

	if (message.dice && message.dice.value && message.dice.value == 1) {
		await sendMessageReply(parseInt(chat.id), 'Noob', parseInt(message_id));
		res.status(200).send('Ok');
		return;
	}

	if (!text) {
		res.status(200).send('Ok');
		return;
	}

	if (text == '/') {
		await sendMessage(parseInt(chat.id), 'Main Menu');
		res.status(200).send('Ok');
		return;
	}

	// not bug serv
	if (!text.match('^\/[a-z]')) {
		res.status(200).send('Ok');
		return;
	}

	if (text.startsWith('s/') && reply_to_message) {
		const commands = text.split(';');
		reply.text     = reply.text.replace(/You mean:\n/g, '');
		let answer     = reply.text;
		commands.forEach(command => {
			const splitted = command.split('/');
			if (!splitted[3]) splitted.push('');
			splitted[3] = splitted[3].replace(/[^gimsuy]/g, '');
			try {
				const rx = new RegExp(splitted[1], splitted[3]);
				answer   = answer.replace(rx, splitted[2]);
			} catch (e) { console.log(e); }
		});
		answer   = '*You mean:*\n' + answer;
		reply_to = reply_to_message.message_id;
		await sendMessageReply(parseInt(chat.id), answer, parseInt(reply_to));
		res.status(200).send('Ok');
		return;
	}

	const db       = await       connectToDB();
	const admins   = await   db.collection('admins');
	const quotes   = await   db.collection('quotes');
	const commands = await db.collection('commands');

	if (text.match('^\/[a-z]')) {
		// it's command
		const command = text.match(/(\/\w+)(@\w+)?/)[1].substring(1);
		text          = text.replace(/\/\w+(@\w+)?(\s+)?/, '');
		const adm     = await admins.findOne({ 'id' : from.id });

		let answer;

		switch (command) {
			case 'owofy': answer = owofy(text); break;
			case 'mockfy': answer = mockfy(text); break;
			case 'kym': {
				try {
					answer = await kym(text);
				} catch (e) { answer = 'No meme found.' }
				break;
			}
			case 'ud': {
				answer = await ud(text);

				if (answer.word !== '')
					answer = `${answer.word} definition: ${
						answer.definition}\n\nExample: ${answer.example}`;
				else
					answer = 'No definition found';
				break;
			}
			case 'roll': {
				reply_to     = message_id;
				const matchs = text.match(/(\d+)d(\d+)([+|-]\d+)?/);
				if (!matchs) break;
				let rolls = [];
				if (matchs[1] && matchs[2]) {
					for (let i = 0; i < matchs[1]; ++i)
						rolls.push(random(1, parseInt(matchs[2]) + 1));
					let total = rolls.reduce((a, b) => a + b, 0);
					if (matchs[3]) total = eval(total + matchs[3]);
					answer = '[' + rolls + '] = ' + total;
				} else {
					answer = 'Wrong usage of the command ( .-.)';
				}
				break;
			}
			case 'calc': {
				const sanitized = text.replace(/[^-()\d/*+.]/g, '');
				try {
					answer = eval(sanitized);
				} catch (error) { answer = 'Something is wrong ( -_-)'; }
				reply_to = message_id;
				break;
			}
			case 'random': {
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
			}
			case 'addquote': {
				const i = parseInt(await quotes.countDocuments()) + 1;

				await quotes.insert(
				  { 'id' : i, 'quote' : (reply) ? reply.text : text, 'count' : 0 });
				answer = 'New quote add (@' + i + ') ( >.<)';
				break;
			}
			case 'editquote': {
				const id            = text.split(' ')[0];
				const updated_quote = text.substring(id.length + 1);
				await quotes.updateOne({ 'id' : parseInt(id) },
				                       { $set : { 'quote' : updated_quote } });
				answer = 'Quote (@' + id + ') updated ( ^.^)';
				break;
			}
			case 'quote': {
				const quote = await quotes.findOne({ 'id' : parseInt(text) });
				answer = (quote) ? quote.quote : 'Couldn\'t found that quote ( _ _)';
				parse  = (quote) ? true : false;
				break;
			}
			case 'addcmd': {
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
			}
			case 'updatecmd': {
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
			}
			case 'removecmd': {
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
			}
			case 'debug': {
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
				parse  = false;
				answer = message;
				break;
			}
			case 'addadmin': {
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
				await admins.insert(
				  { 'id' : reply.id, 'username' : reply.username, 'level' : 0 });
				answer   = reply.username + ' added as admin ( ≧∇≦)';
				reply_to = message_id;
				break;
			}
			case 'setadminlvl': {
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
				await admins.updateOne({ 'id' : reply.id },
				                       { $set : { 'level' : parseInt(text) } });
				answer   = 'Admin level set ( ^.^)';
				reply_to = message_id;
				break;
			}
			case 'removeadmin': {
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
				await admins.deleteOne({ 'id' : reply.id });
				answer   = reply.username + ' removed from admins ( õ_ó)';
				reply_to = message_id;
				break;
			}
			default: {
				let cmd = await commands.findOne({ 'command' : command });

				// If the command doesn't exist on the DB just ignore it to
				// not conflict with other bots
				if (!cmd) {
					res.status(200).send('Ok');
					return;
				}

				cmd = parseVariables(cmd, text, from, date, reply);
				await commands.updateOne({ 'command' : command },
				                         { $set : { 'count' : cmd.count + 1 } });

				answer = cmd.answer;
				break;
			}
		}

		if (reply_to) {
			await sendMessageReply(parseInt(chat.id), answer, parseInt(reply_to),
			                       parse);
		} else {
			await sendMessage(parseInt(chat.id), answer, parse);
		}
		res.status(200).send('Ok');
		return;
	}

	// ignore
	res.status(200).send('Ok');
	return;
});

module.exports = app;
