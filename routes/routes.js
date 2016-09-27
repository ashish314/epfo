// All the routes for the application will be here

var EXPRESS               = require('express'),
    ROUTER                = EXPRESS.Router(),
    _                     = require('lodash'),
    sha1                  = require('sha1'),
    REQUEST               = require('request'),
    deferred              = require('deferred'),
    authenticate          = require(__dirname + '/../controllers/userAuthentication/userAuthentication.js'),
    multer                = require('multer'),
    config                = require(__dirname + '/../config.js'),
    ftp                   = require(__dirname + '/../controllers/ftpFetcher.js')(),
    mongoObj              = require(__dirname + '/../controllers/mongo.js')();


var multerOpts = {
  storage : multer.diskStorage({
    destination    : function (req, file, cb) {
      var uploadPath = config.uploadFileDir;
      cb(null, uploadPath)
    },

    filename   : function (req, file, cb) {
      // console.log("came in filename");
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
      self.router.get('/download_file/:file_number', self.fileDownload.bind(self));
      self.router.get('/form_summary', self.formSummary.bind(self));
      self.router.get('/autoFill'       , self.autoFillForm.bind(self));
      self.router.get('/logout'         , self.logout.bind(self));

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


apiRoutes.prototype.logout = function (req,res,next){
  if(!req.user){
    return this.errorResponse(res,400,"user not logged in");
  }
  else {
    req.logout();
    return this.successResponse(res,200,'success',"user logged out");
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

        return res.render(__dirname + '/../public/landing_page.ejs',result);
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

apiRoutes.prototype.uploadFile = function (req,res,next){
  // if not logged in return 400.
  if(!req.user || req.user.BPKIND != '0003'){
    return this.errorResponse(res,400,'user not authorized');
  }
  // else if(!req.files){
  //   return this.errorResponse(res,400,'No file selected');
  // }
  // add a check for allowed file types as well.
  var self = this;
  if(!req.file){
    return this.errorResponse(res,400,"No file selected");
  }

  // increment counter and create a entry in uploadFile
  createCounter.bind(this)(function (err,counter){
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

apiRoutes.prototype.fileDownload = function (req,res,next){
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
    else{
      return res.download(__dirname+'/../test.js');
    }
  });

};

apiRoutes.prototype.formSummary = function (req,res,next){
  var self = this;

  if(!req.user)
    return self.errorResponse(res,400,"User should be looged in");

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

      return res.render('__dirname'+'/../public/form_summary.html',result);
    }
  }); 
};

apiRoutes.prototype.logout = function (req,res,next) {
  if(!req.user){
    this.errorResponse(res,400,"user not logged in");
  }
  else{
    req.logout();
    return this.successResponse(res,200,'Logged out successfully');
  }
};

apiRoutes.prototype.homepage = function (req,res,next) {
  console.log("came here on homepage");
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
  var requiredFields = ['uid','legacy_number','email','password','mobile','name','pan',];
  req.body.bpkind    = '0003';
  var bodyParams     = req.body;
  if(!bodyParams){
      return self.errorResponse(res,400,"Invalid request");
    }
  requiredFields.forEach(function (eachField){
    if(!bodyParams[eachField] || _.isEmpty(bodyParams[eachField])){
      console.log(eachField);
      return self.errorResponse(res,400,bodyParams[eachField]+' is required');
    }
  }); 

  this.mongoObj.masterDataModel.findOne({PARTNER : bodyParams.uid, BPKIND : '0003'})
  .exec(function (err,user){
    if(err){
      return self.errorResponse(res,500,"Internal server error");
    }
    else if(!user || _.isEmpty(user) ){
      return self.errorResponse(res,404,"User not found");
    }
    // else if(user && user.password){
    //   return self.errorResponse(res,400,"User already signed up");
    // }
    else{
      user.UPDATED_TEL_NUM = req.body['mobile'] || null;
      user.UPDATED_EMAIL   = req.body['email']  || null;
      user.password        = sha1(req.body['password']);
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
};

apiRoutes.prototype.signUpMember = function (req,res,next){
  var self = this;
  var requiredFields = ['uid','legacy_number','email','password','mobile','name','pan','employer_name'];
  req.body.bpkind    = '0001';
  var bodyParams     = req.body;
  if(!bodyParams){
      return self.errorResponse(res,400,"Invalid request");
    }

  requiredFields.forEach(function (eachField){
    if(!bodyParams[eachField] || _.isEmpty(bodyParams[eachField])){
      return self.errorResponse(res,400,bodyParams[eachField]+' is required');
    }
  }); 

  this.mongoObj.masterDataModel.findOne({PARTNER : bodyParams.uid, BPKIND : '0001'})
  .exec(function (err,user){
    if(err){
      return self.errorResponse(res,500,"Internal server error");
    }
    else if(!user || _.isEmpty(user) ){
      return self.errorResponse(res,404,"User not found");
    }
    // else if(user && user.password){
    //   return self.errorResponse(res,400,"User already signed up");
    // }
    else{
      user.UPDATED_TEL_NUM = req.body['mobile'] || null;
      user.UPDATED_EMAIL   = req.body['email']  || null;
      user.password        = sha1(req.body['password']);
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