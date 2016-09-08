var redis         = require('redis');

var redisClient = null,
    connected   = false;

var connectRedis = function connectRedis(){
  if(connected){
    return redisClient;
  }
  else{
    redisClient = redis.createClient('redis://localhost:6379');

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

