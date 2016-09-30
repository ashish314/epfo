var mongo    = require(__dirname + '/../mongo.js'),
    deferred = require('deferred');

function storeXmlData() {
  this.record           = null;
  this.mongo            = null;
  this.insertedRecords  = 0;
  this.duplicateRecords = 0;
  this.initialized      = false;
};

storeXmlData.prototype.init = function (mongoObj){
  var initDefer = new deferred();
  if(!mongoObj){
    return initDefer.reject("Mongo not initialized");
  }
  this.mongo = mongoObj;
  this.initialized = true;
  return initDefer.resolve();
};


// toDO : need to check before inserting that record exists or not.

storeXmlData.prototype.storeRecord = function (record,options){
  var storeDefer = new deferred(),
      self       = this;
  if(!this.mongo)
    return storeDefer.reject("Mongo not initialized");

  this.mongo.masterDataModel.create(record,function (defer,err,result){
    if(err){
      console.log(err);
      return defer.resolve();
    }
    else{
      self.insertedRecords++;
      return defer.resolve(result);
    }
  }.bind(null,storeDefer));

  return storeDefer.promise;
};

storeXmlData.prototype.end = function (){
  console.log("store data end called");
};

module.exports = exports = storeXmlData;



