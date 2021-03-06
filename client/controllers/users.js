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
app.controller('UserCtrl', function($http, $scope, $cookies, $cookieStore, $location, toastr, authService, tabService){
  tabService.setTab(1);

  $scope.searchResults = [];
  $scope.user = {};
  $scope.groups = [];
  $scope.searchCreds = {Info: ""};
  $scope.numpages = 1;
  $scope.pages = [];
  $scope.currpage = 1;

  $http.get('/api/groups').success(function(data){
    if(data.Success){
      for(var i=0; i<data.Results.length; i++){
        $scope.groups.push({Checked:false, Name:data.Results[i].Name, Group_ID:data.Results[i].ID});
      }
    }
  });

  $scope.isAdmin=function(groupid){
    return authService.isFullAdmin() || (authService.getAdmins().indexOf(groupid)>-1);
  };

  $scope.isFullAdmin=function(groupid){
    return authService.isFullAdmin();
  };

  $scope.search=function(pagenum){
    $http.post('/api/users/search/'+pagenum, $scope.searchCreds).then(function(res){
      var data = res.data;
      if(data.Success){
        $scope.isEditing = false;
        $scope.isSearching = true;
        $scope.searchResults = data.Results;
        var records = data.Total;
        $scope.numpages = Math.ceil(records/50);
        $scope.currpage = 1;
        $scope.page_change(pagenum+1);
      }
      else{
        toastr.error(data.Error);
      }
    }, function(err){
      toastr.error(err);
    });
  }
;
  $scope.page_change=function(newpage){
    $scope.currpage = newpage;
    var pages = [];
    var i = newpage-2;
    var topped = false;
    while(pages.length<$scope.numpages && pages.length<5){
      if(i>0 && i<=$scope.numpages){
        if(topped){
          pages.unshift(i);
        }
        else{
          pages.push(i);
        }
      }
      if(i >= $scope.numpages){
        topped = true;
        i = pages[0];
      }
      if(topped){
        i--;
      }
      else{
        i++;
      }
    }
    $scope.pages = pages;
  };

  $scope.refreshSearch = function(){
    $http.post('/api/users/search/0', $scope.searchCreds).success(function(data){
      if(data.Success){
        $scope.isEditing = false;
        $scope.isSearching = true;
        $scope.searchResults = data.Results;
        var records = data.Total;
        var numpages = records/50;
        if(records%50 >0){
          numpages +=1;
        }
        $scope.numpages = numpages;
      }
    });
  };

  $scope.groupChanged=function(group){
    if(!group.Checked){
      group.Permissions='';
      group.GroupAdmin =0;
    }
  };

  $scope.page_array=function(){
    var quick_pages = [];
    var bottom = Math.max($scope.page-2, 0);
    var top = Math.min($scope.pages, $scope.page+2);
    var length = Math.max(top-bottom, 5);
    for(var i=bottom; i<bottom+length; i++){
      quick_pages.push(i);
    }
    return quick_pages;
  };

  $scope.applyGroups = function(userinfo, callback){
    if(userinfo.Active){
      $http.get('/api/groups/'+userinfo.Username).success(function(data){
        if(data.Success){
          callback(null, data.Results);
        }
        else{
          callback(data);
        }
      });
    }
    else{
      callback(null, {});
    }
  };

  $scope.edit=function(index){
    var userinfo = $scope.searchResults[index];
    var usergroups = [];
    $scope.userRef = null;
    if(userinfo.Active){
      $scope.userRef = JSON.stringify(userinfo);
    }
    $scope.applyGroups(userinfo, function(err, results){
      if(err){
        toastr.error(err,'Something went wrong');
      }
      else{
        var usergroups = results;
        $scope.groups.forEach(function(g){
          var found = false;
          for(var i=0; i<usergroups.length; i++){
            var ug = usergroups[i];
            if(ug.Group_ID == g.Group_ID){
              g.Checked = true;
              g.Permissions = ug.Permissions;
              g.GroupAdmin = ug.GroupAdmin;
              found = true;
              break;
            }
          }
          if(!found){
            g.Checked = false;
            g.Permissions = "";
            g.GroupAdmin = 0;
          }
        });
        $scope.groupsRef = JSON.stringify($scope.groups);
        $scope.isSearching=false;
        $scope.isEditing = true;
        $scope.user = userinfo;
      }
    });
  };

  $scope.addUser=function(){
    $scope.user = {};
    $scope.groupsRef=null;
    $scope.groups.forEach(function(g, i){
      g.Checked=false;
      g.Permissions = "";
      g.GroupAdmin = 0;
    });
    $scope.isEditing = true;
    $scope.isSearching = false;
  };

  $scope.nochange=function(){
    if($scope.userRef){
      return ($scope.userRef===JSON.stringify($scope.user) && ($scope.groupsRef === JSON.stringify($scope.groups)));
    }
    else{
      return false;
    }
  };

  $scope.saveUser=function(){
    var userdata = JSON.parse(JSON.stringify($scope.user));
    userdata.Groups = [];
    $scope.groups.forEach(function(group, i){
      if(group.Checked){
        userdata.Groups.push({ID: group.Group_ID, Permissions: group.Permissions, GroupAdmin:group.GroupAdmin});
      }
    });
    $http.post('/api/users', userdata).success(function(data){
      if(data.Success){
        $scope.user.Active = data.Active;
        $scope.refreshSearch();
        toastr.success("User updated successfuly!");
      }
      else{
        toastr.error(data.Error, "User failed to update");
      }
    }, function(err){
      toastr.error(err);
    });
  };

  $scope.removeUser=function(){
    var uid = $scope.user.ID;
    $http.delete('/api/users/' + uid).success(function(data){
      $scope.user = {};
      $scope.refreshSearch();
    });
  };

  $scope.search(0);

});
