var fs      = require('fs'),
    xml2js  = require('xml2js'),
    deferred= require('deferred'),
    parser  = new xml2js.Parser(),
    config  = require(__dirname + '/../../config.js');

function readXmlData(){
  this.filePath     = config.masterDataDownloadPath;
  this.parser       = null;
  this.initialized  = false;
  this.dataArray    = [];
  this.totalRecords = 0;
  this.recordsRead  = 0;
  this.dataErrors   = [];
};

readXmlData.requiredKeys = {
  'BP' : '',
  'TYPE'    : '',
  'BPKIND'  : '',
};

readXmlData.prototype.init = function() {
  var self  = this,
      defer = new deferred();

  if(!this.parser)
    this.parser = new xml2js.Parser();

  // now read file.
  console.log(this.filePath);
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
  var self            = this;
  // ensure xml data is in correct format.
  try {
    data = data['asx:abap']['asx:values'][0]['TAB'][0]['FINAL'];
  }
  catch(e){
    return defer.reject("XML data format issues");
  }

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
  
  self.totalRecords = self.dataArray.length;
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
//     console.log(result['asx:abap']['asx:values'][0]['TAB'][0]['FINAL']);
//   });
// });
