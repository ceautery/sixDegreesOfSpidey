var path = require('path'),
    sqlite3 = require('sqlite3'),
    fs = require('fs'),
    db = new sqlite3.Database(path.join(__dirname, 'data', 'spidey.db')),
    initDB = fs.readFileSync('initDB.sql', 'utf8'),
    chars = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'usable_characters.json'), 'utf8')),
    pairings = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'pairings.json'), 'utf8'));

console.log('Initializing DB, this may take a minute.');
db.exec(initDB, function(err) { if (err) console.log(err)});

var stmt = db.prepare('INSERT INTO characters VALUES (?, ?, ?, ?)');
chars.forEach(function(char) {
    stmt.run(char.id, char.name, char.img_path, char.extension)
});
stmt.finalize();

insertComicsForCharacter(1009610, 'spidey_comics.json');
insertComicsForCharacter(1009368, 'ironman_comics.json');
insertComicsForCharacter(1009718, 'wolverine_comics.json');

stmt = db.prepare('INSERT INTO pairings VALUES (?, ?)');
pairings.forEach(function(pair) {
    stmt.run(pair[0], pair[1]);
});
stmt.finalize();

function insertComicsForCharacter(charID, fileName) {
    var normalized = path.join(__dirname, 'data', fileName),
        comics = JSON.parse(fs.readFileSync(normalized, 'utf8'));

    stmt = db.prepare('INSERT OR REPLACE INTO comics VALUES (?, ?, ?, ?)');
    comics.forEach(function(comic) {
        stmt.run(comic.id, comic.title, comic.img_path, comic.extension)
    });
    stmt.finalize();
    
    stmt = db.prepare('INSERT OR REPLACE INTO pairings VALUES (?, ?)');
    comics.forEach(function(comic) {
        stmt.run(charID, comic.id);
    });
    stmt.finalize();
}
