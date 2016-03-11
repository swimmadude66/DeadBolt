var express = require('express');
var app = express();
var fs = require('fs');
var ejs = require('ejs');
var path = require('path');
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

global.config = require('./config.json');
var port = 3000;

/*
*----------------Handle Client-----------
*/
app.set('view engine','html');
app.engine('html', ejs.renderFile);
app.use(express.static(path.join(__dirname, 'client')));

/*
*---------------------API----------------
*/
app.use(function(req, res, next){
  var url;
  if(req.protocol == 'http'){
    url =req.protocol+'://'+req.hostname;
    if(port !== 80){
      url += ":"+port;
    }
  }
  else if(req.protocol == 'https'){
    url =req.protocol+'://'+req.hostname;
    if(port!==443){
      url+=":"+port;
    }
  }
  else{
    url =req.protocol+'://'+req.hostname+':'+port;
  }
  res.locals.url = url;
  res.locals.port = port;
  return next();
});

app.use('/api/', require('./routes/api.js'));

app.use(function(req, res, next){
  res.status(404);
  // respond with json
  if (req.accepts('json')) {
    return res.send({Error: 'Not a valid endpoint'});
  }
  // default to plain-text. send()
  return res.type('txt').send('Not found');
});

if('SSL' in global.config){
  var https = require('https');
  var key_file = global.config.SSL.keyfile;
  var cert_file = global.config.SSL.certfile;

  var config = {
    key: fs.readFileSync(key_file),
   cert: fs.readFileSync(cert_file)
  };
  https.createServer(config, app).listen(port);
}
else{
  app.listen(port);
}

console.log('App Started on port ' + port);

module.exports = app;
