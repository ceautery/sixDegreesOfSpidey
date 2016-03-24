const base = 'http://gateway.marvel.com/v1/public/';

var crypto  = require('crypto'),
	request = require('request'),
	express = require('express'),
	app = express(),
	bodyParser = require('body-parser'),
	path = require('path'),
    sqlite3 = require('sqlite3'),
    db = new sqlite3.Database(path.join(__dirname, 'data', 'spidey.db')),
    spideyCharNum = 1009610,
    hops = [],
	u = new Uniq(),
	allStop = false; // Calls per day limit exceeded, stop all requests until node app is restarted

app.use(express.static('static'));
app.use(bodyParser.json());

app.post('/characters', function(req, res) {
	db.all('select * from characters', function(err, rows) {
		if (err) {
			res.status(500).send('Error retrieving characters');
			return;
		}

		res.json(rows);
	})
});

app.post('/find', function (req, res) {
	// Make sure the request included a character field, and that it was a number
	if (!req.body.character) {
		res.status(400).send('Missing character field');
		return;
	}

	if (isNaN(req.body.character)) {
		res.status(400).send('The character field must be numeric');
	}

	// Cast strings/floats to integers
	var character = +req.body.character | 0;

	// Check that the given character number exists in the database (it should if the request came from our UI)
	db.get('select name from characters where id = ?', character, function(err, row) {
		if (err) {
			res.status(500).send('Error finding requested character');
			console.error(err);
			return;
		}

		if (row) {
			console.log('Found ' + row.name);
			find(character, res);
		}
		else res.status(400).send('Character not found');
	});
});

hops = [];
findHops(spideyCharNum, spideyCharNum, startListener);

function startListener() {
	app.listen(3000, function () {
	  console.log('Connect to http://localhost:3000 to begin');
	});
}

function findHops(include, filter, cbk) {
	var ndx = hops.length;
	if (ndx == 5) {
		console.log(hops);
		console.log(hops.reduce(function(a, b) { return a + b.length }, 0));
		cbk();
		return;
	}

	var sql = 'select p1.character, p1.comic, p2.character as link from pairings p1 inner join pairings p2 on (p1.comic = p2.comic) where link in ('
	+ include + ') and not p1.character in (' + filter + ') group by p1.character';
	db.all(sql, function(err, rows) {
		if (err) {
			console.error('Error building character tree on iteration ' + (ndx + 1));
			console.error(err);
			return;
		}

		hops[ndx] = rows;
		include = rows.map(function(r) { return r.character}).join(',');
		filter = filter + ',' + include;
		findHops(include, filter, cbk)
	})
}

function find(character, res) {
	var ndx = 0;
	while (ndx < 5) {
		var obj = hops[ndx].filter(function(r) { return r.character == character });
		if (obj.length) {
			obj = obj.slice(0, 1);
			var prev = obj[0];
			while (ndx-- > 0) {
				var pairing = hops[ndx].filter(function(r) { return r.character == prev.link })[0];
				obj.push(pairing);
				prev = pairing;
			}
			addDetails(obj, res);
			return;
		}
		ndx++;
	}

	// Character not found locally, go query Marvel
}

function addDetails(obj, res) {
	console.log(obj);

	obj.remaining = obj.length * 2;
	obj.forEach(function(pair) {
		getCharacter(obj, pair, res);
		getComic(obj, pair, res);
	})
}

function getCharacter(obj, pair, res) {
	db.get('select * from characters where id = ? limit 1', pair.character, function(err, row) {
		if (row) {
			pair.character = row;
			obj.remaining--;
			sendWhenComplete(obj, res);
		}
	})
}

function getComic(obj, pair, res) {
	db.get('select * from comics where id = ? limit 1', pair.comic, function(err, row) {
		if (row) {
			pair.comic = row;
			done();
		} else {
			fetchSingleComic(pair, res, done);
		}
	});

	function done() {
		obj.remaining--;
		sendWhenComplete(obj, res);
	}
}

function sendWhenComplete(obj, res) {
	if (obj.remaining) return;
	delete obj.remaining;
	res.json(obj);
}

function Uniq() {
	const pubkey = '55b5b7cac2308046368276d64e4f048f';
	const privkey = '6fcb600660948aaf5e47fa2f7425fae3abf07d30';

	var last = 0, count = 0;
	this.get = function(offset, limit) {		
		var ts = +Date.now() + '';
		if (ts == last) ts += '_' + (++count);
		else {
			last = ts;
			count = 0;
		}
		var hash = crypto.createHash('md5').update(ts + privkey + pubkey).digest('hex');
		return {
			apikey: pubkey,
			ts: ts,
			hash: hash,
			offset: offset || 0,
			limit: limit || 100
		}
	}
}


function askMarvel(character, res, offset, callback){
	console.log([character, offset]);
	var qs = u.get(offset, 100);

	qs.format = 'comic';
	qs.formatType = 'comic';
	qs.noVariants = true;
	if (!all) qs.limit = 1;
	if (!allStop && !stop) request({
		url: base + 'characters/' + character + '/comics',
		json: true,
		qs: qs
	}, function(err, resp) {
		if (!err && resp && resp.body && resp.body.data) {
			var comics = resp.body.data.results || [];
			comics.forEach(function(comic) {
				var c = {
					id: comic.id,
					title: comic.title
				};
				if (comic.images && comic.images.length) {
					c.img_path  = comic.images[0].path;
					c.extension = comic.images[0].extension;
				} // todo: else fetch the first URL returned, and search for img.frame-img
				out.push(c);
			});
			if (all && offset == null && resp.body.data.total) {
				var count = +resp.body.data.total;
				console.error("Trying for " + count + " comics");
				offset = 100;
				res.remaining = (count / offset | 0) - 1;
				while (offset < count) {
					askMarvel(character, res, offset, callback);
					offset += 100;
				}
			}
			if (res.remaining) res.remaining--;
			if (!res.remaining) {
				insert(out);
				callback(out, res);
			}
		} else {
			// todo: check to see if error is due to exceeding 3000 reqs per day
			stop = true;
			res.status(500).send(resp);
		}
	});
}

function fetchSingleComic(pair, res, cbk) {
	if (allStop) return;
	var id = pair.comic;

	console.log('Fetching comic ' + id);
	request({
		url: base + 'comics/' + id,
		json: true,
		qs: u.get(0, 100)
	}, function(err, resp){
		if (err) {
			checkError(err, res);
			console.error('Error fetching comic ' + id);
			console.error(err);
			res.status(500).send('Error while fetching comic info from Marvel');
			return;
		}

		var comic = resp.body.data.results[0];
		pair.comic = {
			id: comic.id,
			title: comic.title,
			img_path: comic.thumbnail.path,
			extension: comic.thumbnail.extension
		};

		db.run('insert or replace into comics values(?, ?, ?, ?)'
			, pair.comic.id, pair.comic.title, pair.comic.img_path, pair.comic.extension, cbk)
	})
}

function checkError(err) {
	/*
	 *   HTTP 429 means we are over our 3000 calls/rolling day limit. API calls will continue to accrue against the limit,
	 *   but will return errors. Given that, it's important to stop making any API further API calls. checkError should be
	 *   called after every API call, and the allStop flag should be checked prior to any call.
	 */
	if (err == 429) {
		allStop = true;
	}
}