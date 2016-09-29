// 1. create ftp connection,
// 2. get the files name we are expecting from sap.
// 3. fetch all the files match above .
// 4. traverse over files and update status corresponding to that upload.

var ftp       = require('ftp'),
    mongoObj  = require(__dirname + '/mongo.js')(),
    deferred  = require('deferred'),
    fs        = require('fs'),
    config    = require(__dirname + '/../config.js');

function vv_sap_response(){
  this.mongoObj       = null ;
  this.ftpClient      = null ;
  this.expectedFiles  = null ;
  this.processStarted = false;
  this.filesToFetch   = [];
  this.ftpPath        = './vv_form_response/';
  this.resultStats    = {
    filesFetched : 0,
    processedSuccessfully : 0,
    errors : 0,
    filesWithErrors : [],   // means those which we were not able to process.
  };
};

vv_sap_response.prototype.init = function() {
  var self = this,
      initDefer = new deferred();

  if(this.processStarted)
    return initDefer.reject({initError : "previous process is still running"});

  if(!this.processStarted)
    this.processStarted = true;
  
  if(!this.ftpClient){
    this.ftpClient = new ftp();
  }
  this.ftpClient.on('ready',function (status){
    // now init mongo as well.
    if(!this.mongoObj)
      self.mongoObj = mongoObj;
    
    self.mongoObj.init()
    .then(function (){
      return self.getExpectedFiles();
    })
    .then(function (){
      return self.getFilesToFetch(self.ftpPath);
    })
    .then(function (){
      return initDefer.resolve();  

    },function (err){
      console.log(err);
      initDefer.reject(err);
    });
  });
  this.ftpClient.connect(config.SAP_FTP_SERVER);
  return initDefer.promise;
};

vv_sap_response.prototype.getExpectedFiles = function (){
  var self  = this,
      defer = new deferred();

  if(!mongoObj){
    return defer.reject("mongo not connected");
  }
  self.mongoObj.uploadedFileModel.find({sap_status : 'pending'})
  .lean()
  .exec(function (err,files){
    if(err)
      return defer.reject(err);

    self.expectedFiles = files.map(function (obj){ return obj.file_name; });
    return defer.resolve();
  });
  return defer.promise;
};

vv_sap_response.prototype.getFilesToFetch = function(ftpPath){
  // check which of the expected files are there on ftp.
  var self = this,
      defer = new deferred();

  if(!this.ftpClient)
    return defer.reject("ftp not connected");

  else{
    this.ftpClient.list(ftpPath,function (err,files){
      if(err)
        return defer.reject(err);

      else if(!files){
        self.filesToFetch = [];
        return defer.resolve();
      }
      else{
        files = files.map(function (i){ return i.name;});
        self.expectedFiles.forEach(function (eachExpectedFile){
          var len = eachExpectedFile.length;
          files.forEach(function (eachFileOnSap){
            if(eachFileOnSap.slice(0,len) === eachExpectedFile)
              self.filesToFetch.push(eachFileOnSap);
          });
        });
        return defer.resolve();
      }
    });
    return defer.promise;
  }
};

vv_sap_response.prototype.scheduler = function (defer,returned){
  var self = this,
      returned = returned || false,
      defer = defer || new deferred();

  if(!this.filesToFetch || this.filesToFetch.length === 0){
    console.log("all files processed");
    self.end();
    return defer.resolve();
  }
  
  var file = this.filesToFetch.shift();
  this.fetchFile(file)
  .then(function (){
    return self.moveFileToArchive(file);
  })
  .then(function (){
    return self.process(file);
  })
  .then(function (){
    self.scheduler(defer,true);
  },function (err){
    console.log(err);
    self.scheduler(defer,true);
  });

  if(!returned && !defer.resolved)
    return defer.promise;
};


vv_sap_response.prototype.moveFileToArchive = function (fileName){
  var oldPath = config.sap_vv_response_path+fileName,
      newPath = "/archive/"+fileName,
      moveDefer = new deferred();

  this.ftpClient.rename(oldPath,newPath,function (err,success){
    if(err)
      return moveDefer.reject(err);

    console.log(err);
    console.log(success);
    console.log("Moved "+fileName+' to archive');
    return moveDefer.resolve();
  });
  return moveDefer.promise;
};

vv_sap_response.prototype.fetchFile = function (fileName){
  var self    = this,
      sap_file_path_prefix = config.sap_vv_response_path,
      save_to              = config.vv_form_response, 
      defer   = new deferred();

  if(!fileName)
    return defer.resolve();

  else{
    self.ftpClient.get(sap_file_path_prefix+fileName,function (err,stream){
      if(err)
        return defer.reject(err);

      else{
        // create a file.
        fs.closeSync(fs.openSync(save_to+fileName, 'w'));

        stream.once('close', function (){
          console.log("file downloaded "+ fileName);
          return defer.resolve();
        });

        stream.pipe(fs.createWriteStream(save_to+fileName,{flags:'w',autoClose:true,defaultEncoding:'utf8'}));
      }
    });
    return defer.promise;
  }
};

vv_sap_response.prototype.process = function (fileName){
  var self  = this,
      defer = new deferred();

  var splitFile = fileName.split('_');
  if(!fileName || splitFile.length != 3){
    console.log("something is wrong, file name mst have 2 underscore.");
    return defer.resolve();
  }

  // update db record.
  var file_number = splitFile[0];
  this.mongoObj.uploadedFileModel.findOne({file_number : parseInt(file_number)})
  .exec(function (err,fileInfo){
    if(err)
      return defer.reject(err);

    else if(!fileInfo || fileInfo.sap_status != 'pending'){
      return defer.resolve();
    }

    else{
      if(splitFile.indexOf('SUCCESS.xml') != -1){
        fileInfo.sap_status = 'success';
        fileInfo.success_file_path = config.vv_form_response+fileName;
      }
      else if(splitFile.indexOf('ERROR1.txt') != -1 || splitFile.indexOf('ERROR2.txt') != -1){
        fileInfo.sap_status = 'error';
        fileInfo.error_file_path = config.vv_form_response+fileName;
      }
      fileInfo.sap_status_date = Date.now();
      
      fileInfo.save(function (err){
        console.log("file records inserted");
        return defer.resolve();
      });
    }
  });
  return defer.promise;
};

vv_sap_response.prototype.end = function (){
  // this should end the process.
  this.ftpClient.end();
  this.initialized      = false;
  this.ftpClient        = null;
  this.expectedFiles    = null;
  this.filesToFetch     = [];
  this.mongoObj         = null;
  this.processStarted   = false;

  console.log("called end of vv_sap_response");
  return true;
};

// below function should bind all the functions above and ensure that
// all the files are fetched and updated in db.
var vv_sap_response_obj = null;

// keep a varibale for checking the process ongoing (creare a end function).
var kickStartProcess = function (){
  if(!vv_sap_response_obj)
    vv_sap_response_obj = new vv_sap_response();

  vv_sap_response_obj.init()
  .then(function (){
    return vv_sap_response_obj.scheduler();
  })
  .then(function (){
    console.log("all files processed should call a end");
    vv_sap_response_obj = null;
  },function (err){
    if(err.initError)
      console.log("previous process is still running, will wait for its completion");
    else{
      console.log(err);
      vv_sap_response_obj = null;
    }
  });
};

exports = module.exports = kickStartProcess;

setInterval(function (){
  kickStartProcess();   
},30000);



