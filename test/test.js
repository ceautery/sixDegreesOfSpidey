var assert = require('assert'),
	spidey = require('../spidey'),
	request = require('request'),
	expect = require('Chai').expect;


describe('Listener', function() {
	it('should start up', function(done) {
		this.timeout(10000);
		var g = setInterval(function() {
			if (spidey.state.started) {
				clearInterval(g);
				done();
			}
		})
	})
});

describe('API', function () {
	describe('POST /characters', function () {
		var obj;
		it('should return a JSON parsable list of characters', function (done) {
			request.post('http://localhost:3000/characters', function(err, res, body) {
				expect(res.statusCode).to.equal(200);
				obj = JSON.parse(body);
				done()
			})
		});

		it('should return more than 500 characters', function () {
			expect(obj.length).to.above(500)
		});

		it('should include Spider-Man', function() {
			expect(obj.filter(function(e) { return e.name == 'Spider-Man'}).length).to.equal(1);
		})
	});

	describe('POST /find', function() {
		it('should return a failure for a non-numeric character', function(done) {
			var options = {
				uri: 'http://localhost:3000/find',
				method: 'POST',
				json: {character: 'thisShouldFail'}
			};
			request.post(options, function(err, res, body) {
				expect(res.statusCode).to.equal(400);
				expect(body).to.equal('The character field must be numeric');
				done()
			})
		});

		it('should return a Spidey number of 2 for Absorbing Man', function(done) {
			var options = {
				uri: 'http://localhost:3000/find',
				method: 'POST',
				json: {character: 1009148}
			};
			request.post(options, function(err, res, path) {
				expect(res.statusCode).to.equal(200);
				expect(path.length).to.equal(2);
				expect(path[1].link).to.equal(1009610);
				done()
			})
		})
	})
});
