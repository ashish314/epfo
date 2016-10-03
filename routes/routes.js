// All the routes for the application will be here

var EXPRESS               = require('express'),
    ROUTER                = EXPRESS.Router(),
    _                     = require('lodash'),
    sha1                  = require('sha1'),
    inWordsEn             = require('in-words').en,
    REQUEST               = require('request'),
    deferred              = require('deferred'),
    csvParser             = require('csv-parser'),
    authenticate          = require(__dirname + '/../controllers/userAuthentication/userAuthentication.js'),
    multer                = require('multer'),
    config                = require(__dirname + '/../config.js'),
    ftp                   = require(__dirname + '/../controllers/ftpFetcher.js')(),
    fs                    = require('fs'),
    xml2js                = require('xml2js'),
    parser                = new xml2js.Parser(),
    mongoObj              = require(__dirname + '/../controllers/mongo.js')();


var multerOpts = {
  storage : multer.diskStorage({
    destination    : function (req, file, cb) {
      var uploadPath = config.uploadFileDir;
      cb(null, uploadPath)
    },

    filename   : function (req, file, cb) {
      cb(null,file.originalname)
    }
  }),
  fileFilter   : function (req, file, cb) {
    // console.log("came in fileFilter");
    var fileExtension = file.originalname.slice(-4).toLowerCase();
    if(fileExtension != '.csv')
      cb("only csv files are allowed",false);   // pass false to this if file needs to be rejected.
    else
      cb(null,true);
  }
};

var upload = multer(multerOpts);

 

function apiRoutes (){
  this.router      = null;
  this.mongoObj    = null;
  this.initialized = false;
};

apiRoutes.prototype.init = function (){
  var initDefer = new deferred(),
      self      = this;

  if(!this.router)
    this.router = EXPRESS.Router();

  if(!this.mongoObj){
    mongoObj.init()
    .then(function (){
      self.mongoObj = mongoObj;
      // register routes and their controller functions
      // main logic routes.
      self.router.get('/'               , self.homepage.bind(self));
      self.router.post('/signupEmployer', self.signUpEmployer.bind(self));
      self.router.post('/signupMember'  , self.signUpMember.bind(self));
      self.router.post('/signinEmployer', self.signInEmployer.bind(self));
      self.router.post('/signinMember'  , self.signInMember.bind(self));
      self.router.post('/uploadFile'    , upload.single('testFile'), self.uploadFile.bind(self));
      self.router.get('/landingPage/:uid'    , self.landingPage.bind(self));
      self.router.get('/logout'         , self.logout.bind(self));
      self.router.get('/error_file_download/:file_number', self.errorFileDownload.bind(self));
      self.router.get('/success_file_download/:file_number', self.successFileDownload.bind(self));
      self.router.get('/download_vv_form_sample', self.download_vv_form_sample.bind(self));
      self.router.get('/form_summary', self.formSummary.bind(self));
      self.router.post('/updateProfile',self.updateProfile.bind(self));
      self.router.get('/autoFill'       , self.autoFillForm.bind(self));
      self.router.get('/viewProfile/:uid'    , self.viewProfile.bind(self));

      // routes for rendering pages
      self.router.get('/signup_employer', self.signup_employer.bind(self)); // render
      self.router.get('/signup_member'  , self.signup_member.bind(self));   // render
      self.router.get('/signin_employer' , self.signin_employer.bind(self));
      self.router.get('/signin_member'   , self.signin_member.bind(self));
      initDefer.resolve();

    },function (err){
      initDefer.reject(err);
    });
  }

  return initDefer.promise;
};


function checkValid(searchObj,pan,cb){
  this.mongoObj.masterDataModel.findOne(searchObj,function (err,user,message){
    if(err)
      cb(err,false,false);

    else if(!user){
      cb(null,false,false);
    }
    else{
      if(user.PAN  === pan) 
        cb(null,true,'Pan is already registered');
      else{
        cb(null,true,'Addhar is already registered');
      }
    }
  });
};

function query_on_uid_or_legacy(uid,legacy_number,bpkind,cb){
  var self      = this;
  if(uid){
    self.mongoObj.masterDataModel.findOne({PARTNER : uid,BPKIND:bpkind})
    .lean()
    .exec(function (err,user){
      if(err || !user){
        return cb(err,null);
      }
      else if (user && bpkind === '0001'){
        self.mongoObj.masterDataModel.findOne({PARTNER : user.REGUNIT})
        .lean()
        .exec(function (err,employer){
          if(err || !employer){
            user.employer_name = 'blank';
            return cb(err,user);
          }
          else{
            user.employer_name = employer.FULL_NAME || 'blank';
            return cb(err,user);
          }
        });
      }
      else{
        return cb(err,user);
      }
    });
  }

  else if(legacy_number){
    self.mongoObj.masterDataModel.findOne({BPEXT : legacy_number,BPKIND:bpkind})
    .lean()
    .exec(function (err,user){
      if(err || !user){
        return cb(err,null);
      }
      else if(user && bpkind === '0001'){
        self.mongoObj.masterDataModel.findOne({PARTNER : user.REGUNIT})
        .lean()
        .exec(function (err,employer){
          if(err || !employer){
            user.employer_name = 'blank';
            return cb(err,user);
          }
          else{
            user.employer_name = employer.FULL_NAME || 'blank';
            return cb(err,user);
          }
        });
      }
      else{
        return cb(err,user);
      }
    });
  }
};

function csvToJson(filePath,resultArray,cb){
  fs.createReadStream(filePath)
  .pipe(csvParser())
  .on('data', function (data) {
    resultArray.push(data);
  })
  .on('error', function (err){
    cb(err,null);
  })
  .on('end',function (){
    cb(null,resultArray);
  });
};

apiRoutes.prototype.updateProfile = function (req,res,next){
  if(!req.user){
    return res.redirect(307,'/');
  }

  var self = this,
      fieldsToUpdate = {},
      requiredFields = ['mobile' , 'email' ,'new_password','confirm_password'];

  for(var i =0 ;i< requiredFields.length ; i++){
    if(req.body[requiredFields[i]]){
      fieldsToUpdate[requiredFields[i]] = req.body[requiredFields[i]];
    }
  } 

  if(req.body.new_password && req.body.new_password != req.body.confirm_password){
    return self.errorResponse(res,400,"Passwords do not match");
  }

  self.mongoObj.masterDataModel.findOne({PARTNER : req.user.PARTNER})
  .exec(function (err,user){
    if(err){
      return self.errorResponse(res,400,"Internal server error");
    }
    else{
      user.UPDATED_EMAIL    = req.body.email  || user.UPDATED_EMAIL;
      user.UPDATED_TEL_NUM  = req.body.mobile || user.UPDATED_TEL_NUM;
      
      if(req.body.new_password){
        user.password = sha1(req.body.new_password);
      }

      user.save(function (err){
        if(err){
          return self.errorResponse(res,400,"Internal server error");
        }
        else{
          return self.successResponse(res,200,"success",user);
        }
      });
    }
  });
};

apiRoutes.prototype.logout = function (req,res,next){
  if(!req.user){
    return this.errorResponse(res,400,"user not logged in");
  }
  else {
    req.logout();
    return res.redirect(307,'/');
  }
};

apiRoutes.prototype.landingPage = function (req,res,next){
  if(!req.user || !req.params.uid){
    return res.redirect('/');
  }
  else{
    // user is authenticated
    var self = this;
    this.mongoObj.masterDataModel.findOne({PARTNER : req.params.uid})
    .lean()
    .exec(function (err,user){
      if(err){
        return self.errorResponse(res,500,'Internal Server error');
      }
      else if (!user){
        return self.errorResponse(res,404,'User not found');
      }
      else{
        var result = {};
        result.user = user;

        if(user.BPKIND === '0003')
          return res.render(__dirname + '/../public/landing_page.ejs',result);
        else
          return res.render(__dirname + '/../public/member_landing.ejs',result);
      }
    });
  }
};

function createCounter(cb){
  var self = this;

  this.mongoObj.counterModel.findOne({},function (err,counter){
    if(err)
      return cb(err,null);
    else if(!counter){
      self.mongoObj.counterModel.create({},function (err,counter){
        if(err)
          return cb(err,null);

        else{
          return cb(null,counter);
        }
      });
    }
    else{
      return cb(null,counter);
    } 
  });
};

apiRoutes.prototype.viewProfile = function (req,res,next){
  var self = this;

  if(!req.user || req.user.PARTNER != req.params.uid){
    return res.redirect(307,'/');
  }
  else{
    this.mongoObj.masterDataModel.findOne({PARTNER : req.params.uid})
    .exec(function (err,user){
      if(err)
        return self.errorResponse(res,500,'Internal Server Error');

      else if(!user){
        return self.errorResponse(res,404,"User not found");
      }
      else{
        var result = {};
        result.user = user;
        return res.render(__dirname + '/../public/viewProfile.ejs',result);
      }
    });
  }
};  

apiRoutes.prototype.uploadFile = function (req,res,next){
  // if not logged in return 400.
  if(!req.user || req.user.BPKIND != '0003'){
    return this.errorResponse(res,400,'user not authorized');
  }
  else if(!req.file){
    return this.errorResponse(res,400,'No file selected');
  }
  
  var self = this;
  if(!req.file){
    return this.errorResponse(res,400,"No file selected");
  }

  csvToJson(req.file.path,[],function (err,resultArray){
    if(err){
      console.log(err);
      return self.errorResponse(res,400,"Some error occured in file");
    }
    else if(resultArray.length === 0){
      return self.errorResponse(res,400,"File cannot be empty");
    }
    else if(resultArray.length < 4){
      return self.errorResponse(res,400,"Please check the file format");
    }
    else{
      resultArray.splice(0,3);
      for(var i = 0 ; i < resultArray.length ; i++){

        if(!resultArray[i].Year || !resultArray[i].Month || 
            resultArray[i].Year != req.body.year || resultArray[i].Month != req.body.month){

          fs.unlinkSync(req.file.path);
          return self.errorResponse(res,400,"Please check Year and Month in file");
          break;
        }
      }
      // increment counter and create a entry in uploadFile
      createCounter.bind(self)(function (err,counter){
        var uploadFile = new self.mongoObj.uploadedFileModel();
        uploadFile.user               = req.user._id;
        uploadFile.uploaded_date      = Date.now();
        uploadFile.year               = req.body.year;
        uploadFile.month              = req.body.month;
        uploadFile.status             = 'uploaded';
        uploadFile.sap_status         = 'pending';
        uploadFile.file_number        = counter.file_number;
        uploadFile.file_name          = String(counter.file_number)+'_'+String(req.user.PARTNER);
        uploadFile.original_file_name = String(req.file.originalname);

        uploadFile.save(function (err){
          if(err)
            self.errorResponse(res,500,"Internal server error");

          counter.file_number = counter.file_number + 1;
          counter.save(function (err){
            if(err)
              self.errorResponse(res,500,"Internal server error");

            ftp.uploadFile(req.file.path, '/vv_forms/'+uploadFile.file_name)
            .then(function (){
              self.successResponse(res,200,"success","File upload successfully");
            },function (err){
              console.log(err);
              self.errorResponse(res,400,"failed to upload");
            });
          })
        });
      });
    }
  });
};

apiRoutes.prototype.signInEmployer = function (req,res,next){
  var self = this;
  if(_.isEmpty(req.body)){
    return this.errorResponse(res,400,"Required fields are blank");
  }
  else if(!req.body.uid && !req.body.legacy_number || !req.body.password ){
    return self.errorResponse(res,400,"Mandatory fields cannot be blank");
  }
  else if(req.user){
    return this.errorResponse(res,400,"already Logged in");
  }
  else{
    req.body.bpkind = '0003';   // we can have frontend pass this value as well.
    req.body.loginField = 'blank';
    authenticate(req,res,next,function (err,user){
      if(err){
        return self.errorResponse(res,400,err);
      }
      else{
        return self.successResponse(res,200,"logged in successfully",user);
      }
    });
  }
};

apiRoutes.prototype.signInMember = function (req,res,next){
  var self = this;
  if(_.isEmpty(req.body)){
    return this.errorResponse(res,400,"Required fields are blank");
  }
  else if(!req.body.uid && !req.body.legacy_number || !req.body.password ){
    return self.errorResponse(res,400,"Mandatory fields cannot be blank");
  }
  else if(req.user){
    return this.errorResponse(res,400,"already Logged in");
  }
  else{
    req.body.bpkind = '0001';   // type of user.
    req.body.loginField = 'blank';
    authenticate(req,res,next,function (err,user){
      if(err){
        return self.errorResponse(res,400,err);
      }
      else{
        return self.successResponse(res,200,"logged in successfully",user);
      }
    });
  }
};

apiRoutes.prototype.errorFileDownload = function (req,res,next){
  // 1. user must be looged in and bpkind === 0003
  // 2. check on file number provided, and match user id as well.
  // 3. if file is present present it for download other wise error.
  // 4. need to handle success file also.
  var self        = this,
      file_number = req.params.file_number;

  if(!req.user){
   return self.errorResponse(res,400,"User should be logged in");
  }

  self.mongoObj.uploadedFileModel.findOne({file_number : file_number})
  .exec(function (err,fileInfo){
    if(err){
      return self.errorResponse(res,500,"Internal server error");
    }
    else if(!fileInfo){
      return self.errorResponse(res,404,'File info not found');
    }
    else if(fileInfo && fileInfo.sap_status != 'error'){
      return self.errorResponse(res,404,'No error generated yet');
    }
    else{
      return res.download(fileInfo.error_file_path);
      // return res.download(__dirname + '/../public/vv_form_response/test.txt');
    }
  });
};

apiRoutes.prototype.download_vv_form_sample = function (req,res,next) {
  var self = this;

  if(!req.user){
    return res.redirect(307,'/');
  }

  else{
    return res.download(config.vv_form_sample_download_path);
  }
};

apiRoutes.prototype.successFileDownload = function (req,res,next) {
  var self        = this,
      file_number = req.params.file_number;

  if(!req.user){
    return self.errorResponse(res,400,"User should be logged in");
  }

  self.mongoObj.uploadedFileModel.findOne({file_number : file_number})
  .populate('user')
  .exec(function (err,fileInfo){
    if(err){
      return self.errorResponse(res,500,"Internal server error");
    }
    else if(!fileInfo){
      return self.errorResponse(res,404,'File info not found');
    }
    else if(fileInfo && fileInfo.sap_status != 'success'){
      return self.errorResponse(res,404,'No success generated yet');
    }
    else{
      var contents = fs.readFileSync(fileInfo.success_file_path,'utf8');
      // var contents = fs.readFileSync(__dirname + '/../public/vv_form_response/test.xml','utf8');
      parser.parseString(contents,function (err,data){
        var parsedData = data['asx:abap']['asx:values'][0]['TAB'][0]['FINAL'][0];
        var updatedJson = {};
        var currentMonth  = new Date().getMonth() + 1;
        var currentYear   = new Date().getYear();
        var lastDate      = new Date(currentYear,currentMonth,0);  

        updatedJson.PROCESSID = parsedData.PROCESSID[0];
        updatedJson.STATUS    = parsedData.STATUS[0];
        updatedJson.REGUNIT   = parsedData.REGUNIT[0];
        updatedJson.REXTNO    = parsedData.REXTNO[0];
        updatedJson.TEMOL     = parsedData.TEMOL[0];
        updatedJson.NSALARY   = parsedData.NSALARY[0];
        updatedJson.ONEINC    = parsedData.ONEINC[0];
        updatedJson.PFC_VC    = parsedData.PFC_VC[0];
        updatedJson.PFC_MEM   = parsedData.PFC_MEM[0];
        updatedJson.PFC_EMP   = parsedData.PFC_EMP[0];
        updatedJson.PC_MEM    = parsedData.PC_MEM[0];
        updatedJson.PC_EMP    = parsedData.PC_EMP[0]; 
        updatedJson.TWP_PER   = parsedData.TWP_PER[0];
        updatedJson.PF_CONT   = parsedData.PF_CONT[0];
        updatedJson.PS_CONT   = parsedData.PS_CONT[0];
        updatedJson.ADM_CHG   = parsedData.ADM_CHG[0];
        updatedJson.TOT_CONT  = parsedData.TOT_CONT[0];
        updatedJson.ZYEAR     = parsedData.ZYEAR[0];
        updatedJson.ZMONTH    = parsedData.ZMONTH[0];
        updatedJson.CUR_TYPE  = parsedData.CUR_TYPE[0];
        updatedJson.ENT_DATE  = lastDate.getDay() + '-' + lastDate.getMonth() + '-' + lastDate.getYear();
        updatedJson.XBLNR     = parsedData.XBLNR[0];
        updatedJson.UNIT_NAME = fileInfo.user.FULL_NAME;
        updatedJson.FULL_NAME = fileInfo.user.FULL_NAME;
        updatedJson.PF_SUM    = (parseFloat(updatedJson.PFC_MEM) + parseFloat(updatedJson.PFC_EMP)).toFixed(2);
        updatedJson.PC_SUM    = (parseFloat(updatedJson.PC_MEM) + parseFloat(updatedJson.PC_EMP)).toFixed(2);
        updatedJson.PC_SUM    = (parseFloat(updatedJson.PC_MEM) + parseFloat(updatedJson.PC_EMP)).toFixed(2);
        updatedJson.AMT_WORDS = inWordsEn(updatedJson.TOT_CONT);

        return res.render(__dirname + '/../public/challan.ejs',updatedJson);  

      });
    }
  }); 
};

apiRoutes.prototype.formSummary = function (req,res,next){
  var self = this;

  if(!req.user){
    return res.redirect(307,'/');
  }
  var partner = req.user.PARTNER;

  self.mongoObj.uploadedFileModel.find({user : req.user._id})
  .exec(function (err,data){
    if(err)
      return self.errorResponse(res,500,"Internal server error");
    else{
      var result = {
        user : null,
        filesInfo : null
      };

      result.user = req.user;

      if(!data)
        result.filesInfo = [];

      if(data)
        result.filesInfo = data;

      return res.render(__dirname+'/../public/form_summary.ejs',result);
    }
  }); 
};

apiRoutes.prototype.homepage = function (req,res,next) {
    if(req.user)
      return res.redirect(307,'/landingPage/'+req.user.PARTNER);
  
    else{
      return res.render(__dirname + '/../public/homepage.html');
    }
};

apiRoutes.prototype.autoFillForm = function (req,res,next){
  // will be used to fetch details for signup form.
  // in body we will get uid or cmpfo need to provide name,address.
  if(_.isEmpty(req.query) &&_.isEmpty(req.query.uid) && _.isEmpty(req.query.legacy_number)){
    return this.errorResponse(res,404,"uid or legacy number is required");
  }

  if(_.isEmpty(req.query.bpkind)){
    return this.errorResponse(res,400,"User type is not specified");
  }

  var uid           = req.query.uid,
      legacy_number = req.query.legacy_number,
      bpkind        = req.query.bpkind,
      self          = this;

  query_on_uid_or_legacy.bind(this)(uid,legacy_number,bpkind,function (err,user){
    if(err){
      return self.errorResponse(res,500,'Internal server error');
    }
    else if(_.isEmpty(user)){
     return self.errorResponse(res,404,'uid or legacy number not valid'); 
    }
    else{
      return self.successResponse(res,200,'successful',user);
    }
  });
};

apiRoutes.prototype.signup_employer = function (req,res,next){
  return res.render(__dirname + '/../public/employer.html');
};

apiRoutes.prototype.signup_member = function (req,res,next){
  return res.render(__dirname + '/../public/member.html');
};

apiRoutes.prototype.signin_employer = function (req,res,next){
  return res.render(__dirname + '/../public/employer_login.html');
};

apiRoutes.prototype.signin_member = function (req,res,next){
  return res.render(__dirname + '/../public/member_login.html');
}

apiRoutes.prototype.signUpEmployer = function (req,res,next){
  var self = this;
  var requiredFields = ['uid','legacy_number','name','pan','email','mobile','password'];
  req.body.bpkind    = '0003';
  var bodyParams     = req.body;
  var missingParam   = null;

  if(!bodyParams){
      return self.errorResponse(res,400,"Invalid request");
  }
  for (var i = 0 ; i < requiredFields.length ; i++){
    if(!bodyParams[requiredFields[i]] || _.isEmpty(bodyParams[requiredFields[i]])){
      return self.errorResponse(res,400,requiredFields[i] + ' is required');
      break;
    }
  }
  
  checkValid.bind(this)({PAN : bodyParams.pan},bodyParams.pan,function (err,found,message){
    if(err)
      return self.errorResponse(res,500,"Internal server error");
    else if(found)
      return self.errorResponse(res,400,message);
    else{
      self.mongoObj.masterDataModel.findOne({PARTNER : bodyParams.uid, BPKIND : '0003'})
      .exec(function (err,user){
        if(err){
          return self.errorResponse(res,500,"Internal server error");
        }
        else if(!user || _.isEmpty(user) ){
          return self.errorResponse(res,404,"User not found");
        }
        else if(user && user.password){
          return self.errorResponse(res,400,"User already signed up");
        }
        else if(user.PAN && bodyParams.pan != user.PAN){
          return self.errorResponse(res,400,"Pan number do not match");
        }
        else{
          user.UPDATED_TEL_NUM = req.body['mobile'] || null;
          user.UPDATED_EMAIL   = req.body['email']  || null;
          user.password        = sha1(req.body['password']);
          user.PAN             = bodyParams.pan;
          user.save(function (err){
            if(err){
              return self.errorResponse(res,500,"Internal server error");
            }
            else{
              req.login(user,function (err){
                if(err){
                  return self.errorResponse(res,500,"Server error");
                }
                else{
                  return self.successResponse(res,200,"success",user);
                }
              });
            }
          });
        }
      });
    }
  });
};

apiRoutes.prototype.signUpMember = function (req,res,next){
  var self = this;
  var requiredFields = ['uid','legacy_number','email','password','mobile','name','pan','employer_name','addhar'];
  req.body.bpkind    = '0001';
  var bodyParams     = req.body;
  if(!bodyParams){
      return self.errorResponse(res,400,"Invalid request");
    }

  for (var i = 0 ; i < requiredFields.length ; i++){
    if(!bodyParams[requiredFields[i]] || _.isEmpty(bodyParams[requiredFields[i]])){
      return self.errorResponse(res,400,requiredFields[i] + ' is required');
      break;
    }
  } 
  var search = {$or :[{'PAN' : bodyParams.pan},{'ADDHAR' : bodyParams.addhar}] };
  checkValid.bind(this)(search,bodyParams.pan,function (err,found,message){
    if(err)
      return self.errorResponse(res,500,"Internal server error");
    else if(found){
      return self.errorResponse(res,400,message);
    }
    else{
      self.mongoObj.masterDataModel.findOne({PARTNER : bodyParams.uid, BPKIND : '0001'})
      .exec(function (err,user){
        if(err){
          return self.errorResponse(res,500,"Internal server error");
        }
        else if(!user || _.isEmpty(user) ){
          return self.errorResponse(res,404,"User not found");
        }
        else if(user && user.password){
          return self.errorResponse(res,400,"User already signed up");
        }
        else if(user.PAN && user.PAN != bodyParams.pan){
          return self.errorResponse(res,400,"Pan number do not match");
        }
        else if(user.ADDHAR && user.ADDHAR != bodyParams.ADDHAR){
          return self.errorResponse(res,400,"Addhar number do not match");
        }
        else{
          user.UPDATED_TEL_NUM = req.body['mobile'] || null;
          user.UPDATED_EMAIL   = req.body['email']  || null;
          user.password        = sha1(req.body['password']);
          user.PAN             = bodyParams.pan;
          user.ADDHAR          = bodyParams.addhar;
          user.save(function (err){
            if(err){
              return self.errorResponse(res,500,"Internal server error");
            }
            else{
              req.login(user,function (err){
                if(err){
                  return self.errorResponse(res,500,"Server error");
                }
                else{
                  return self.successResponse(res,200,"success",user);
                }
              });
            }
          });
        }
      });
    }
  });
};

apiRoutes.prototype.errorResponse = function (res,httpStatus,errorMessage){
  var wrapper = {
    status : 'FAILURE',
    message: errorMessage,
    result : {}
  };

  return res.status(httpStatus).json(wrapper);
};

apiRoutes.prototype.successResponse = function (res,httpStatus,successMessage,body){
  var wrapper = {
    status : 'SUCCESS',
    message: successMessage,
    result : body
  };

  return res.status(httpStatus).json(wrapper);
};

var routerObj = null;

var getRouterObj = function (){
  if(!routerObj){
    routerObj = new apiRoutes();
  }
  return routerObj;
};


module.exports = exports = getRouterObj;