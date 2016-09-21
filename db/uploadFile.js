var mongoose = require('mongoose');

function getUploadedFileSchema (){
  var schema = new mongoose.Schema({
      user              : { type : Number, ref: 'masterData'} , //some relation,
      uploaded_date     : { type : Number },
      year              : { type : Number },
      month             : { type : Number },
      status            : { type : String },          // uploaded
      sap_status        : { type : String },
      sap_status_date   : { type : Number },
      file_number       : { type : Number , ref : 'counter'}, // it has to be a integer.
      file_name         : { type : String },
  });
  return schema;
};


module.exports = exports = getUploadedFileSchema;