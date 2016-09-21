var config = {
  httpServer : {
    port : 8000
  },

  SAP_FTP_SERVER : {
    host     : '59.90.31.81',
    port     : 21,
    user     : 'administrator',
    password : 'Ratnesh@123',
    keepalive: 1000,
  },

  masterDataDownloadPath  : '/Users/ashish/epfo/public/masterDataFiles/',
  masterDataFilePathOnSAP : '/masterDataFiles/',
  // masterDataFilePathOnSAP : 'file_name.xml',


  mongo : {
    host : 'localhost',
    port : '27017',
    database : 'test'
  },
  redis : "redis://localhost:6379",

  uploadFileDir : '/Users/ashish/epfo/public/uploads/'
};

module.exports = exports = config;