// All the routes for the application will be here

var EXPRESS               = require('express'),
    ROUTER                = EXPRESS.Router(),
    _                     = require('lodash'),
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
      self.router.post('/signupEmployer',self.signUpEmployer.bind(self));
      self.router.post('/signinEmployer',self.signInEmployer.bind(self));
      self.router.get('/'               ,self.homepage.bind(self));
      self.router.get('/logout'        ,self.logout.bind(self));
      initDefer.resolve();

    },function (err){
      initDefer.reject(err);
    });
  }

  return initDefer.promise;
};


function query_on_uid_or_legacy(uid,legacy_number,cb){
  var self      = this;

  if(uid){
    self.mongoObj.masterDataModel.findOne({PARTNER : uid}, function (err,user){
      return cb(err,user);
    });
  }
  else if(legacy_number){
    self.mongoObj.masterDataModel.findOne({BPEXT : legacy_number},function (err,user){
      return cb(err,user);
    });
  }
};

apiRoutes.prototype.signInEmployer = function (req,res,next){
  var self = this;
  if(_.isEmpty(req.body || !req.body.username || !req.body.password)){
    return this.errorResponse(res,400,"Required fields are blank");
  }

  else if(req.user){
    return this.errorResponse(res,400,"already Logged in");
  }
  else{
    authenticate(req,res,next,function (err,user){
      if(err){
        return self.errorResponse(res,400,err);
      }
      else{
        console.log(req.user);
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
  console.log("came here");
  res.render()
};

apiRoutes.prototype.autoFillForm = function (req,res,next){
  // will be used to fetch details for signup form.
  // in body we will get uid or cmpfo need to provide name,address.
  if(_.isEmpty(req.body)){
    return this.errorResponse(res,400,"Required fields are blank");
  }

  if(_.isEmpty(req.body.uid && _.isEmpty(req.body.legacy_number))){
    return this.errorResponse(res,404,"uid or legacy number is required");
  }

  var userData = null,
      self     = this;

  query_on_uid_or_legacy.bind(this)(req.body.uid,req.body.legacy_number,function (err,user){
    if(err){
      return self.errorResponse(res,500,'Internal server error');
    }
    else if(_.isEmpty(user)){
     return self.errorResponse(res,404,'No user found'); 
    }
    else{
      return self.successResponse(res,200,'successful',user);
    }
  });
};

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
  this.mongoObj.masterDataModel.findOne({PARTNER : uid},function (err,result){
    if(err){
      console.log(err);
      return self.errorResponse(res,500,'Internal server error');
    }
    else if(!_.isEmpty(result)){
      return self.errorResponse(res,400,'Uid is already occupied');
    }
    else{
      // now update fields in db.
      result.UPDATED_TEL_NUM = mobile;
      result.UPDATED_EMAIL   = email;
      result.password        = password;
      result.save(function (err){
        if(err){
          return self.errorResponse(res , 500 ,'Internal server error');
        }
        else{
          return self.successResponse(res, 200, 'Sign up successful', result);
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