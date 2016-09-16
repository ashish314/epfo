// All the routes for the application will be here

var EXPRESS               = require('express'),
    ROUTER                = EXPRESS.Router(),
    _                     = require('lodash'),
    sha1                  = require('sha1'),
    REQUEST               = require('request'),
    deferred              = require('deferred'),
    authenticate          = require(__dirname + '/../controllers/userAuthentication/userAuthentication.js'),
    mongoObj              = require(__dirname + '/../controllers/mongo.js')();

function apiRoutes (){
  this.router   = null;
  this.mongoObj = null;
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
      self.router.post('/signupMember'  , self.signUpMenber.bind(self));
      self.router.post('/signinEmployer', self.signInEmployer.bind(self));
      self.router.post('/signinMember'  , self.signInMember.bind(self));

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


function query_on_uid_or_legacy(uid,legacy_number,type,cb){
  var self      = this;
  if(uid){
    self.mongoObj.masterDataModel.findOne({PARTNER : uid,TYPE:type})
    .lean()
    .exec(function (err,user){
      if(err || !user ||_.isEmpty(user)){
        return cb(err,user);
      }
      else if (user && type === '1'){
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
    self.mongoObj.masterDataModel.findOne({BPEXT : legacy_number,TYPE:type})
    .lean()
    .exec(function (err,user){
      if(err || _.isEmpty(user)){
        return cb(err,user);
      }
      else if(user && type === '1'){
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

function getUid(uid,legacy_number,type,cb){
  if(uid){
    return cb(null,uid);
  }
  else if(!uid && !legacy_number){
    return cb(null,false);
  }
  else{
    this.mongoObj.masterDataModel.findOne({BPEXT : legacy_number,TYPE : type})
    .lean()
    .exec(function (err,user){
      if(err){
        return (err,false);
      }
      
    });
  }
}

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
    req.body.type = 3;
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
    req.body.type = 1;
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

  if(_.isEmpty(req.query.type)){
    return this.errorResponse(res,400,"User type is not specified");
  }

  var uid           = req.query.uid,
      legacy_number = req.query.legacy_number,
      type          = req.query.type,
      self          = this;

  query_on_uid_or_legacy.bind(this)(uid,legacy_number,type,function (err,user){
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

  if(_.isEmpty(req.body)){
    return this.errorResponse(res,400,"Required fields are blank");
  }
  if(_.isEmpty(req.body.uid)){
    return this.errorResponse(res,400,"Uid cannot be blank");
  }
  if(_.isEmpty(req.body.email)){
    return this.errorResponse(res,400,"Email cannot be blank");
  }
  if(_.isEmpty(req.body.password)){
    return this.errorResponse(res,400,"Password cannot be blank");
  }
  if(_.isEmpty(req.body.mobile)){
    return this.errorResponse(res,400,"Mobile cannot be blank");
  }
  if(!this.mongoObj){
    return this.errorResponse(res,500,'Internal server error');
  }
  var uid      = req.body.uid,
      password = req.body.password,
      email    = req.body.email,
      mobile   = req.body.mobile,
      self     = this;

  // check for these details in database.
  this.mongoObj.masterDataModel.findOne({PARTNER : uid,TYPE : 1},function (err,result){
    if(err){
      return self.errorResponse(res,500,'Internal server error');
    }
    else if(!_.isEmpty(result)){
      return self.errorResponse(res,400,'Uid is already occupied');
    }
    else if(result && result.password){
      return self.errorResponse(res,400,'User already signed up');
    }
    else{
      // now update fields in db.
      result.UPDATED_TEL_NUM = mobile;
      result.UPDATED_EMAIL   = email;
      result.password        = sha1(password);
      result.save(function (err){
        if(err){
          return self.errorResponse(res , 500 ,'Internal server error');
        }
        else{
          req.login(user,function (err){
            if(err){
              return self.errorResponse(res,500,'Server Error');
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

apiRoutes.prototype.signUpMenber = function (req,res,next){
  var self = this;
  var requiredFields = ['uid','legacy_number','email','password','mobile','name','pan','employer_name'];
  req.body.type      = 1;
  var bodyParams     = req.body;
  if(!bodyParams){
      return self.errorResponse(res,400,"Invalid request");
    }

  requiredFields.forEach(function (eachField){
    if(!bodyParams[eachField] || _.isEmpty(bodyParams[eachField])){
      return self.errorResponse(res,400,bodyParams[eachField]+' is required');
    }
  }); 

  this.mongoObj.masterDataModel.findOne({PARTNER : bodyParams.uid, TYPE : '1'})
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