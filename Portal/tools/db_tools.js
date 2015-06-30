var connection = require('../routes/mysql.js');
var mysql_tools = require('./mysql_tools.js');
//var mssql_tools = require('./mssql_tools.js');
//var mongo_tools = require('./mongo_tools.js');

module.exports = {
  update_database_users: function(db, callback){
    var dbinfo = db;
    //get gospel user list
    var get_users = "Select Distinct Username from users where users.ID in (Select User_ID from users_groups where users_groups.Group_ID in (Select Group_ID from groups_databases where Database_ID = ?))";
    connection.query(get_users, [dbinfo.ID], function(err, results){
      if(err){
        console.log("Error on " + dbinfo.Name +": " + err);
        callback(err);
      }
      var gospel_users = [];
      for(var i=0; i<results.length; i++){
        gospel_users.push(results[i].Username);
      }
      connection.query("Select * from users;", function(err, all_users){
        if(err){
          console.log("Error on " + dbinfo.Name +": " + err);
          callback(err);
        }
        switch(dbinfo.Type.toLowerCase().trim()){
          case 'mysql':
            mysql_tools.update_users(dbinfo, all_users, gospel_users, function(err){
              console.log(dbinfo.Name + " Updated");
              callback(err);
            });
            break;
          case 'aurora':
            mysql_tools.update_users(dbinfo, all_users, gospel_users, function(err){
              console.log(dbinfo.Name + " Updated");
              callback(err);
            });
            break;
          /*
          case 'sqlserver':
            mssql_tools.update_users(dbinfo, all_users, gospel_users, function(errs){
              callback(errs);
            });
            break;
          case 'mongo':
            mongo_tools.update_users(dbinfo, all_users, gospel_users, function(errs){
              callback(errs);
            });
            break;
          */
          default:
            callback([{Error: "Unsupported Database type: " + dbinfo.Type}]);
            break;
        }
      });
    });
  }
};
