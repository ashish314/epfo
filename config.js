var config = {
  httpServer : {
    port : 8000
  },

  SAP_FTP_SERVER : {
    host     : '59.90.31.81',
    port     : 21,
    user     : 'administrator',
    password : 'Ratnesh@123'
  },

  masterDataDownloadPath  : '/Users/ashish/epfo/public/masterDataFiles/file_name.xml',
  masterDataFilePathOnSAP : 'file_name.xml',

  mongo : {
    host : 'localhost',
    port : '27017',
    database : 'test'
  }
};

module.exports = exports = config;