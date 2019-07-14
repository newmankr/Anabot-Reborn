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

	const db = await client.db(url.parse(db_uri).pathname.substr(1));

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

/*
 * This is just for test, when the first feature is implemented it won't need to
 * store any user
 */
async function getUser(db, from) {
	const collection = await db.collection('users');

	const user = await collection.find({ 'id' : from.id }).toArray();

	if (user.length > 0) {
		return user[0];
	} else {

		await collection.insert(from);

		res.status(200).send('Ok');

		return;
	}
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

	if (!message) {
		res.status(200).send('Ok');
		return;
	}

	let { text } = message;

	const { from } = message;
	const db       = await   connectToDB();
	const user     = await getUser(db, from);

	if (text.startsWith('/')) {
		// it's command
		if (text.startsWith('/owofy')) {
			text = text.replace(/\/owofy(@\w+\s)?/, '');
			text = owofy(text);
		} else {
			text = 'command not found, sowwy >///<'
		}
		await sendMessage(parseInt(from.id), text);
		res.status(200).send('Ok');
		return;
	}

	// ignore
	await sendMessage(parseInt(from.id), 'no');
	res.status(200).send('Ok');
	return;
});

module.exports = app;