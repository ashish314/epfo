// All the routes for the application will be here

var EXPRESS               = require('express'),
    ROUTER                = EXPRESS.Router(),
    _                     = require('lodash'),
    REQUEST               = require('request'),
    deferred              = require('deferred'),
    authenticate           = require(__dirname + '/../controllers/userAuthentication/userAuthentication.js'),
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
      self.router.post('/signupEmployer',self.signUpEmployee.bind(self));
      self.router.post('/signinEmployer',self.signInEmployer.bind(self));
      self.router.post('/checkLogin'    ,self.checkLogin.bind(self));
      self.router.get('/logout'        ,self.logout.bind(self));
      initDefer.resolve();

    },function (err){
      initDefer.reject(err);
    });
  }

  return initDefer.promise;
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

apiRoutes.prototype.checkLogin = function (req,res,next) {
  console.log(req.user);
}

apiRoutes.prototype.signUpEmployee = function (req,res,next){
  
  if(_.isEmpty(req.body || !req.body.username || !req.body.password)){
    return this.errorResponse(res,400,"Required fields are blank");
  }

  if(!this.mongoObj){
    return this.errorResponse(res,500,'Internal server error');
  }
  var username = req.body.username,
      password = req.body.password,
      self     = this;

  // check for these details in database.
  this.mongoObj.masterDataModel.findOne({username : username},function (err,result){
    if(err){
      console.log(err);
      return self.errorResponse(res,500,'Internal server error');
    }
    else if(!_.isEmpty(result)){
      return self.errorResponse(res,400,'Username is already taken');
    }
    else{
      // now insert fields in db.
      self.mongoObj.masterDataModel.create({username:username,password:password},function (err,result){
        if(err){
          return self.errorResponse(res,500,'Internal server error');
        }
        else{
          // we need to log him in and redirect.
          var data = {
            username : username,
            password : password
          };
          return self.successResponse(res,200,'Sign up success',data);
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