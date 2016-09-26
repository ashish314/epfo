var config = {
  httpServer : {
    port : 8000
  },

  SAP_FTP_SERVER : {
    host     : '59.90.215.47',
    port     : 21,
    user     : 'administrator',
    password : 'Ratnesh@123',
    keepalive: 1000,
  },

  masterDataDownloadPath  : '/Users/ashish/epfo/public/masterDataFiles/',
  masterDataFilePathOnSAP : '/masterDataFiles/',


  mongo : {
    host : 'localhost',
    port : '27017',
    database : 'test'
  },
  redis : "redis://localhost:6379",

  sap_vv_response_path : './vv_form_response/',
  uploadFileDir : '/Users/ashish/epfo/public/uploads/',
  vv_form_response : '/Users/ashish/epfo/public/vv_form_response/',

};

module.exports = exports = config;