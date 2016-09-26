var redis         = require('redis'),
    config        = require(__dirname + '/../config.js');

var redisClient = null,
    connected   = false;

var connectRedis = function connectRedis(){
  if(connected || redisClient){
    return redisClient;
  }
  else{
    redisClient = redis.createClient(config.redis);

    redisClient.on('error',function (err){
      console.log(err);
      process.exit(1);
    });

    redisClient.on('ready',function (){
      console.log('redis connected');
      connected = true;
    });
    return redisClient;
  }
};

module.exports = exports = connectRedis;

