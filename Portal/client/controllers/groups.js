'use strict';

app.controller('GroupCtrl', function($http, $scope, $cookies, $cookieStore, $location, toastr){
  $scope.searchResults = [];
  $scope.group = {};
  $scope.databases = [];
  $scope.$emit('tabChanged', 2);

  $http.post('https://deadbolt.cbsitedb.net/api/groups/search/', {Info:''}).success(function(data){
    if(data.Success){
      $scope.isEditing = false;
      $scope.isSearching = true;
      $scope.searchResults = data.Results;
    }
  });

  $http.get('https://deadbolt.cbsitedb.net/api/databases').success(function(data){
    if(data.Success){
      for(var i=0; i<data.Results.length; i++){
        data.Results[i].Checked = false;
        $scope.databases = data.Results;
      }
    }
  });

  $scope.search=function(){
    $http.post('https://deadbolt.cbsitedb.net/api/groups/search/', $scope.searchCreds).success(function(data){
      if(data.Success){
        $scope.isEditing = false;
        $scope.isSearching = true;
        $scope.searchResults = data.Results;
      }
    });
  }

  $scope.refreshSearch=function(){
    $http.post('https://deadbolt.cbsitedb.net/api/groups/search/', {Info:''}).success(function(data){
      if(data.Success){
        $scope.isEditing = false;
        $scope.isSearching = true;
        $scope.searchResults = data.Results;
      }
    });
  }

  $scope.edit=function(index){
    var groupinfo = $scope.searchResults[index];
    var group_dbs = [];
    $http.get('https://deadbolt.cbsitedb.net/api/databases/'+groupinfo.Name).success(function(data){
      if(data.Success){
        group_dbs= data.Results;
        for(var i=0; i<$scope.databases.length; i++){
          var db = $scope.databases[i];
          if(group_dbs.indexOf(db.Name) >=0){
            $scope.databases[i].Checked = true;
          }
          else{
            $scope.databases[i].Checked = false;
          }
        }
      }
    });
    $http.get('https://deadbolt.cbsitedb.net/api/users/'+groupinfo.ID).success(function(data){
      if(data.Success){
        groupinfo.Users = data.Data;
      }
    });
    $scope.group = groupinfo;
    $scope.groupRef = JSON.stringify(groupinfo);
    $scope.isSearching=false;
    $scope.isEditing = true;
  }

  $scope.nochange=function(){
    console.log($scope.group);
    console.log($scope.groupRef);
    if($scope.groupRef){
      return ($scope.groupRef===JSON.stringify($scope.group));
    }
    else{
      return false;
    }
  }

  $scope.addGroup=function(){
    $scope.group = {};
    $scope.groupRef=null;
    $scope.databases.forEach(function(db, i){
      db.Checked=false;
    });
    $scope.isEditing = true;
    $scope.isSearching = false;
  }

  $scope.saveGroup=function(){
    var groupdata = JSON.parse(JSON.stringify($scope.group));
    groupdata.Databases = [];
    for(var i=0; i<$scope.databases.length; i++){
      if($scope.databases[i].Checked){
        groupdata.Databases.push($scope.databases[i].Name);
      }
    }
    $http.post('https://deadbolt.cbsitedb.net/api/groups', groupdata).success(function(data){
      if(data.Success){
        $scope.group.ID = data.ID;
        $scope.refreshSearch();
        toastr.success("Group updated successfuly!");
      }
    });
  }

  $scope.removeGroup=function(){
    var gid = $scope.group.ID;
    $http.delete('https://deadbolt.cbsitedb.net/api/groups/' + gid).success(function(data){
      $scope.isEditing=false;
      $scope.refreshSearch();
      $scope.isSearching = true;
      $scope.group = {};
      $scope.groupRef=null;
      toastr.success("Group removed");
    });
  }

});
