/*
* Copyright 2016 CareerBuilder, LLC
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and limitations under the License.
*/
var app = angular.module('DeadBolt', ['ngRoute', 'ngCookies', 'toastr']);

app.config(['$routeProvider', '$httpProvider', function($routeProvider) {
	$routeProvider.when('/', {
		controller: 'AuthCtrl',
		templateUrl: 'views/welcome.html'
	})
	.when('/reset/:resetid', {
		controller: 'ResetCtrl',
		templateUrl: 'views/reset.html',
		resolve:{
			ResetID: ["$route", function($route){return $route.current.params.resetid;}]
		}
	})
	.when('/history', {
		controller: 'HistoryCtrl',
		templateUrl: 'views/history.html',
		resolve:{
			auth: ["authService", function(authService) {return authService.hasAccess();}]
		}
	})
	.when('/groups', {
		controller: 'GroupCtrl',
		templateUrl: 'views/groups.html',
		resolve:{
			auth: ["authService", function(authService) {return authService.hasAdminAccess();}]
		}
	})
	.when('/databases', {
		controller: 'DBCtrl',
		templateUrl: 'views/databases.html',
		resolve:{
			auth: ["authService", function(authService) {return authService.hasAdminAccess();}]
		}
	})
  .when('/users', {
		controller: 'UserCtrl',
		templateUrl: 'views/users.html',
		resolve:{
			auth: ["authService", function(authService) {return authService.hasAccess();}]
		}
	})
	.when('/errors', {
		controller: 'ErrorCtrl',
		templateUrl: 'views/errors.html',
		resolve:{
			auth: ["authService", function(authService) {return authService.hasAccess();}]
		}
	})
	.otherwise({
		templateUrl: 'views/404.html'
	});
}]);

app.controller('PageController', function($http, $scope, $location, authService, tabService, toastr){

	$scope.setTab = function(num){
		tabService.setTab(num);
	};

	$scope.getTab = function(){
		return tabService.getTab();
	};

	$scope.logOut = function(){
		authService.logOut();
		$location.path('/');
	};

	$scope.isLoggedIn = function(){
		return !!authService.getSession();
	};

	$scope.isAdmin = function(){
		return !!authService.isAdmin();
	};

	$scope.isFullAdmin=function(){
		return !!authService.isFullAdmin();
	};

});

app.directive("compareTo", function() {
  return {
      require: "ngModel",
      scope: {
          otherModelValue: "=compareTo"
      },
      link: function(scope, element, attributes, ctrl) {
          ctrl.$validators.compareTo = function(modelValue) {
              return modelValue === scope.otherModelValue;
          };
          scope.$watch("otherModelValue", function() {
                ctrl.$validate();
            });
      }
  };
});

app.run(["$rootScope", "$location", "toastr", "tabService", function($rootScope, $location, toastr, tabService) {
  $rootScope.$on("$routeChangeError", function(event, current, previous, eventObj) {
    if (eventObj.authenticated === false) {
      toastr.error('Please Log in First');
			tabService.setTab(-1);
      $location.path("/");
    }
		else if (eventObj.AdminAuth === false) {
			toastr.error('Unauthorized to view this page');
			tabService.setTab(-1);
			$location.path("/");
		}
  });
}]);
