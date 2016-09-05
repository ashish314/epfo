// this will hold the process together (read, process, store).

var ftpFetcher        = require(__dirname + '/ftpFetcher.js'),
    mongo             = require(__dirname + '/mongo.js'),
    readXmlData       = require(__dirname + '/readXmlData/readXmlData.js'),
    storeXmlData      = require(__dirname + '/storeXmlData/storeXmlData.js'),
    config            = require(__dirname + '/../config.js');

var deferred          = require('deferred');


function masterDataProcessor(){
  this.ftpFetcherObj  = null;
  this.mongoObj       = null;
  this.readXmlDataObj = null;
  this.storeXmlDataObj = null;
};

masterDataProcessor.prototype.init = function (){
  var self = this;
  this.ftpFetcherObj  = ftpFetcher();
  this.mongoObj       = mongo();
  this.readXmlDataObj = new readXmlData();
  this.storeXmlDataObj= new storeXmlData();

  this.mongoObj.init()
  .then(function (){
    return self.storeXmlDataObj.init(self.mongoObj);
  })
  .then(function (){
    return self.ftpFetcherObj.initiateDownloadProcess();
  })
  .then(function (){
    return self.readXmlDataObj.init.bind(self.readXmlDataObj)();
  })
  .then(function (){
    return self.readXmlDataObj.getNext();
  })
  .then(function (record){
    return self.storeXmlDataObj.storeRecord(record,{});
  },function (err){
    console.log(err);
    process.exit(1);
  });
};


var abc = new masterDataProcessor();
abc.init();
