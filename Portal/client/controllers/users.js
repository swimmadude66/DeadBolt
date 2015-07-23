'use strict';

app.controller('UserCtrl', function($http, $scope, $cookies, $cookieStore, $location, toastr){
  $scope.searchResults = [];
  $scope.user = {};
  $scope.groups = [];
  $scope.searchCreds = {Info: ""};
  $scope.$emit('tabChanged', 1);

  $http.post('/api/users/search/0', {Info: ""}).success(function(data){
    if(data.Success){
      $scope.isEditing = false;
      $scope.isSearching = true;
      $scope.searchResults = data.Results;
    }
  });

  $http.get('/api/groups').success(function(data){
    if(data.Success){
      for(var i=0; i<data.Results.length; i++){
        $scope.groups.push({Checked:false, Name:data.Results[i].Name, ID:data.Results[i].ID});
      }
    }
  });

  $scope.search=function(pagenum){
    $http.post('/api/users/search/'+pagenum, $scope.searchCreds).success(function(data){
      if(data.Success){
        $scope.isEditing = false;
        $scope.isSearching = true;
        $scope.searchResults = data.Results;
      }
    });
  }

  $scope.refreshSearch = function(){
    $http.post('/api/users/search/0', $scope.searchCreds).success(function(data){
      if(data.Success){
        $scope.isEditing = false;
        $scope.isSearching = true;
        $scope.searchResults = data.Results;
      }
    });
  }

  $scope.groupChanged=function(group){
    if(!group.Checked){
      group.Permissions='';
    }
  }

  $scope.page_array=function(){
    var quick_pages = [];
    var bottom = Math.max($scope.page-2, 0);
    var top = Math.min($scope.pages, $scope.page+2);
    var length = Math.max(top-bottom, 5);
    for(var i=bottom; i<bottom+length; i++){
      quick_pages.push(i);
    }
    return quick_pages;
  }

  $scope.edit=function(index){
    var userinfo = $scope.searchResults[index];
    var usergroups = [];
    if(userinfo.User_ID){
      $scope.userRef = JSON.stringify(userinfo);
      $http.get('/api/groups/'+userinfo.Username).success(function(data){
        if(data.Success){
          usergroups = data.Results;
          for(var i=0; i<$scope.groups.length; i++){
            var g = $scope.groups[i];
            if(g.Name in usergroups){
              $scope.groups[i].Checked = true;
              $scope.groups[i].Permissions = usergroups[g.Name];
            }
            else{
              $scope.groups[i].Checked = false;
              $scope.groups[i].Permissions = "";
            }
          }
          $scope.isSearching=false;
          $scope.isEditing = true;
          $scope.groupsRef = JSON.stringify($scope.groups);
        }
        else{
          $toastr.error('API Error', 'Could not retreive groups for the selected user');
        }
      });
    }
    else{
      $scope.userRef = null;
      $scope.groupsRef = null;
      for(var i=0; i<$scope.groups.length; i++){
        $scope.groups[i].Checked = false;
      }
    }
    $scope.user = userinfo;
  }

  $scope.nochange=function(){
    if($scope.userRef){
      return ($scope.userRef===JSON.stringify($scope.user) && ($scope.groupsRef === JSON.stringify($scope.groups)));
    }
    else{
      return false;
    }
  }

  $scope.saveUser=function(){
    var userdata = JSON.parse(JSON.stringify($scope.user));
    userdata.Groups = {};
    $scope.groups.forEach(function(group, i){
      if(group.Checked){
        userdata.Groups[group.ID]=group.Permissions;
      }
    });
    $http.post('/api/users', userdata).success(function(data){
      if(data.Success){
        $scope.user.User_ID = data.ID;
        $scope.refreshSearch();
        toastr.success("User updated successfuly!");
      }
    });
  }

  $scope.removeUser=function(){
    var uid = $scope.user.User_ID;
    $http.delete('/api/users/' + uid).success(function(data){
      $scope.user = {};
      $scope.refreshSearch();
    });
  }

});
