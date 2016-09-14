var mongoose = require('mongoose');

function getSchema() {
    var schema = new mongoose.Schema({

        PARTNER         : { type : String }, // uid
        TYPE            : { type : String }, // member/employer type
        BPEXT           : { type : String }, // legacy/cmpfo (old)
        FULL_NAME       : { type : String }, // full name
        ZZTITLE1        : { type : String }, // designated person.
        ZZFULL_NAME     : { type : String }, // designated person name
        ZZDESIGNATION1  : { type : String }, // designation,
        CITY1           : { type : String }, // address1
        CITY2           : { type : String }, // address2
        POST_CODE1      : { type : String }, // postal code
        STREET          : { type : String }, // street number if any
        HOUSE_NUM1      : { type : String }, // house number
        STR_SUPPL1      : { type : String }, // street 2 if any
        COUNTRY         : { type : String }, // country
        REGION          : { type : String }, // region
        TEL_NUM         : { type : String }, // mobile number
        UPDATED_TEL_NUM : { type : String },
        EMAIL           : { type : String }, // email in provided data.
        UPDATED_EMAIL   : { type : String }, // user provided email.
        ADDHAR          : { type : String }, // addhar number
        PAN             : { type : String }, // pan number

        password        : { type: String }
    });
    return schema;
};

module.exports = exports = getSchema;
