// All the routes for the application will be here

var EXPRESS               = require('express'),
    ROUTER                = EXPRESS.Router(),
    REQUEST               = require('request');



ROUTER.get('/test',function (req,res,next){
  res.send("Router working fine");
});

module.exports = exports = ROUTER;