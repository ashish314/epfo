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
  masterDataFilePathOnSAP : 'BUT000_20160914155621.xml',
  // masterDataFilePathOnSAP : 'file_name.xml',


  mongo : {
    host : 'localhost',
    port : '27017',
    database : 'test'
  },
  redis : "redis://localhost:6379",
};

module.exports = exports = config;