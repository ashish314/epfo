var mongoose = require('mongoose');

function getUploadedFileSchema (){
  var schema = new mongoose.Schema({
      user              : { type : mongoose.Schema.Types.ObjectId, ref: 'masterData'} , //some relation,
      uploaded_date     : { type : Number },
      year              : { type : String },
      month             : { type : String },
      status            : { type : String },          // uploaded
      sap_status        : { type : String },
      sap_status_date   : { type : Number },
      error_file_path   : { type : String },
      success_file_path : { type : String },
      file_number       : { type : Number }, // it has to be a integer.
      file_name         : { type : String },
      original_file_name: { type : String },
  });
  return schema;
};


module.exports = exports = getUploadedFileSchema;