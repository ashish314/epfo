// mongo class all mongo things needs to be done here.
// basically this will expose a obj.

var mongoose         = require('mongoose'),
    config           = require(__dirname + '/../config.js'),
    masterDataSchema = require(__dirname + '/../db/masterData.js')(),
    deferred         = require('deferred');

function mongo() {
  this._dbConfig       = config.mongo;
  this.conn            = null;
  this.connected       = false;
  this.masterDataModel = null;

}

mongo.prototype.init = function() {
  // create connection to mongo.
  var initDefer = new deferred(),
      self      = this;

  if(this.connected)
    return initDefer.resolve();

  var options = {
    server : {
            // auto connect if we do get disconnected
            auto_reconnect  : true,
            // keep the connection alive
            socketOptions   : { keepAlive : 1 },
        }
  };

  var mongoUri = 'mongodb://'+config.mongo.host+':'+config.mongo.port+'/'+config.mongo.database;
  this.conn = mongoose.createConnection(mongoUri,options);

  this.conn.on('error',function (err){
    self.connected = false;
    return initDefer.reject(err);
  });

  this.conn.on('connected',function (){
    self.connected = true;
    self.getModels();
    initDefer.resolve();
  });

  return initDefer.promise;
};

mongo.prototype.getModels = function (){
  if(!this.conn || !this.connected)
    throw new Error("Not connected to mongo");

  this.masterDataModel = this.conn.model('masterData',masterDataSchema);
}

var mongoObj = null;

var getMongoObj = function(){
  if(!mongoObj)
    mongoObj = new mongo();

  return mongoObj;
};

module.exports = exports = getMongoObj;


/*
var abc = getMongoObj(); 

abc.init().then(function (){
  abc.masterDataModel.find({},function (err,res){
    console.log(res);
      });
},function (err){
  console.log(err);
});
*/




