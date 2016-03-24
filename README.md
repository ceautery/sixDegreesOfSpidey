Six Degrees of Spidey
=====================

For my code challenge, I decided to use the [Marvel Comics API](http://developer.marvel.com/) to build a Six Degrees of Kevin Bacon clone, replacing Kevin with Spider-Man, and movies with comic issues.


Installation
============

Assumedly the testers won't have the name of my GitHub repository, and will use the gzipped tarball. Starting in a directory empty except for the .tgz file. Assuming Linux/OSX.

Requirements:
- Node.js
- npm
- sqlite3 binary (possibly npm will take care of this, but its install script is hokey, and I don't trust it)

Shell commands:
```
tar zxvf spidey.tgz
npm install
ls node_modules
```
(Verify the subdirectories body-parser, express, mocha, request, and sqlite3 all exist)
```
npm test
npm start
```

The Server
==========

The spidey.js node script is responsible for managing the local cache of comics and characters, which for the sake of development speed I'm just throwing into a Sqlite database. If I were writing a true production version of this, I would follow the reccommendations by Marvel of only caching for one day, and making sure to use the variable attribution text returned by each call.

The script functions as an intermediary API to the Marvel API, which does not have the functionality to link chains of character -> comic -> character -> comic, etc.


The Client
==========

The client is a simple Bootstrap/Angular app that retrieves a list of characters from the server, displays their names in a dropdown, posts a "find" request to the server, which does the heavy lifting. When the find request returns, the app parses JSON to find comic titles, character names, and where their image files are hosted, and displays the chain linking a character to Spider-Man.

After starting the node script, just connect to http://localhost:3000/ to begin.


Project aftermath: Pain points and choices
==========================================

This challenge contained close to a critical mass of hurdles to make it not worth the trouble, and I briefly contemplated shelving it and building a project against a different public API. I continued on, both because I was fond of the idea, and because struggling through anomalies seems to be a core value at Mutually Human, and my success in the project and my possible success in the company could very well be correlated. So I soldiered on. Here are a few of the problems I ran into, and how I mitigated them. 

- 3000, 100

One's credentials are limited to 3000 API calls per (rolling) day, with the excess calls returning an HTTP error, but still accruing against your count. Marvel recommends caching results for a day, but it's conceivable that getting a complete list of all the possible 6-degree matches would take more than 3000 calls due to the maximum results returned per call being 100. For instance, there are 1485 characters in the database, and Spider-Man is listed as being in 2610 issues of various titles. Querying all of those titles, plus the 15 queries to find all the character names, would already put me close to the daily limit.

I addressed this possibility by relying on an offline list of characters, and a complete list of comics that a pair of key crossover characters (Iron Man and Wolverine) have appeared in. This alone is enough to infer Spidey numbers for 4/5ths of the usable characters.

- Usable characters, usable comics

What makes a character usable is having it appear in comics in the database. Roughly a third of the listed characters return 0 comics as the number they've been in. This accounts for character aliases, e.g., "Charles Xavier" is listed as a character, but all of his comic appearances are under "Professor X", and the same is true with Logan vs. Wolverine.

What makes a comic useful is having more than one character appearing in it. Searching for some characters, Spider-Man included, returns comics that contain only one character. This may account for early issues, where a hero stops some bank robberies by one-dimensional villains that don't repeat. Another similar oddity are comics with vague ownership, such as the Eclipse comic Miracleman. There is at least one Neil Gaiman issue of that in the Marvel API showing 0 characters, e.g., the comic is in the API, but the character is not.

These combine to make certain types of searches more expensive, and the most attractice search being /characters/{id}/comics, which returns a list of comics where a given character appears. The converse, /comics/{id}/characters, is more limited in utility, and likely to give you no usable information. Since there are tens of thousands of comic issues in the database, we should avoid querying them one at a time.

- Marvel bugs

Marvel has corruption in its database. Querying characters in blocks of 100 netted me three searches that returned HTTP 500 errors, at offsets 500, 1000, and 1400. I used the "wild guess" variant of a binary search to find the exact records that were causing the problem, and eventually narrowed it down to rows 539, 1034, and 1416, which I reported to Marvel with their feedback tool. At the time of this writing, that hasn't been corrected yet, and I'm uncertain who the missing characters are (perhaps one is Miracleman from above).

Another bug I stumbled on during testing was in the various ways one is allowed to query for shared appearances between two characters. There are three, but only a naked search for /comics and passing in a comma-delimited list of character names in the sharedAppearances field works. The other methods silently ignore additional characters, and only return comics where the first character appears. I also reported these findings to Marvel, but at the time of this writing there hasn't been a reply, and the bugs and corruption are still present.

- Missing data

Someone is entering all this data by hand, and it is a Hurculean job that is not yet completed. For example, searching for Spider-Man/Punisher crossovers should return the 1975 "Giant-Size Spider-Man Vol1 #4" comic, listed on the [Marvel Wikia site](http://marvel.wikia.com/wiki/Giant-Size_Spider-Man_Vol_1_4), but none of the Giant-Size Spider-Man issues are in the API database yet. This implies there are likely smaller Spidey numbers for some characters than this app will find, and possibly some extant connections the app will miss entirely.

- Groups

In the Marvel API, some issues list a group name as a character, but none of the individuals, e.g., X-Men and Sinister Six. Undoubtedly, more characters have interacted with the X-Men, than with any of its individual characters, especially considering Marvel's habit of rotating group rosters. This will make some Spidey numbers unfairly small, and others larger if, say, Angel appeared solo in a comic with the candidate character, but wasn't listed individually in one of the X-Men comics.

I went back and forth on this issue, and decided to leave group matches in, and for now worry less about perfect accuracy and fairness, and more on getting a functional project.

- Collections

Graphic novels can comprise multiple issues in a single story arc, and "the best of {char}, 1970 - 1990! " would contain many unrelated stories under one title. Either of these would give some characters smaller Spidey numbers because of the sheer number of people a graphic novel can contain. I found one hardback listed in the API that contained 68 characters, which, like groups, would return unfairly small Spidey numbers for certain characters.

The spirit of this exercise is to match up characters by single issue comics, and fortunately my primary /characters/{id}/comics search provides a filter to only return single-issue comics, so I used that option in my initial searches.


