var fs        = require('fs'),
    xml2js    = require('xml2js'),
    deferred  = require('deferred'),
    parser    = new xml2js.Parser(),
    config    = require(__dirname + '/../../config.js');

function readXmlData(){
  this.parser       = null;
  this.initialized  = false;
  this.dataArray    = [];
  this.totalRecords = 0;
  this.recordsRead  = 0;
  this.dataErrors   = [];
  this.filesArray   = [];
  this.currentFile  = null;
};

readXmlData.prototype.init = function() {
  var self  = this,
      defer = new deferred();

  if(!this.parser)
    this.parser = new xml2js.Parser();

  // now read file.

  self.filesArray = fs.readdirSync(config.masterDataDownloadPath) || [];
  this.initialized = true;
  return defer.resolve();

};

readXmlData.prototype.normalizeData = function (data,defer,options){
  var self            = this;
  // ensure xml data is in correct format.
  try{
    data.forEach(function (eachRecord) {
      var dbJson = {};
      dbJson['PARTNER']         = eachRecord['BP'][0] || null;
      dbJson['BPKIND']          = eachRecord['BPKIND'][0] || null;
      dbJson['BPEXT']           = eachRecord['BPEXT'][0] || null;
      dbJson['FULL_NAME']       = eachRecord['FULLNAME'][0] || null;
      dbJson['ZZTITLE1']        = eachRecord['CTITLE'][0] || null;
      dbJson['ZZFULL_NAME']     = eachRecord['D_FULLNAME'][0] || null;
      dbJson['ZZDESIGNATION1']  = eachRecord['C_DEGI'][0] || null;
      dbJson['CITY1']           = eachRecord['CITY1'][0] || null;
      dbJson['CITY2']           = eachRecord['CITY2'][0] || null;
      dbJson['POST_CODE1']      = eachRecord['PCODE'][0] || null;
      dbJson['STREET']          = eachRecord['STREET'][0] || null;
      dbJson['HOUSE_NUM1']      = eachRecord['HNUM'][0] || null;
      dbJson['STR_SUPPL1']      = eachRecord['SRT1'][0] || null;
      dbJson['COUNTRY']         = eachRecord['COUNTRY'][0] || null;
      dbJson['REGION']          = eachRecord['REGION'][0] || null;
      dbJson['TEL_NUM']         = eachRecord['TELNUM'][0] || null;
      dbJson['ADDHAR']          = eachRecord['ADDHAR'][0] || null;
      dbJson['PAN']             = eachRecord['PAN'][0] || null;
      dbJson['REGUNIT']         = eachRecord['RUNIT'][0] || null;
      self.dataArray.push(dbJson);  
    });
  }
  catch(e){
    console.log(e);
    return defer.reject({err : "data error",finished : false});
  }
  
  
  self.totalRecords = self.dataArray.length;
  defer.resolve();
};

readXmlData.prototype.checkRequiredFields = function (requiredFieldObj,dataObj){
  Object.keys(requiredFieldObj).forEach(function (key){
    if(!dataObj[key]){
      return false;
    }
  });
  return true;
};

readXmlData.prototype.getNext = function (){
  var recordDefer = new deferred(),
      self        = this;

  if(!this.initialized){
    return recordDefer.reject('oh snap! forgot to init source');
  }
  else if(!this.dataArray || this.dataArray.length === 0){
    // return recordDefer.reject('Out of data');
    this.scheduler()
    .then(function (){
      var record = self.dataArray.shift();
      console.log("record passed from getnext");
      return recordDefer.resolve(record);
    },function (err){
      return recordDefer.reject("all files are read");
    });
    return recordDefer.promise;
  }
  else{
    var record = this.dataArray.shift();
    console.log("record passed from getnext");
    return recordDefer.resolve(record);
  }
};

readXmlData.prototype.scheduler  = function (defer,deferCreated){
  var self = this,
      deferCreated = deferCreated || false,
      defer = defer || new deferred();

  this.readNextFile()
  .then(function (){
    return defer.resolve();

  },function (result){
    if(result && result.finished)
      return defer.reject();
    else{
      self.scheduler(defer,true);
    }
  });
  if(!deferCreated && !defer.resolved)
    return defer.promise;
  return;
};

readXmlData.prototype.readNextFile = function (){
  //populate dataArray with json array.
  var self  = this,
      defer = new deferred();

  if(!this.dataArray || this.dataArray.length === 0){
    // we need to read next file or all files are read.
    if(!this.filesArray || this.filesArray.length === 0){
      return defer.reject({err:null,finished:true});
    }
    else{
      this.currentFile = this.filesArray.shift();
      console.log("file swaped now reading "+this.currentFile);
      fs.readFile(config.masterDataDownloadPath+this.currentFile,'utf8',function (err,fileData){
        if(err)
          return defer.reject({err : err, finished : false});
        
        self.parser.parseString(fileData,function (err,data){
          if(err || !data)
            return defer.reject({err : err,finished : false});

          else{
            var traverseTo = ['asx:abap','asx:values',0,'TAB',0,'FINAL'];
            var cleanData = self.resolver(traverseTo,data);
            if(cleanData){
              // pass data to normalize function.
              self.normalizeData(cleanData,defer,{});
            }
            else{
              return defer.reject({err:'wrong formatting', finished : false});
            }
          }
        });
      });
      return defer.promise;
    }
  }
  else{
    return defer.resolve();
  }
};

readXmlData.prototype.resolver  = function (fieldsArray,data){
  fieldsArray.forEach(function (key){
    data = data[key];
    if(!data)
      return false;
  });
  return data;
};

readXmlData.prototype.end = function (){
  this.parser = null;
  this.initialized = false;
  this.dataArray = [];
  this.totalRecords = 0;
  this.recordsRead = 0;
  this.dataErrors = [];
  this.filesArray   = [];
  this.currentFile  = null;
  console.log("readXml data end is finished");
};


module.exports = exports = readXmlData;



// var obj = new readXmlData();
// obj.init()
// .then(function (){
//   return obj.getNext();
// })
// .then(function (record){
//   console.log(record);
// },function (err){
//   console.log(err);
// });
