var config    = require(__dirname + '/../config.js'),
    ftpClient = require('ftp'),
    deferred  = require('deferred'),
    fs        = require('fs');


function ftpFetcher (){
  this.client = null;
  this.lastDownloaded = null;
}

ftpFetcher.prototype.initiateDownloadProcess = function() {
  var self          = this,
      downloadDefer = new deferred();

  if(!this.client){
    this.client = new ftpClient();
  }
  this.client.on('ready',function (status){
    self.client.get(config.masterDataFilePathOnSAP,function (err,stream){
      if(err){
        console.log(err);
        return downloadDefer.reject(err);
      }

      stream.once('close',function (){
        console.log("file downloaded successfully");
        self.client.end();
        self.client = null;
        downloadDefer.resolve();
      });

      stream.pipe(fs.createWriteStream(config.masterDataDownloadPath,{flags:'w',autoClose:true,defaultEncoding:'utf8'}));
    });
  });
  // check if file exists.
  try{
   fs.accessSync(config.masterDataDownloadPath); 
  }
  catch(e){
    fs.openSync(config.masterDataDownloadPath,'w');
  }
  // initiate ftp connection.
  this.client.connect(config.SAP_FTP_SERVER);
  // return downloadDefer.resolve();
  return downloadDefer.promise;
};

ftpFetcher.prototype.uploadFile = function (filePath,fileName){
  var self = this,
      defer = new deferred();

  
  var tempClient = new ftpClient();

  tempClient.on('ready',function (status){
    console.log(filePath);
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
  // var abc = downloadMasterData();
  // abc.initiateDownloadProcess();

