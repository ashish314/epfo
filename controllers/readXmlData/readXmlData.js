var fs      = require('fs'),
    xml2js  = require('xml2js'),
    deferred= require('deferred'),
    parser  = new xml2js.Parser(),
    config  = require(__dirname + '/../../config.js');

function readXmlData(){
  this.filePath = config.masterDataDownloadPath;
  this.parser   = null;
  this.initialized = false;
  this.dataArray = [];
  this.totalRecords = 0;
  this.recordsRead = 0;
  this.dataErrors = []; 
};

readXmlData.requiredKeys = {
  'PARTNER' : '',
  'TYPE'    : '',
  'BPKIND'  : '',
};


readXmlData.prototype.init = function() {
  var self  = this,
      defer = new deferred();

  if(!this.parser)
    this.parser = new xml2js.Parser();

  // now read file.
  fs.readFile(this.filePath,'utf8',function (err,fileData){
    if(err)
      return defer.reject(err);
    
    self.parser.parseString(fileData,function (err,data){
      if(err)
        return defer.reject(err);

      self.normalizeData(data,defer,{});
    });

  });
  return defer.promise;

};

readXmlData.prototype.normalizeData = function (data,defer,options){
  var filterJsonArray = [],
      self            = this;
  // ensure xml data is in correct format.
  try {
    filterJsonArray = data['asx:abap']['asx:values'][0]['TAB'][0]['item'];
  }
  catch(e){
    return defer.reject("XML data format issues");
  }

  self.totalRecords = filterJsonArray.length;
  filterJsonArray.forEach(function (eachDataRecord){
    if(!self.checkRequiredFields(readXmlData.requiredKeys,eachDataRecord)){
      self.dataErrors.push(eachDataRecord);
    }
    else{
      self.dataArray.push(eachDataRecord);
    }
  });

  this.initialized = true;
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
  var recordDefer = new deferred();
  if(!this.initialized){
    return recordDefer.reject('oh snap! forgot to init source');
  }
  else if(!this.dataArray || this.dataArray.length ===0){
    return recordDefer.reject('Out of data');
  }
  else{
    var record = this.dataArray.shift();
    console.log("record passed from getnext");
    return recordDefer.resolve(record);
  }
};

readXmlData.prototype.end = function (){
  this.parser = null;
  this.initialized = false;
  this.dataArray = [];
  this.totalRecords = 0;
  this.recordsRead = 0;
  this.dataErrors = [];
  console.log("readXml data end is finished");
};


module.exports = exports = readXmlData;



// fs.readFile(config.masterDataDownloadPath,'utf8',function (err,data){
//   parser.parseString(data,function (err,result){
//     console.log(result['asx:abap']['asx:values'][0]['TAB'][0]);
//   });
// });
