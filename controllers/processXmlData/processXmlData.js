var deferred  = require('deferred');


// need to ensure that we do not insert duplicate records and update record data
// appropriately
function processXmlData(mongoObj){
  this.record = null;
  this.totalProcessed = 0;
  this.errors = 0;
  this.mongoObj = mongoObj;
};

processXmlData.prototype.init = function (){
  var initDefer = new deferred();
  return initDefer.resolve();
};

processXmlData.prototype.processRecord = function (record,options){
  var processDefer  = new deferred(),
      self          = this,
      updatedRecord = null;

  if(!record)
    return processDefer.reject("No data to process");

  else if(record){
    // check for the existing record
    // if present update fields
    // add status of processed record.
    
    self.mongoObj.masterDataModel.findOne({PARTNER:record.PARTNER})
    .exec(function (err,user){
      if(err){
        console.log(err);
        processDefer.reject(err);
      }
      else if (!user){
        // no user found
        return processDefer.resolve({data:record,existing:false});
      }
      else{
        // user found now update its record.
        var fieldsToUpdate = ['FULL_NAME', 'ZZFULL_NAME', 'EMAIL'];
        fieldsToUpdate.forEach(function (eachField){
          if(record[eachField] != user[eachField]){
            user[eachField] = record[eachField];
          }
        });

        user.save(function (err){
          if(err){
            console.log(err);
            processDefer.reject(err);
          }
          else{
            return processDefer.resolve({data:user,existing : true});
          }
        });
      }
    });
    return processDefer.promise;
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

