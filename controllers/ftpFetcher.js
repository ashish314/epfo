var config    = require(__dirname + '/../config.js'),
    ftpClient = require('ftp'),
    deferred  = require('deferred'),
    fs        = require('fs');


function ftpFetcher (){
  this.client     = null;
  this.filesArray = null;
};

ftpFetcher.prototype.init = function (){
  var self          = this,
      initDefer     = new deferred();

  if(!this.client){
    this.client = new ftpClient();
  }
  this.client.on('ready',function (status){
    initDefer.resolve();
  });
  this.client.connect(config.SAP_FTP_SERVER);
  return initDefer.promise;
};


ftpFetcher.prototype.list = function (){
  var listDefer = new deferred(),
      self      = this;

  if(!this.client)
    return listDefer.reject("ftp not connected");

  else{
    this.client.list('./masterDataFiles',function (err,files){
      if(err)
        return listDefer.reject(err);

      self.filesArray = files;
      listDefer.resolve();
    });
    return listDefer.promise;
  }
};

ftpFetcher.prototype.initiateDownloadProcess = function() {
  var self = this,
      downloadDefer = new deferred();

  this.init()
  .then(function (){
    return self.list();
  })
  .then(function (){
    return self.scheduler(downloadDefer);
  })
  .then(function (){
    return downloadDefer.resolve();
  },function (err){
    console.log(err);
    process.exit(1);
  });
  return downloadDefer.promise;
};

ftpFetcher.prototype.scheduler = function (defer){
  var self  = this,
      defer = defer || new deferred();

  if(this.filesArray.length === 0){
    return defer.resolve();
  }
  else{
    // function here which will process and call this function.
    self.process()
    .then(function (){
      self.scheduler(defer);
    },function (err){
      console.log(err);
      self.scheduler();
    });
    return defer.promise;
  }
};

ftpFetcher.prototype.process = function (){
  var processDefer = new deferred(),
      self         = this;

  if(!this.filesArray || this.filesArray.length === 0)
    return processDefer.resolve();

  else{
    var file = this.filesArray.shift();
    self.client.get('./masterDataFiles/'+file.name , function (err,stream){
      if(err){
        return processDefer.reject(err);
      }
      else{
        // create a file.
        fs.closeSync(fs.openSync(config.masterDataDownloadPath+file.name, 'w'));

        stream.once('close', function (){
          return processDefer.resolve();
        });

        stream.pipe(fs.createWriteStream(config.masterDataDownloadPath+file.name,{flags:'w',autoClose:true,defaultEncoding:'utf8'}));
      }
    });
    return processDefer.promise;
  }

};

ftpFetcher.prototype.uploadFile = function (filePath,fileName){
  var self = this,
      defer = new deferred();

  
  var tempClient = new ftpClient();

  tempClient.on('ready',function (status){
    tempClient.put(filePath,fileName,function (err){
      if(err)
        return defer.reject(err);

      tempClient.end();
      return defer.resolve();
    }); 
  });

  tempClient.connect(config.SAP_FTP_SERVER);
  return defer.promise;

};

ftpFetcher.prototype.end = function (){
  ftpFetcherObj = null;
  this.client = null;
  this.lastDownloaded = Date.now();
  return;
};

var ftpFetcherObj = null;
var downloadMasterData = function (){
  if(!ftpFetcherObj){
    ftpFetcherObj = new ftpFetcher();
  }
  return ftpFetcherObj;
};


module.exports = exports = downloadMasterData;




  // Test code
  var abc = downloadMasterData();
  abc.initiateDownloadProcess();

