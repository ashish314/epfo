// this will hold the process together (read, process, store).

var ftpFetcher        = require(__dirname + '/ftpFetcher.js'),
    mongo             = require(__dirname + '/mongo.js'),
    readXmlData       = require(__dirname + '/readXmlData/readXmlData.js'),
    storeXmlData      = require(__dirname + '/storeXmlData/storeXmlData.js'),
    processXmlData    = require(__dirname + '/processXmlData/processXmlData.js')
    config            = require(__dirname + '/../config.js');

var deferred          = require('deferred');


function masterDataProcessor(){
  this.ftpFetcherObj      = null;
  this.mongoObj           = null;
  this.readXmlDataObj     = null;
  this.processXmlDataObj  = null;
  this.storeXmlDataObj    = null;
  this.initialized         = false;
};

masterDataProcessor.prototype.init = function (){
  var self      = this,
      initDefer = new deferred();

  this.ftpFetcherObj      = this.ftpFetcherObj   || ftpFetcher();
  this.mongoObj           = this.mongoObj        || mongo();
  this.readXmlDataObj     = this.readXmlDataObj  || new readXmlData();
  this.storeXmlDataObj    = this.storeXmlDataObj || new storeXmlData();
  this.processXmlDataObj  = this.processXmlDataObj || new processXmlData();

// todo , seperate init and other functionality so that 
// it can be run every fixed interval.

  this.mongoObj.init()
  .then(function (){
    return self.ftpFetcherObj.initiateDownloadProcess();
  })
  .then(function (){
    return self.readXmlDataObj.init();
  })
  .then(function (){
    return self.processXmlDataObj.init();
  })
  .then(function (){
    return self.storeXmlDataObj.init(self.mongoObj);
  })
  .then(function (){
    console.log("masterDataProcessor initialized successfully");
    self.initialized = true;
    initDefer.resolve();
  },function (err){
    console.log("masterDataProcessor not initialized");
    initDefer.reject(err);
  });

  return initDefer.promise;
};

masterDataProcessor.prototype.start = function (defer){
  if(!this.initialized){
    throw new Error("masterDataProcessor not initialized");
    process.exit(1);
  }

  var processDefer = defer || new deferred(),
      self         = this;

  // step 1 read record.
  self.readXmlDataObj.getNext()
  .then(function (record){
    // process the record
    return self.processXmlDataObj.processRecord(record,{});
  },function (err){
    // till here if any error occurs deal with it.
    console.log(err);
    process.exit(1);
  })
  .then(function (updatedRecord){
    // record updated now store it.
    return self.storeXmlDataObj.storeRecord();
  })
  .then(function (){
    // saved successfully and still more to go.
    setTimeout(function (){
      self.start(processDefer); 
    },0);
  },function (err){
    // got error means data finished call end;
    self.end(processDefer);
  });

  return processDefer.promise;
};

masterDataProcessor.prototype.end = function (defer){
  this.ftpFetcherObj      = null;
  this.mongoObj           = null;
  this.readXmlDataObj     = null;
  this.processXmlDataObj  = null;
  this.storeXmlDataObj    = null;
  this.initalized         = false;
  defer.resolve();
};

/*
test code
var abc = new masterDataProcessor();
abc.init().then(function (){
  return abc.start();
},function (err){
  console.log(err);
  // at this point all data has been inserted in db.
});
*/


module.exports = exports = masterDataProcessor;