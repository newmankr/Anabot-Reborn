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

	const { text, from } = message;

	const db = await connectToDB();

	const user = await getUser(db, from);

	// Quick answer just to test if everything is right
	await sendMessage(
	  parseInt(from.id),
	  { 'Name' : user.first_name, 'Text' : text, 'Username' : user.username });

	res.status(200).send('Ok');
});

module.exports = app;