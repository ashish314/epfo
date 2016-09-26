// main start point for application

var EXPRESS       = require('express'),
    APP           = module.exports = EXPRESS(),
    CONFIG        = require(__dirname + '/config.js'),
    bodyParser    = require('body-parser'),
    ROUTER        = require(__dirname + '/routes/routes.js')();
    redisClient   = require(__dirname + '/controllers/redis.js')(); 

APP.use(bodyParser.urlencoded({extended:true}));
APP.use(bodyParser.json());
APP.engine('html', require('ejs').renderFile);
APP.use(EXPRESS.static(__dirname + '/public/'));

ROUTER.init()
.then(function (){ 
  redisClient.flushall(function (err,success){
    if(err){
      console.log(err);
      process.exit(1);
    }
    else{
      // on startup clean redis sessions.
      console.log("redis flushed");
      APP.listen(CONFIG.httpServer.port || 8000,function (){
        APP.use('/',ROUTER.router);
        console.log("server listining on port "+CONFIG.httpServer.port);
      });
    }
  });
},function (err){
  console.log(err);
  process.exit(1);
});