var mongoose = require('mongoose');

function getSchema() {
  var schema = new mongoose.Schema({
    PARTNER   : {type : String},
    TYPE      : {type : String},
    BPKIND    : {type : String},
  });
  return schema;
};

module.exports = exports = getSchema;