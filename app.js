// main start point for application

var EXPRESS = require('express'),
    APP     = EXPRESS(),
    CONFIG  = require(__dirname + '/config.js'),
    ROUTER  = require(__dirname + '/routes/routes');


APP.use('/',ROUTER);


APP.listen(CONFIG.httpServer.port || 8000,function (){
  console.log("server listining on port "+CONFIG.httpServer.port);
});

