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
var express = require('express');
var router = express.Router();
var async = require('async');
var connection = require('../middleware/mysql');
var encryption = require('../middleware/encryption');
var audit = require('../middleware/audit');
var db_tools = require('../tools/db_tools');


function add_group(body, callback){
  if(!body || !body.Name){
    return callback("No Group Name Specified!");
  }
  var query = 'Insert into groups (Name) value (?) ON Duplicate KEY UPDATE Name=Name';
  connection.query(query, [body.Name], function(err, result){
    if(err){
      console.log(err);
      return callback(err);
    }
    body.ID = result.insertId;
    return callback(null, body);
  });
}

function update_group(body, callback){
  var Group_ID = body.ID;
  var g_dbnames = body.Databases || [];
  var affected_dbnames = [];
  connection.query("Select Name from `databases` where ID in (Select Database_ID from groups_databases where Group_ID = ?)", [Group_ID], function(err, results){
    if(err){
      console.log(err);
      return callback(err);
    }
    var e_dbnames = [];
    results.forEach(function(db, i){
      if(g_dbnames.indexOf(db.Name)<0){
        affected_dbnames.push(db.Name);
      }
      e_dbnames.push(db.Name);
    });
    g_dbnames.forEach(function(dbname, i){
      if(e_dbnames.indexOf(dbname)<0){
        affected_dbnames.push(dbname);
      }
    });
    if(affected_dbnames.length < 1){
      console.log('no affected databases!');
      return callback(null, body);
    }
    var del_group_query ="";
    var add_group_query = "";
    if(g_dbnames.length>0){
      var db_where = 'where (';
      for(var i =0; i<g_dbnames.length; i++){
        db_where += '`databases`.Name = ? OR ';
      }
      db_where+='0=1)';
      del_group_query = 'Delete from groups_databases where Group_ID= ? and Database_ID not in (Select ID from `databases` '+db_where+');';
      add_group_query = 'Insert into groups_databases (Group_ID, Database_ID) Select ?, `databases`.ID from `databases` ' + db_where +' ON DUPLICATE KEY UPDATE Group_ID=Group_ID;';
    }
    else{
      del_group_query = 'Delete from groups_databases where Group_ID= ?;';
      add_group_query = 'Set @dummy=?;';
    }
    connection.query(del_group_query, [Group_ID].concat(g_dbnames), function(err, results){
      if(err){
        console.log(err);
        return callback(err);
      }
      connection.query(add_group_query, [Group_ID].concat(g_dbnames), function(err, results){
        if(err){
          console.log(err);
          return callback(err);
        }
        var aff_dbs_query = "Select * from `databases` where (0=1";
        affected_dbnames.forEach(function(name, i){
          aff_dbs_query +=" OR `databases`.Name =?";
        });
        aff_dbs_query +=");";
        connection.query(aff_dbs_query, affected_dbnames, function(err, results){
          if(err){
            console.log(err);
            return callback(err);
          }
          var affected_dbs = results;
          connection.query("Select * from users where ID in (Select User_ID from users_groups where Group_ID=?)", [Group_ID], function(err, results){
            if(err){
              console.log(err);
              return callback(err);
            }
            var users = results;
            async.each(affected_dbs, function(db, inner_callback){
              db_tools.update_users(db, users, function(errs){
                inner_callback();
              });
            }, function(err){});
            callback(null, body);
          });
        });
      });
    });
  });
}

router.get('/', function(req, res){
  var gq = 'Select ID, Name from groups';
  if(res.locals.user.Admins.indexOf(-1)<0){
    gq += ' where ID in (?)';
  }
  gq+=';';
  connection.query(gq, [res.locals.user.Admins], function(err, results){
    if(err){
      console.log(err);
      return res.send({Success:false, Error:err});
    }
    return res.send({Success:true, Results: results});
  });
});


router.get('/:username', function(req, res){
  var username = req.params.username;
  var query = 'Select groups.ID as Group_ID, groups.Name, users_groups.Permissions, users_groups.GroupAdmin from groups Join users_groups on users_groups.Group_ID=groups.ID where users_groups.User_ID=(Select ID from users where Username=?);';
  connection.query(query, [username], function(err, results){
    if(err){
      console.log(err);
      return res.send({Success:false, Error:err});
    }
    return res.send({Success:true, Results: results});
  });
});

router.use(function(req,res,next){
  if(!res.locals.user || !res.locals.user.Admins || res.locals.user.Admins.length<1){
    return res.send({Success: false, Error: 'Unauthorized to access this route!'});
  }
  else{
    if(res.locals.user.Admins.indexOf(-1)<0){
      return res.send({Success: false, Error: 'Not a full Admin!'});
    }
    else{
      return next();
    }
  }
});

router.post('/search', function(req, res){
  var body = req.body;
  var query = "";
  var args = [];
  if(body && body.Info && body.Info.length > 0){
    var info = "%"+body.Info+"%";
    query = 'Select ID, Name from groups where Name like ?';
    args = [info];
  }
  else{
    query = 'Select ID, Name from groups;';
  }
  connection.query(query, args, function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error: err});
    }
    return res.send({Success: true, Results:results});
  });
});

router.post('/', function(req, res){
  var body = req.body;
  var exists = !!body.ID;
  async.waterfall([
    function(callback){
      if(body.ID){
          return callback(null, body);
      }
      add_group(body, callback);
    },
    function(new_body, callback){
      update_group(new_body, callback);
    },
    function(info, callback){
      var activity ="";
      if(exists){
        activity = 'Updated group: ?';
      }
      else{
        activity = 'Added Group: ?';
      }
      audit.record(activity, [info.Name, info], function(err){
        if(err){
          console.log(err);
        }
        return callback(null, info);
      });
    }
  ], function(err, results){
    if(err){
      return res.send({Success: false, Error: err});
    }
    return res.send({Success: true, ID: results.ID});
  });
});

router.delete('/:id', function(req,res){
  var group_id = req.params.id;
  connection.query("Select * from `databases` where ID in (Select Database_ID from groups_databases where Group_ID = ?);", [group_id], function(err, results){
    if(err){
      console.log(err);
      return res.send({Success:false, Error: err});
    }
    var databases = results;
    connection.query("Select * from users where ID in (Select User_ID from users_groups where Group_ID=?)", [group_id], function(err, results){
      if(err){
        console.log(err);
        return res.send({Success:false, Error: err});
      }
      var users = results;
      console.log("removing group " + group_id);
      var query = "Delete from groups_databases where Group_ID = ?";
      connection.query(query, [group_id], function(err, result){
        if(err){
          console.log(err);
          return res.send({Success:false, Error: err});
        }
        connection.query("Delete from users_groups where Group_ID = ?", [group_id], function(err, results){
          if(err){
            console.log(err);
            return res.send({Success:false, Error: err});
          }
          connection.query('Delete from groups where ID = ?', [group_id], function(err, result){
            if(err){
              console.log(err);
              return res.send({Success:false, Error: err});
            }
            databases.forEach(function(db, i){
              db_tools.update_users(db, users, function(errors){});
            });
            audit.record("Deleted group with ID: ?", [group_id], function(err){
              if(err){
                console.log(err);
              }
              return res.send({Success: true});
            });
          });
        });
      });
    });
  });
});


module.exports = router;
