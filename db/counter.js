var mongoose = require('mongoose');

function counter (){
  var schema = new mongoose.Schema({
      file_number    : { type : Number, default : 1 } , //some relation,
  });
  return schema;
};


module.exports = exports = counter;