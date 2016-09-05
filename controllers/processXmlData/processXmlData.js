var deferred  = require('deferred');

function processXmlData(){
  this.record = null;
  this.totalProcessed = 0;
  this.errors = 0;
};

processXmlData.prototype.init = function (){
  var initDefer = new deferred();
  return defer.resolve();
};

processXmlData.prototype.processRecord = function (record,options){
  var processDefer = new deferred();
  if(!record)
    return processDefer.reject("No data to process");

  else if(record){
    this.record = record;
    this.totalProcessed++;
    return processDefer.resolve();
  }
};

processXmlData.prototype.end = function (){
  console.log("End of processXmlData called");
  console.log("totalProcessed : "+this.totalProcessed);
  console.log("totalErrors : "+this.errors);
  this.record = null;
  this.totalProcessed = 0;
  this.errors = 0;
};


module.exports = exports = processXmlData;

