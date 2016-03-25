angular.module('spidey', []).service('Service', function($http, $rootScope) {
	var characters = [], path = [];
	$http.post('/characters', {}).success(function(data) {
		characters = data;
		$rootScope.$broadcast('charactersReceived');
	});

	return {
		getCharacters: function() { return characters },
		getPath: function() { return path },
		find: function(id) {
			$http.post('/find', {character: id}).then(function(ret) {
				path = ret.data;
				path.forEach(function(p, ndx) {
					if (p.character.extension) {
						p.character.img = p.character.img_path + '/portrait_incredible.' + p.character.extension;
					} else {
						p.character.img = 'http://i.annihil.us/u/prod/marvel/i/mg/b/40/image_not_available/portrait_incredible.jpg'
					}
					if (p.comic.extension) {
						p.comic.img = p.comic.img_path + '/portrait_incredible.' + p.comic.extension;
					} else {
						p.comic.img = 'http://i.annihil.us/u/prod/marvel/i/mg/b/40/image_not_available/portrait_incredible.jpg'
					}
					if (ndx < path.length - 1) p.link = path[ndx + 1].character;
				});

				$rootScope.$broadcast('pathReceived');
			}, function(err) {
				console.log(err);
				alert('There was a problem receiving character/comic information.');
			});
		}
	}
}).controller('Controller', function($scope, Service) {
	function getChars() {
		$scope.characters = Service.getCharacters();

		var s = $scope.characters.filter(function(c) {
			return c.name == 'Spider-Man'
		});

		if(s.length) {
			$scope.spidey = s[0];
			$scope.spidey.img = $scope.spidey.img_path + '/portrait_incredible.' + $scope.spidey.extension
		}
	}

	getChars();
	$scope.$on('charactersReceived', getChars);

	$scope.find = function(id, ndx) {
		$scope.selected = $scope.characters[ndx];
		if ($scope.selected.id != $scope.spidey.id) {
			Service.find(id)
		} else {
			$scope.path = null;
		}
	};

	function getPath() {
		$scope.path = Service.getPath()
	}

	$scope.$on('pathReceived', getPath);

});
