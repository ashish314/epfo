// main start point for application

var EXPRESS       = require('express'),
    APP           = module.exports = EXPRESS(),
    CONFIG        = require(__dirname + '/config.js'),
    bodyParser    = require('body-parser'),
    ROUTER        = require(__dirname + '/routes/routes.js')();

APP.use(bodyParser.urlencoded({extended:true}));
APP.use(bodyParser.json());
APP.use(EXPRESS.static(__dirname + '/public/html/'))

ROUTER.init()
.then(function (){ 

  APP.listen(CONFIG.httpServer.port || 8000,function (){
    APP.use('/',ROUTER.router);
    console.log("server listining on port "+CONFIG.httpServer.port);
  });

},function (err){
  console.log(err);
  process.exit(1);
});