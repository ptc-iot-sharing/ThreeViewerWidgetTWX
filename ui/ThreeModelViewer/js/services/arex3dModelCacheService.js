/* global angular */

(function() {
  'use strict';

  angular
    .module('twx.byoc')
    .factory('arex3dModelCacheService', arex3dModelCacheService);
  arex3dModelCacheService.inject = ['$rootScope', '$log', 'arexMessagingService'];

  function arex3dModelCacheService($rootScope, $log, arexMessagingService) {
    var myModels={};
    var loadingModels=[];
    //FIXME: need to cache materials from the cloned and apply them to the clone
    //var materialDict = {};
    //var refMaterials = {};

    var svc = {
      loadModel: loadModelFunc,
      getModel: getModelFunc,
    };
    return svc;

    function getModelFunc(file){
      var retObj = myModels[file];
      if (retObj === undefined) {
        return undefined;
      }
      return cloneModel( myModels[file] );
    }

    function cloneModel(obj) {
      var retObj = obj.clone(true);
      retObj.traverse(function (node) {
        //FIXME: need to cache materials from the cloned and apply them to the clone
        // node.castShadow = true;
        // node.recieveShadow = true;
        // if (node.material !== undefined) {
        //   var mat = materialDict[node.material.uuid];
        //   if (mat === undefined) {
        //     mat = node.material.clone();
        //     materialDict[node.material.uuid] = mat;
        //     refMaterials[mat.uuid] = node.material;
        //   }
        //   node.material = mat;
        // }
      });
      return retObj;
    }

    function loadModelFunc(file, successCallback, failCallback, forceload){
          //Use functions to (post-)decorate the original callbacks
      var decoratedSuccessCallback = function (obj) {
        try {        
          myModels[file] = obj;
          var objClone = cloneModel( obj );
          successCallback( objClone );
          loadingModels.splice(loadingModels.indexOf(file));
          arexMessagingService.trigger('load3DObj', { file:file, object: objClone, success:true });
        } finally {
          if(loadingModels.length === 0 )
            $log.log('End activity indicator');
        }
      };
      //
      var decoratedFailureCallback = function () {
        try {
          failCallback();
          loadingModels.splice(loadingModels.indexOf(file));
          arexMessagingService.trigger('load3DObj', { file:file, success:false });
        } finally {
          if(loadingModels.length === 0 )
            $log.log('End activity indicator');
        }
      };

      if(getModelFunc(file)){
        if(forceload){
          deleteModelFunc(file);
        }
        else{
          $log.debug('Cache hit for %s', file);
          successCallback(getModelFunc(file));
          return;
        }
      }
      
      if(loadingModels.indexOf(file) >-1){ // if the file's already being loaded, then subscribe to its load completion callback
        var cleanUpFunc = $rootScope.$on('load3DObj', function (evt, args) {
          $log.log("on load3DObj, args=", args);
          if(args.file === file){
            cleanUpFunc(); 
            if(args.success && args.object){
              successCallback(getModelFunc(file));
            }
            else{
              failCallback();
            }
          }
          });
        return;
      }   
         
      loadingModels.push(file);      
      if(loadingModels.length === 1){
        $log.log('Start activity indicator.');
      }
      loadFile(file, decoratedSuccessCallback, decoratedFailureCallback);

    }
    
    function loadFile(file, successCallback, failCallback){
      try {
        var createhierarchy = true;
        CVThreeLoader.LoadModel(file, function (obj) {
            successCallback(obj);
          },
          function (obj) {
            if (failCallback) failCallback();
          },
          createhierarchy);       
      }
      catch (e) {
        $log.error('CVThreeLoader::LoadModel failed. Error: %o', e);
        if (failCallback) failCallback();
      }
      finally {

      }
    }
  }
})();
