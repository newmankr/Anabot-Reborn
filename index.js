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
async function connectToDB() {
	if (cachedDB) return cachedDB;

	const client = await MongoClient.connect(db_uri, { useNewUrlParser : true });

	const db = await client.db(url.parse(db_uri).pathname.substring(1));

	cachedDB = db;

	return db;
}

function owofy(str) {
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
}

// TODO: Make a function to reply a given message
// Send message to a given ID
async function sendMessage(id, data) {
	return await fetch(api_url + '/sendMessage', {
		       method : 'POST',
		       headers : { 'Content-Type' : 'application/json' },
		body : JSON.stringify({ chat_id : id, text : data })
	       })
	  .then(res => res.json());
}

// TODO: Change the route, cuz of security issues
app.post('/', async (req, res) => {
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

	let { text }         = message;
	const { chat, from } = message;

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
	const commands = await db.collection('commands');

	if (text.startsWith('/')) {
		// it's command
		const command = text.match(/(\/\w+)(@\w+)?/)[1].substring(1);
		text          = text.replace(/\/\w+(@\w+)?\s+/, '');
		let answer;

		switch (command) {
			case 'owofy': answer = owofy(text); break;
			case 'addcmd':
				const new_cmd    = text.split(' ')[0];
				const new_answer = text.substring(new_cmd.length + 1);
				commands.insert(
				  { 'command' : new_cmd, 'answer' : new_answer, 'count' : 0 });
				answer = 'Command ' + new_cmd + ' added ( ・ω・)';
				break;
			case 'updatecmd':
				const update_cmd    = text.split(' ')[0];
				const update_answer = text.substring(update_cmd.length + 1);
				await commands.updateOne({ 'command' : update_cmd },
				                         { $set : { 'answer' : update_answer } });
				answer = 'Command ' + update_cmd + ' updated ( ^w^)';
				break;
			case 'removecmd':
				await commands.deleteOne({ 'command' : text.split(' ')[0] });
				answer = 'Command ' + text.split(' ')[0] + ' removed! ( ._.) F';
				break;
			default:
				cmd = await commands.findOne({ 'command' : command });

				// If the command doesn't exist on the DB just ignore it to not conflict
				// with other bots
				if (!cmd) {
					res.status(200).send('Ok');
					return;
				}

				answer = cmd.answer;
				break;
		}

		await sendMessage(parseInt(chat.id), answer);
		res.status(200).send('Ok');
		return;
	}

	// ignore
	res.status(200).send('Ok');
	return;
});

module.exports = app;