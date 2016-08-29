(function () {
  'use strict';
  var cvApiInited = false;

  //modular currently declared in vuforia-angular
  var module = angular.module('twx.byoc');
  module.config(function () {
      CVThreeLoader.Init('tml/js/ptc/thingload', function () {
      console.log('CVThreeLoader Ready');
      cvApiInited = true;
    });
  });

  module.factory('threeJsTmlRenderer', threeJsTmlRenderer);

  threeJsTmlRenderer.inject = ['$log', '$window', 'arex3dModelCacheService', '$timeout', '$state', '$q'];

  function threeJsTmlRenderer($log, $window, arex3dModelCacheService, $timeout, $state, $q, $rootScope) {
    /**
     * In the long run it may better to use angular providers and services to provide the
     * 'vuforia' service. For now the following should do. Also, the module pattern is used throughout however,
     * it's probably a better idea to use prototype based declaration and instantiation.
     *
     * In order to use the TestFacade:
     *   1. set the TESTING variable herein to true
     *   2. execute the following on the command line:
     *      cordova platform add browser
     *   3. remove plugins as needed.
     *
     * In order to use the VrFacade:
     *   1. set the TESTING variable herein to false
     *   2. execute the following on the command line:
     *      cordova platform add browser
     *   3. remove plugins as needed.
     **/
    var ROOT = 'root';
    var TRACKER = 'tracker';
    var GROUP = 'group';
    var MODEL = 'model';
    var MODEL_ITEM = 'model_item';
    var PLANAR = 'planar';
    var SHADER = 'shader';
    var SCALE = 1000.0; //
    var ADD_TEST_GEOMETRY = false;
    var TESTING = false;
    var debug = true;

    function NO_SUCH_OBJ_ERROR(name) {
      this.name = 'NO_SUCH_OBJ_ERROR';
      this.message = "An object with the following name cannot be found in the VR Session: '" + name + "'";
    }

    NO_SUCH_OBJ_ERROR.prototype = Object.create(Error.prototype);
    NO_SUCH_OBJ_ERROR.prototype.constructor = NO_SUCH_OBJ_ERROR;

    function SCENE_IS_NOT_CREATED() {
      this.name = 'SCENE_IS_NOT_CREATED';
      this.message = "A Scene object has not been created. Call ThreeD.createScene()";
    }

    SCENE_IS_NOT_CREATED.prototype = Object.create(Error.prototype);
    SCENE_IS_NOT_CREATED.prototype.constructor = SCENE_IS_NOT_CREATED;

    /**
     * Currently implemented using module pattern - but simple object allowing for prototype based extension would be more
     * appropriate ex:
     *
     * VrSessionObj <-- Tracker
     *    ^   ^  ^
     *    |   |  \------ Group
     *    |   \--------- Model
     *    \_____________ ModelItem
     *                   .
     *                   .
     *                   .
     * @type {Function}
     */
    var VrSessionObj = (function (me, name, type, obj, undefined) {
      var _this = me || {};

      var mName = name;
      var mType = type;
      var mObj = obj;
      //var mData = data;

      _this.getName = function () {
        return mName;
      };

      _this.getType = function () {
        return mType;
      };

      _this.get3dObj = function () {
        return mObj;
      };

      return _this;

    });

    var ThreeD = (function (threeDIfc, undefined) {
      var DEFAULT_FRAME_RATE = 10; //fps
      var sceneHelpers;
      var scene;
      var renderer;
      var renderloop = null;
      var rendererNode; //dom obj
      var shouldRender = false;
      var obj3dGroup;
      var mainCamera;
      var controls;
      var grid;
      var axisHelper;
      var billboardedObjs = [];
      var frameRate; //fps
      var overrideMaterial = new THREE.MeshBasicMaterial();
      var renderChannels = {
        occlude: 1,
        standard: 0,
        phantom: 2,
        decal: 3
      };

      function createMainCamera(serializedCameraData) {
        var cam;
        if (serializedCameraData !== undefined) {
          try {
            var loader = new THREE.ObjectLoader();
            cam = loader.parse(serializedCameraData);
          } catch (e) {
            $log.warn('Unable to de-serializing camera data. Aborting de-serialization.');
          }
        }

        if (cam === undefined || !(cam instanceof THREE.Camera)) {
          cam = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.01, 20000);
          cam.up = new THREE.Vector3(0, 1, 0);
          cam.position.z = .7;
          cam.position.y = .7;
          cam.position.x = .7;
          cam.target = new THREE.Vector3(0, 0, 0);
        }

        mainCamera = cam;
        return mainCamera;
      }

      function createMainControls() {
        var _controls = threeDIfc.applyCameraControls(mainCamera, renderer);
        controls = _controls;
        return controls;
      }

      function onWindowResize() {
        mainCamera.aspect = window.innerWidth / window.innerHeight;
        mainCamera.updateProjectionMatrix();
        if (renderer) renderer.setSize(window.innerWidth, window.innerHeight);
      }


      function render() {
        threeDIfc.render();
      }

      function numerify(n, undefinedVal) {
        return n === undefined ? undefinedVal : Number(n);
      }

      function isTrue(obj) {
        return String(obj).toLowerCase() === "true";
      }

      function getVrContainer() {
        var viewName = $state.current.name;
        var id = viewName + '-vrcontent';
        var vrcontent = document.getElementById(id);
        if (!vrcontent) {
          vrcontent = document.createElement('div');
          vrcontent.id = id;
          var parent = document.querySelector('ion-view[view-type=ar][twx-view=' + viewName + '] twx-dt-view');
          if (parent === undefined || parent === null) {
            throw new Error('Unable to find required parent element for insertion of vrcontent.');
          }
          vrcontent = parent.appendChild(vrcontent);
        }

        return vrcontent;
      }

      function getCamera(id) {
        var cam = cameras[id];
        if (cam === undefined) {
          throw ("Camera with id: " + id + " does not exist.");
        }
        return cam;
      }

      threeDIfc.removeObj = function (obj) {
        if (obj === undefined) {
          return;
        }
        obj.traverse(function (jbo) {
          //console.log("CLEANUP: About to remove %s which has %d children.", obj.name, obj.children.length);
          for (var i = 0; i <= jbo.children.length; i++) {
            jbo.remove(jbo.children[i]);
          }
        });
      };

      /**
       * Creates the scene and the container of all user 3D objects
       * @returns {THREE.Group} - the root of the scene graph - to which user 3D objects can be added
       */
      threeDIfc.createScene = function () {
        $window.removeEventListener('resize', onWindowResize, false);
        $window.addEventListener('resize', onWindowResize, false);

        $rootScope.$on('$destroy', function(){
          $window.removeEventListener('resize', onWindowResize, false);
        });

        scene = new THREE.Scene();
        scene.name = ROOT;
        obj3dGroup = new THREE.Group();
        obj3dGroup.name = '3DObjectGroup';
        scene.add(obj3dGroup);

        sceneHelpers = new THREE.Scene();
        sceneHelpers.name = 'SceneHelpers';

        grid = new THREE.GridHelper(5, 0.1);
        sceneHelpers.add(grid);

        axisHelper = new THREE.AxisHelper(.5);
        sceneHelpers.add(axisHelper);

        scene.add(sceneHelpers);
        overrideMaterial.colorWrite = false;

        return obj3dGroup;
      };

      threeDIfc.addMainCameraToScene = function (serializedCameraData) {
        var cam = createMainCamera(serializedCameraData);
        scene.add(cam);
      };

      threeDIfc.addMainControls = function () {
        createMainControls();
      };

      threeDIfc.createRenderer = function (fps) {
        //TODO: add FPS to the config obj
        $log.log('Current view: %o', $state.current.name);
        if (fps === undefined) {
          frameRate = DEFAULT_FRAME_RATE;
        } else {
          frameRate = fps;
        }
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(new THREE.Color(0xeeeeee));
        if (window.devicePixelRation) {
          renderer.setPixelRatio(window.devicePixelRatio);
        }
        rendererNode = getVrContainer().appendChild(renderer.domElement);
        renderer.autoClear = false;
        shouldRender = true;
      };

      threeDIfc.applyCameraControls = function (camera, renderer) {
        var _controls = new THREE.OrbitControls(camera, renderer.domElement);

        _controls.rotateSpeed = 1.0;
        _controls.zoomSpeed = 1.2;
        _controls.panSpeed = 0.8;

        _controls.enableZoom = true;
        _controls.enablePan = true;
        _controls.enableRotate = true;

        _controls.enableDamping = false;

        _controls.addEventListener('change', render);

        return _controls;
      };

      threeDIfc.startRendering = function () {
        if (renderer === undefined) {
          console.trace("Attempt to execute render loop while renderer is undefined detected and aborted. This may be related to normal termination of an edge case.");
          return;
        }

        renderloop = setTimeout(function () {
          requestAnimationFrame(threeDIfc.startRendering);
        }, 1000 / frameRate);

        controls.update();

        render();
      };

      threeDIfc.render = function () {
        if (!shouldRender) return;

        // update the billboarded objects
        for (var i = 0; i < billboardedObjs.length; i++) {
          billboardedObjs[i].quaternion.copy(mainCamera.quaternion);
        }

        renderer.clear();
        mainCamera.layers.mask = 0;
        mainCamera.layers.set(renderChannels.occlude); // occlude
        renderer.render(scene, mainCamera);
        mainCamera.layers.set(renderChannels.standard); // regular
        renderer.render(scene, mainCamera);
        mainCamera.layers.set(renderChannels.phantom); // phantom
        scene.overrideMaterial = overrideMaterial;
        renderer.render(scene, mainCamera); // phantom pass 1
        scene.overrideMaterial = undefined;
        renderer.render(scene, mainCamera); // phantom pass 2
        mainCamera.layers.set(renderChannels.decal); // decal
        renderer.render(scene, mainCamera);
        renderer.clearDepth();
      };


      threeDIfc.stopRendering = function (destroyRenderer) {
        if (renderloop != null) clearTimeout(renderloop);
        shouldRender = false;

        if (destroyRenderer === true) {
          if (rendererNode !== undefined) {
            //FIXME: for some reason in chrome (not sure about others) the following commented call also removes the
            //  parent node - then upon subsequent calls the parent node doesn't exist - which causes probs
            //var obj = getVrContainer().removeChild(rendererNode);
            rendererNode = undefined;
          }
          renderer = undefined;
        }
      };

      threeDIfc.setCameraPosition = function (id, x, y, z) {
        mainCamera.position.x = numerify(x, 0);
        mainCamera.position.y = numerify(y, 0);
        mainCamera.position.z = numerify(z, 0);
      };

      threeDIfc.addLighting = function (_scene) {
        if (!_scene) {
          console.error("No scene available to add lighting");
        }
        // _scene.add(new THREE.AmbientLight(0x404040));

        var directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(0, 1, 0);

        var dl1 = new THREE.DirectionalLight(0xffffff, 0.75);
        var dl2 = dl1.clone();
        var dl3 = dl1.clone();
        var dl4 = dl1.clone();
        dl1.layers.mask = dl2.layers.mask = dl3.layers.mask = dl4.layers.mask = 0xff;

        dl1.position.set(0, 0, -1);
        dl2.position.set(0, 0, 1);
        dl3.position.set(1, 0, 0);
        dl4.position.set(-1, 0, 0);
        _scene.add(directionalLight, dl1, dl2, dl3, dl4);

      };

      threeDIfc.addTestGeometry = function () {
        var geometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
        var material = new THREE.MeshBasicMaterial({ color: 0x404040 });
        material.side = THREE.DoubleSide;
        var cube = new THREE.Mesh(geometry, material);
        cube.layers.set(1);
        scene.add(cube);
      };

      threeDIfc.addToScene = function (obj) {
        obj3dGroup.add(obj);
      };

      threeDIfc.getScene = function (validate) {
        if (validate !== false && scene === undefined) {
          throw new SCENE_IS_NOT_CREATED();
        }
        return scene;
      };

      threeDIfc.positionObj = function (obj, position) {
        if (position.x !== undefined) {
          obj.position.x = Number(position.x);
        }
        if (position.y !== undefined) {
          obj.position.y = Number(position.y);
        }
        if (position.z !== undefined) {
          obj.position.z = Number(position.z);
        }
      };

      threeDIfc.rotateObj = function (obj, rotation) {
        if (obj.userData.billboard === true) {
          return;
        }
        var rot = new THREE.Euler(
          (rotation.rx !== undefined) ? THREE.Math.degToRad(rotation.rx) : obj.rotation.x,
          (rotation.ry !== undefined) ? THREE.Math.degToRad(rotation.ry) : obj.rotation.y,
          (rotation.rz !== undefined) ? THREE.Math.degToRad(rotation.rz) : obj.rotation.z,
          'ZYX');
        obj.setRotationFromEuler(rot);
      };

      //recursive
      threeDIfc.scaleObj = function (obj, scale) {
        if (scale.sx !== undefined) {
          obj.scale.x = Number(scale.sx);
        }
        if (scale.sy !== undefined) {
          obj.scale.y = Number(scale.sy);
        }
        if (scale.sz !== undefined) {
          obj.scale.z = Number(scale.sz);
        }
      };

      threeDIfc.transform = function (obj, transform) {
        if (transform.x !== undefined) {
          obj.position.x = Number(transform.x);
        }
        if (transform.y !== undefined) {
          obj.position.y = Number(transform.y);
        }
        if (transform.z !== undefined) {
          obj.position.z = Number(transform.z);
        }
        var rot = new THREE.Euler(
          (transform.rx !== undefined) ? THREE.Math.degToRad(transform.rx) : obj.rotation.x,
          (transform.ry !== undefined) ? THREE.Math.degToRad(transform.ry) : obj.rotation.y,
          (transform.rz !== undefined) ? THREE.Math.degToRad(transform.rz) : obj.rotation.z,
          'ZYX');
        obj.setRotationFromEuler(rot);
      };

      threeDIfc.setColor = function (obj, color) {
        var threeCol;
        switch (color.length) {
          case 4:
            threeCol = new THREE.Color(color.slice(0, 3));
            break;
          default:
            threeCol = new THREE.Color(color);
            break;
        }

        // Obj is the 3D Group so the color has to be applied to the children
        for (var i = 0; i < obj.children.length; i++) {
          obj.children[i].material.color = threeCol;
        }
      };

      threeDIfc.setProperties = function (obj, props) {
        /*var renderChannels = {
          occlude: 1,
          standard: 0,
          phantom: 2,
          decal: 3
        };*/

        var wdgId = obj.userData.domElement;
        var color,
          visibleFlag = !(isTrue(props.hidden)),
          colorWriteFlag = true,
          depthTestFlag = true,
          transparentFlag = true,
          decal = isTrue(props.decal),
          occlude = decal ? false : isTrue(props.occlude),
          opacity = numerify(props.opacity, 1.0),
          phantom = (!decal && !occlude && (opacity>0.0 && opacity<1.0)) ? isTrue(props.phantom) : false,
          billboard = isTrue(props.billboard),
          layer = renderChannels.standard;

        if (debug) {
          Object.keys(props).forEach(function (key) {
            $log.debug('property[%s] = %o', key, props[key]);
          });
        }
        if (props.color) {
          var arr = props.color.split(',');
          if (arr.length >= 3) {
            color = new THREE.Color;
            color.setRGB(Number(arr[0]), Number(arr[1]), Number(arr[2]));
          }
        }

        if (occlude) {
          colorWriteFlag = false;
          transparentFlag = false;
          layer = renderChannels.occlude;
        }
        if (phantom) {
           layer = renderChannels.phantom;
        }
        if (decal) {
          depthTestFlag = false;
          layer = renderChannels.decal;
        }

        if (props.shader !== undefined) {
          /* jshint noempty:false */
          //todo
        }

        obj.traverse(function (node) {
          var nodeId = node.userData.domElement;
          if (!nodeId || wdgId === nodeId) {
            if (node.material) {
              node.material.opacity = opacity;
              node.material.colorWrite = colorWriteFlag;
              node.material.depthTest = depthTestFlag;
              node.material.transparent = transparentFlag;
              node.material.needsUpdate = true;
              if (color !== undefined) {
                node.material.color.set(color);
              }
              node.material.visible = visibleFlag;
            }
          node.layers.mask = 0;
          node.layers.set(layer);
        }

        });
      //obj.visible = visibleFlag;
      if (billboard === true) {
        obj.userData.billboard = true;
        billboardedObjs.push(obj);
      } else { //no nead to support removal from billboard array.... yet
        obj.userData.billboard = false;
      }
    };

    function zoomBox(direction, boundingBoxHelper) {
      if (mainCamera === undefined || mainCamera === null) {
        $log.warn('Main camera is not defined. Aborting camera positioning operation');
        return;
      }
      var boundingSphere = boundingBoxHelper.box.getBoundingSphere();
      var fovRad = mainCamera.fov * Math.PI / 180;
      var effectiveFov = mainCamera.aspect < 1 ? fovRad * mainCamera.aspect : fovRad;

      //  requiredDistance = A distance that will include the entire model
      var requiredDistance = boundingSphere.radius / (Math.tan(effectiveFov / 2));

      //inefficient
      var requiredCamPos = boundingSphere.center.clone();
      requiredCamPos.addScaledVector(direction, -1.0 * requiredDistance);
      var m1 = new THREE.Matrix4();
      m1.lookAt(requiredCamPos, boundingSphere.center, mainCamera.up);
      mainCamera.quaternion.setFromRotationMatrix(m1);
      mainCamera.position.copy(requiredCamPos);
      controls.target.set(boundingSphere.center.x, boundingSphere.center.y, boundingSphere.center.z);
      controls.update();
    }

    threeDIfc.zoomOnObj3dGroup = function () {
      var direction = mainCamera.getWorldDirection();
      var boundingBoxHelper = new THREE.BoundingBoxHelper(obj3dGroup);
      boundingBoxHelper.update();
      zoomBox(direction, boundingBoxHelper);
    };

    threeDIfc.zoomOn = function (obj) {
      var mA = obj.matrixWorld.elements;
      var zv3 = new THREE.Vector3();
      obj.updateMatrixWorld(true);
      render();
      zv3.fromArray(mA, 8).negate();

      var boundingBoxHelper = new THREE.BoundingBoxHelper(obj);
      boundingBoxHelper.update();

      zoomBox(zv3, boundingBoxHelper);
    };

      threeDIfc.zoomToCenteredImage = function(img, obj) {

        function resolved( image ) {
          var mA = obj.matrixWorld.elements;
          var zv3 = new THREE.Vector3();
          obj.updateMatrixWorld( true );
          render();
          zv3.fromArray(mA, 8).negate();

          var objBBoxHelper = new THREE.BoundingBoxHelper( obj );
          objBBoxHelper.update();
          var objSphere = objBBoxHelper.box.getBoundingSphere();

          var fovRad = mainCamera.fov * Math.PI/180;
          var effectiveFov = mainCamera.aspect < 1 ? fovRad * mainCamera.aspect : fovRad;
          var opp = mainCamera.aspect < 1 ? window.innerHeight / 24 : window.innerWidth / (24/mainCamera.aspect);
          opp = opp / SCALE;

          //  requiredDistance = A distance that will include the entire model
          var requiredDistance = opp / ( Math.tan( effectiveFov/2 ) );
          console.log( 'Required d to target: %f', requiredDistance);
          //inefficient
          var requiredCamPos = objSphere.center.clone();
          requiredCamPos.addScaledVector(zv3, -1 * requiredDistance);
          var m1 = new THREE.Matrix4();
          m1.lookAt(requiredCamPos, objSphere.center, mainCamera.up);
          mainCamera.quaternion.setFromRotationMatrix( m1 );
          mainCamera.position.copy(requiredCamPos);

          console.log( 'Distance to target: %f', mainCamera.position.distanceTo(obj.position) );
          controls.target.set(objSphere.center.x, objSphere.center.y, objSphere.center.z);
          controls.update();
        }

        function rejected( xhr ) {
          console.error('Error loading resource: %o', xhr);
        }

        var loader = new THREE.ImageLoader();
        loader.setCrossOrigin(undefined);
        loader.load(img, resolved, undefined, rejected);
      };

    return threeDIfc;
  } (ThreeD || {}) );

  var VrFacade = (function (vrFacade, undefined) {
    var facade = {};
    var objNmToOpMap = {};
    var zoomedOnMarker = false;

    /**
     * vrSession is a simple object for now - but a tree or more general graph structure may be useful.
     * All names in the vrSession must be unique.
     * The layout of the vrSession is as follows after initialization and the addition of two non-tracker objects:
     *
     *    o A tracker named "TRACK00"
     *    o A tracker named "TRACK01"
     *    o An object - "A" - referencing "TRACK00"
     *    o Another object - "B" with parent A - referencing "TRACK01".
     *
     * vrSession
     * |
     * |- key: 'TRACK00' - value: wrapped simple js object
     * |  \- key: 'A' - value: wrapped THREE obj reference - A
     * |
     * |- key: 'TRACK01' - value: wrapped simple js object
     * |  \- key: 'B' - value: wrapped THREE obj reference - B
     * |
     * |- key: 'ROOT' - value: wrapped THREE Group
     * |   \- key: 'A' - value: wrapped THREE obj reference - A
     * |      \- key: 'B' - value: wrapped THREE obj reference - B
     * |
     * |- key: 'A' - value: wrapped THREE obj reference - A
     * |- key: 'B' - value: wrapped THREE obj reference - B
     *
     * @type {{}}
     */
    var vrSession = {};

    function validateAndInflateCtxtObj(ctxt) {
      var parent, tracker;

      //get the parent from the parentName if it is incoming - if not, attmept to get the parent of the object by
      //using the incoming name of the object - if no parent assume the parent is ROOT
      if (ctxt.parentName !== undefined && ctxt.parentName !== null) {
        parent = getUnwrappedObj(ctxt.parentName);
        if (parent === undefined) {
          throw new Error("Parent named '" + ctxt.parentName + "' does not exist. Scene graph corrupted.");
        }
        ctxt.parent = parent;
      } else {
        try {
          parent = getParent(ctxt.name); //validation occurs in this call
          ctxt.parent = parent;
        } catch (NO_SUCH_OBJ_ERROR) {
          ctxt.parent = getUnwrappedObj(ROOT);
        }
      }

      if (ctxt.hasOwnProperty('trackerName')) {
        tracker = getTracker(ctxt.trackerName); //validation occurs in this call
        ctxt.tracker = tracker;
      }

      return ctxt;
    }

    function addTrackerToVrSession(trackerName) {
      var tracker = VrSessionObj(undefined,
        trackerName,
        TRACKER,
        {},
        undefined);
      /* trackers are their own parent */
      tracker.get3dObj().parent = tracker;

      //not handling the redefinition case
      vrSession[trackerName] = tracker;
      console.log("Tracker with name: '%s' - added to VrSession", trackerName);
    }

    function addObjToVrSession(tracker, name, type, obj, parent) {
      var addition = VrSessionObj(undefined, name, type, obj, undefined);

      if (tracker !== undefined && tracker !== null) {
        tracker[name] = addition; //wrapped
      }

      if (obj.name != ROOT && parent !== undefined && parent !== null) {
        parent.add(obj); //unwrapped - added to scene graph here
      } else if (obj instanceof THREE.Object3D && obj != ThreeD.getScene(false)) {
        console.trace('object[%s/%s] is of type THREE.Object3D - adding to scene', obj.name, name);
        ThreeD.addToScene(obj);
      } else {
        console.warn('%s is added to the VrSession but not the scene.', name);
      }

      //also add to the vrSession for now - implication is that all names must be unique
      vrSession[name] = addition; //wrapped

      //now invoke the operations that are saved for the object
      if (objNmToOpMap[name] !== undefined) {
        var opLog = objNmToOpMap[name];
        var keys = Object.keys(opLog);
        keys.forEach(function (opName) {
          var op = opLog[opName];
          var fn = op.function;
          var args = op.args;
          var cb = op.callback;
          fn(args, cb);
          delete opLog[opName];
        });
        delete objNmToOpMap[name];

        if (Object.keys(objNmToOpMap).length === 0 && zoomedOnMarker !== true) {
          //assertion: queued operations are drained
          //assertion: no marker was zoomed on
          //so:
          ThreeD.zoomOnObj3dGroup();
        }
      }
      console.debug('addObjToVrSession: %s added.', name);

      if (type === MODEL) {
        obj.traverse(function (node) {
          var componentName = node.name;
          if (!(componentName === undefined || componentName === '' ||
            componentName === ':' || componentName === name)) {
            //add component reference to the vrSession object:
            //NOTE: this is an extra reference to an obj that's already in the vrSession by virtue of its
            // parent already being in the vrSession.
            // This function adds one MODEL_ITEM object for each component of the model,
            // so there are likely more MODEL_ITEM objects than twx-dt-modelitem elements in the DOM
            var fqCompName = name + '-' + componentName;
            $log.debug('sub comp: %s added', fqCompName);
            vrSession[fqCompName] = VrSessionObj(undefined, fqCompName, MODEL_ITEM, node, undefined);
          }
        });
      }
    }

    function getUnwrappedObj(name) {
      var obj = getObj(name);
      return obj.get3dObj();
    }

    function getObj(objName) {
      var obj = vrSession[objName];
      if (obj === undefined) {
        if (objName === null) {
          console.trace("objName === null");
        }
        throw new NO_SUCH_OBJ_ERROR(objName);
      }
      // to ensure setProperties on model doesnt clobber modelitem materials
      else if (obj && obj.getType() === MODEL_ITEM && obj.get3dObj()) {
        var obj3d = obj.get3dObj();
        if (obj3d.userData.domElement !== objName) {
          obj3d.traverse(function (node) { node.userData.domElement = objName; });
        }
      }
      return obj;
    }

    function getParent(name) {
      var root = vrSession[ROOT].get3dObj();

      if (root === undefined || root === null) {
        throw new SCENE_IS_NOT_CREATED();
      }

      var obj = getObj(name);

      var parent = obj.get3dObj().parent;

      if (parent === undefined || parent === null) {
        console.debug("Object named '%s' does not have a defined parent. Returning ROOT as parent.", name);
        return root;
      }

      return parent;
    }

    function getTracker(name) {
      var tracker = getObj(name);
      if (tracker === undefined || tracker === null) {
        throw ("Tracker named '" + name + "' does not exist.");
      }
      if (tracker.getType() !== TRACKER) {
        throw ("Object named '" + name + "' is not a " + TRACKER);
      }
      return tracker.get3dObj();
    }

    function arrayToMap(array, names) {
      var retObj = array.reduce(function (map, current, index) {
        var name = names[index];
        if (name !== undefined) {
          map[names[index]] = current;
        }
        return map;
      }, {});
      return retObj;
    }


    function deferOperation(fn, args, cb) {
      var name = args[0];
      if (args[0] === undefined) {
        $log.error('Name of Object on which operation is to be performed is not found in call context');
        return;
      }

      var operationLog = objNmToOpMap[name];
      if (operationLog === undefined) {
        operationLog = {};
        objNmToOpMap[name] = operationLog;
      }
      var fnName = fn.toString().match(/function ([^\(]+)/)[1];
      $log.debug('%s deferred', fnName);
      var operation = { function: fn, args: args, callback: cb };
      operationLog[fnName] = operation;
    }

    function argsToCtxt(argArray, argNameArray, validate) {
      var ctxt = arrayToMap(argArray, argNameArray);
      if (validate !== false) {
        ctxt = validateAndInflateCtxtObj(ctxt);
      }
      return ctxt;
    }

    function getParamNames(func) {
      var funcStr;
      if (func === undefined || func === null) {
        console.trace('getParamNames');
        funcStr = 'unknown'; //fixme: hack
      } else {
        funcStr = func.toString();
      }
      return funcStr.slice(funcStr.indexOf('(') + 1, funcStr.indexOf(')')).match(/([^\s,]+)/g);
    }

    function safetyWrapper(func) {
      if (func === undefined || func === null) {
        return function () {/*nop*/
        };
      }
      return func;
    }

    function loadTexture(appData) {
      return  $q(function promisedLoadTexture(resolved, rejected) {
        //THREE.ImageUtils.loadTexture( appData.image, {}, resolved, rejected );
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(undefined);
        var texture = loader.load(appData.image, resolved, undefined, rejected);
        texture.mapping = {};
      });
    }

    function createPlanarMesh(ctxt) {
      var width, height;
      width = ctxt.width === undefined ? 100.0 / SCALE : ctxt.width;
      height = ctxt.height === undefined ? 100.0 / SCALE : ctxt.height;
      var geometry = new THREE.PlaneGeometry(width, height);
      var material = new THREE.MeshLambertMaterial(
        {
          color: 0xffffff,
          side: THREE.DoubleSide,
          wireframe: false,
          transparent: true,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: 1
        });
      var mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.order = 'ZYX';
      mesh.name = ctxt.name;
      return mesh;
    }

    function logError(e) {
      throw e;
    }

    function _setTexture(ctxt) {
      var obj = getUnwrappedObj(ctxt.name);
      var width, height;

      width = ctxt.width === undefined ? ctxt.texture.image.width / SCALE : ctxt.width;
      height = ctxt.height === undefined ? ctxt.texture.image.height / SCALE : ctxt.height;

      obj.geometry = new THREE.PlaneGeometry(width, height);
      obj.material.map = ctxt.texture;
      obj.material.map.needsUpdate = true;
      obj.material.needsUpdate = true;

      //update for enabling shadows
      //todo: enable shadows
      obj.castShadow = true;
      obj.receiveShadow = true;
    }

    function resetState() {
      objNmToOpMap = {};
      zoomedOnMarker = false;
    }

    function clearVrSession() {
      function clearMap(map, preDelete, postDelete) {
        var keys = Object.keys(map);
        var lcv = 0;
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var obj = map[key];
          preDelete(obj);
          if (delete map[key]) {
            lcv += 1;
            postDelete(obj);
          }
        }
        return lcv;
      }

      function nop(o) {
      }

      function postDeleteObj(obj) {
        obj = undefined;
      }

      function preDeleteVrSessionObj(obj) {
        var obj3d = obj.get3dObj();
        if (obj.getType() !== TRACKER && obj.getType() !== SHADER) {
          ThreeD.removeObj(obj3d);
        } else {
          var num = clearMap(obj3d, nop, postDeleteObj);
          console.log("CLEANUP: Cleared %d object refs from tracker %s", num, obj.getName());
        }
      }

      console.log("CLEANUP: Clearing VrSession");
      var numFromVrSession = clearMap(vrSession, preDeleteVrSessionObj, postDeleteObj);
      console.log("CLEANUP: Cleared %d object res from VrSession", numFromVrSession);
      ThreeD.stopRendering(true);
    }

    function getResourceUrl(objName) {
      //var svc = angularService('twxAppDesignerService');
      var origin = window.location.origin;
      var project = window.location.pathname.split('/')[1];
      var url = [origin, project, 'dist/phone/app/resources', objName].join('/');
      return url;
    }

    var modelLoadQueue = [];
    var modelLoadQueueStarted = false;
    var POLLING_LIMIT = 100;
    function queueModel(obj) {
      modelLoadQueue.push(obj);
    }

    function pollModelLoadQueue() {
      if (modelLoadQueueStarted === true) {
        return;
      }
      modelLoadQueueStarted = true;
      var nPolls = 0;
      var intervalId = $window.setInterval(function () {
        nPolls += 1;
        $log.log('Polling model queue (%d)', nPolls);
        if (cvApiInited === true) {
          var currentModel;
          do { //empty the queue
            currentModel = modelLoadQueue.shift();
            if (currentModel === undefined || nPolls >= POLLING_LIMIT) {
              break;
            }
            $log.log('Attempting to load %s...', currentModel.name);
            arex3dModelCacheService.loadModel(currentModel.file, currentModel.successCb, currentModel.errorCb, false);
          } while (currentModel !== undefined);
          //once empty kill the interval
          $window.clearInterval(intervalId);
          $log.log('No longer polling model queue');
        }
      }, 250);
    }

    vrFacade.exec = function () {

      var obj = arguments[2];
      var func = arguments[3];
      var successCb = safetyWrapper(arguments[0]);
      var errorCb = safetyWrapper(arguments[1]);
      var args = arguments[4];

      if (facade[func] === undefined) {
        console.error('%s is not implemented in facade. Aborting call.');
        return;
      }
      var declaredArgList = getParamNames(facade[func]);
      if (declaredArgList === null) {
        console.log("No args in func: %s", facade[func].name);
        if (args.length > 0) {
          console.error("Error - arguments have been passed by the caller(%s) but no arguments are expected by the function(%o)", vrFacade.exec.caller, facade[func]);
          //todo: perhaps errorCb should be invoked?
          return;
        }
      }

      //do nillablity validation based on facade[func].nillables

      //do default assignment based on facade[func].defaults

      try {
        /*
         * Another alternative implementation may be as follows - however the implication is that successCb
         * is the resolver - that is stuff after a facade(aka vuforia) call must be done in it's callback.
         */
        //var promisedFacadeCall = new Promise( function(resolve,reject) {
        //    facade[func](resolve, reject, args);
        //});
        //
        //promisedFacadeCall.then(successCb, errorCb);
        var arg0 = args === undefined ? undefined : args[0];
        console.debug('Invoking %s on %s with args: %o', func, arg0, args);
        facade[func](successCb, errorCb, args);
        ThreeD.render();
      } catch (error) {
        if (error.name === NO_SUCH_OBJ_ERROR.name) {
          console.warn('Ignoring call to %s. Due to the following: %s', func, error.message);
        } else if (error.name === SCENE_IS_NOT_CREATED.name) {
          console.error(error.message);
        } else {
          console.error("Error(%o) encountered while invoking '" + func + "' with args: %o", error, args);
          //show window displaying accumulated errors... but for now
          //alert("Error occurred while invoking '" + func + "'. Check console");
        }
        //this ensures that if the errorCb was not called in the actual func - that it is called.
        errorCb(error);
      }
    };

    function getSerializedCameraData() {
      var viewName = $state.current.name;
      var element = document.querySelector('ion-view[view-type=ar][twx-view=' + viewName + '] twx-widget-property[name=camera]');
      if (element === null) { return; }
      var cameraAttributeValue = element.getAttribute('value');
      if (cameraAttributeValue === null) { return; }
      return cameraAttributeValue;
    }

    facade.initializeAR = function initializeAR(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "initializeAR",[license, maxtrackers, extendedtracking, persistmap, near, far]);
      clearVrSession();
      resetState();

      var root = ThreeD.createScene();
      addObjToVrSession(undefined, ROOT, ROOT, root, undefined);

      var scene = ThreeD.getScene();
      ThreeD.addLighting(scene);
      ThreeD.addMainCameraToScene(getSerializedCameraData());

      ThreeD.createRenderer();
      ThreeD.addMainControls();
      ThreeD.startRendering();

      if (ADD_TEST_GEOMETRY) {
        ThreeD.addTestGeometry();
      }
      // Defer success callback as if it is called from native side of vuforia plugin
      $timeout(successCb, 0, false); //todo: what are the normal arguments to success call back when real vuforia is in play?
    };
    facade.initializeAR.nillables = ['license', 'maxtrackers'];
    facade.initializeAR.defaults = {
      'license': 'no_lic',
      'maxtrackers': 1
    };

    facade.addPVS = function addPVS(successCb, errorCb, args) {
      var localSuccessCallBack = function (model) {
        model.name = ctxt.name;
        addObjToVrSession(ctxt.tracker, model.name, MODEL, model, ctxt.parent);
        $log.log('%s is now loaded.', model.name);
        successCb(undefined);
      };
      var ctxt = argsToCtxt(args, ['trackerName', 'name', 'file', 'cull', 'parent']);
      if (cvApiInited === false) {
        $log.log('CVThreeLoader not initialized yet. Queueing %s for load.', ctxt.name);
        //ignoring the provided successCb.
        ctxt.successCb = localSuccessCallBack;
        ctxt.errorCb = errorCb;
        queueModel(ctxt);
        pollModelLoadQueue();
      } else {
        $log.log('Attempting to load %s...', ctxt.name);
        arex3dModelCacheService.loadModel(ctxt.file, localSuccessCallBack, errorCb, false);
      }
    };

    facade.showARView = function showARView(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "showARView");
      console.log('showARView invoked with args: %o', arguments);
    };

    facade.cleanUpAndPause = function cleanUpAndPause(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "cleanUpAndPause");
      console.log('cleanUpAndPause invoked with args: %o', arguments);
      clearVrSession();
      resetState();
    };

    facade.pauseAR = function pauseAR(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "pauseAR");
      console.log('pauseAR invoked with args: %o', arguments);
    };

    facade.resumeAR = function resumeAR(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "resumeAR");
      console.log('resumeAR invoked with args: %o', arguments);
    };

    facade.loadTrackerDef = function loadTrackerDef(successCb, errorCb, args) {
      //var ms = (markerSet === undefined) ?           "" : markerSet;
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "loadTrackerDef", [ms]);
      console.log('loadTrackerDef invoked with args: %o', arguments);
      try {
        $timeout(successCb, 0, false);
      } catch (error) {
        console.error("error invoking loadTrackerDef: %o", error);
        $timeout(errorCb, 0, false); //subsequent throws will be trapped by the try/catch in exec
      }
    };

    facade.addTracker = function addTracker(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "addTracker", [name]);
      var ctxt = argsToCtxt(args, ['name']);
      if (debug) console.log('addTracker invoked with args: %o for object named: %s', arguments, ctxt.name);
      if (ctxt.name === undefined) {
        console.log('addTracker invoked without tracker name. Ignoring.');
        return;
      }

      //TODO: need to add a concrete concept of a tracker
      addTrackerToVrSession(ctxt.name);
    };

    facade.add3DObject = function add3DObject(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "add3DObject", [trackerName,name,vertices,normals,texCoords,indexes, color, texture, parent]);
      // NOTE: Now this only creates the base geometry. The call to append3DObject create the proper mesh
      var ctxt = argsToCtxt(args, ['trackerName', 'name', 'vertices', 'normals', 'texCoords', 'indices', 'color', 'texture', 'parentName']);
      if (debug) console.log('add3DObject  invoked with args: %o for object named: %s', arguments, ctxt.name);
      var vertices = new Float32Array(ctxt.vertices);
      var normals = new Float32Array(ctxt.normals);
      var vp = new THREE.BufferAttribute(vertices, 3);
      var vn = new THREE.BufferAttribute(normals, 3);
      var geometry = new THREE.BufferGeometry();
      geometry.addAttribute('position', vp);
      geometry.addAttribute('normal', vn);
      // It appears that in the case of loading the Teapot, the ar3dobject fully defines this, and so all the args are populated and append3DObject  not called
      if (ctxt.indices != null) {
        var ind = new THREE.BufferAttribute(new Uint16Array(ctxt.indices), 1);
        geometry.addAttribute('index', ind);
      }
      var mat = undefined;
      if (ctxt.color != null) {
        var fcolor = new Float32Array(ctxt.color);
        var tcolor = new THREE.Color(fcolor[0], fcolor[1], fcolor[2]);
        mat = new THREE.MeshPhongMaterial({ color: tcolor })
      }
      var mesh = new THREE.Mesh(geometry, mat);
      mesh.rotation.order = 'ZYX';
      // Even though not material is specified one will be  assigned, so dont show this and mark this as a fake for the moment
      // This is not a good test, but somehow need to cater for the teapot case
      if (mat === undefined && ctxt.color === null) {
        mesh.visible = false;
        mesh.userData = { Fake: true };
      }
      addObjToVrSession(ctxt.tracker, ctxt.name, MODEL, mesh, ctxt.parent);
      $timeout(successCb, 0, false);
    };

    facade.append3DObject = function append3DObject(successCb, errorCb, args) {
      var ctxt = argsToCtxt(args, ['name', 'mode', 'indices', 'color']);
      var obj = getObj(ctxt.name);
      var obj3d = obj.get3dObj();
      var fcolor = new Float32Array(ctxt.color);
      var tcolor = new THREE.Color(fcolor[0], fcolor[1], fcolor[2]);
      var mat = new THREE.MeshPhongMaterial({ color: tcolor });
      if (fcolor[3] !== 1.0) {
        mat.transparent = true;
        mat.opacity = 1.0 - fcolor[3];
      }
      var ind = new THREE.BufferAttribute(new Uint16Array(ctxt.indices), 1);
      if (obj3d.userData.Fake) {
        //obj3d.geometry.setIndex( ind );
        obj3d.geometry.addAttribute('index', ind);
        obj3d.material = mat;
        obj3d.userData.Fake = undefined;
        obj3d.visible = true;
      }
      else {
        var newgeom = obj3d.geometry.clone();
        newgeom.addAttribute('index', ind);
        var mesh = new THREE.Mesh(newgeom, mat);
        mesh.rotation.order = 'ZYX';
        addObjToVrSession(ctxt.tracker, ctxt.name, MODEL, mesh, ctxt.parent);
      }
    };


    facade.addGroup = function addGroup(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "addGroup", [trackerName,name,parent]);
      var ctxt = argsToCtxt(args, ['trackerName', 'name', 'parentName']);
      if (debug) console.log('addGroup  invoked with args: %o for object named: %s', arguments, ctxt.name);

      //the following should not happen - access to THREE should be consolidated - maybe
      var group = new THREE.Group();
      group.name = ctxt.name;
      group.parent = ctxt.parent;

      addObjToVrSession(ctxt.tracker, ctxt.name, GROUP, group, ctxt.parent);
      $timeout(successCb, 0, false);
    };

    facade.addMarker = function addMarker(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "addMarker", [trackerName,name,src]);
      var ctxt = argsToCtxt(args, ['trackerName', 'name', 'src', 'size']);
      if (debug) console.log('addMarker  invoked with args: %o for object named: %s', arguments, ctxt.name);

      //FIXME: The following incorrectly assumes ThingCodes only.
      ctxt.width = Number(ctxt.size);
      ctxt.height = 2 * Math.tan(30 * Math.PI/180) * ctxt.width;
      ctxt.image = getResourceUrl('Default/thing_code.png');

      var mesh = createPlanarMesh(ctxt);
      addObjToVrSession(ctxt.tracker, ctxt.name, PLANAR, mesh, ctxt.parent);

      if (zoomedOnMarker === false) {
        //supporting only one marker for now (not a big fan of zooming on it)
        zoomedOnMarker = true;
        //The phantom recognition image that is shown in experiences prior to recognition is at:
        //  http://localhost:4000/{project_name}/dist/phone/app/resources/Default/thing_code_phantom.png
        //  soon after R1 it will be used as an invisible projection aid such that the camera
        //  can dolly to the point where the size of the marker as it apperas in preview is the
        //  same size as the phantom recognition image.
        ThreeD.zoomToCenteredImage('app/resources/Default/thing_code_phantom.png', mesh);
      }

      loadTexture(ctxt).then(function (texture) {
        mesh.material.depthTest = true;
        mesh.material.depthWrite = false;
        mesh.renderOrder = 1;
        ctxt.texture = texture;
        _setTexture(ctxt);
      }, logError);

      //apply alphaMap
      var alphaMaskImage = getResourceUrl('Default/thing_code_alpha_mask.png');
      loadTexture({image: alphaMaskImage}).then(function applyAlphaMask(mask) {
        mesh.material.alphaMap = mask;
        mesh.material.needsUpdate = true;
        $timeout(successCb, 0, false);
      }, logError);
    };

    facade.getTracked = function (successCb, errorCb, args) {
      console.log('getTracked!');
    };

    facade.add3DImage = function add3DImage(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "add3DImage", [trackerName, name, image, parent]);
      var ctxt = argsToCtxt(args, ['trackerName', 'name', 'image', 'parentName']);
      if (debug) console.log('add3DImage  invoked with args: %o for object named: %s', arguments, ctxt.name);

      //fight hack with hack by looking for the first hack's signature
      var recognizer = ctxt.image.split(' ');
      if (recognizer.length === 2) {
        if (recognizer[0].includes('recognised') && recognizer[1].includes('recognised2')) {
          console.debug("Ignoring request to add recogniser");
          return;
        }
      }
      var mesh = createPlanarMesh(ctxt);
      addObjToVrSession(ctxt.tracker, ctxt.name, PLANAR, mesh, ctxt.parent);

      loadTexture(ctxt).then(function (texture) {
        ctxt.texture = texture;
        _setTexture(ctxt);
        $timeout(successCb, 0, false);
      }, logError);

    };

    facade.setTexture = function setTexture(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "setTexture", [name, texture]);
      var fn = function texture(args, scb) {
        var ctxt = argsToCtxt(args, ['name', 'image']);
        loadTexture(ctxt).then(function (texture) {
          ctxt.texture = texture;
          _setTexture(ctxt);
          scb();
        }, logError);
      };

      if (ThreeD.getScene(false) === undefined || vrSession[args[0]] === undefined) {
        deferOperation(fn, args, successCb);
        return;
      }
      fn(args, successCb);
    };

    facade.setColor = function setColor(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "setColor", [name, color]);
      var fn = function color(args, scb) {
        var ctxt = argsToCtxt(args, ['name']);
        if (debug) console.log('setColor  invoked with args: %o for object named: %s', arguments, ctxt.name);
        var obj = getUnwrappedObj(ctxt.name);
        ThreeD.setColor(obj, args[1]);
        scb();
      };

      if (ThreeD.getScene(false) === undefined || vrSession[args[0]] === undefined) {
        deferOperation(fn, args, successCb);
        return;
      }
      fn(args, successCb);
    };

    facade.setProperties = function setProperties(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "setProperties", [name, props]);
      var fn = function properties(args, scb) {
        var ctxt = argsToCtxt(args, ['name']);
        Object.assign(ctxt, args[1]);
        var obj = getUnwrappedObj(ctxt.name);
        ThreeD.setProperties(obj, ctxt);
        scb();
      };

      if (ThreeD.getScene(false) === undefined || vrSession[args[0]] === undefined) {
        deferOperation(fn, args, successCb);
        return;
      }
      fn(args, successCb);
    };

    facade.getAllPropertyValues = function getAllPropertyValues(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "getAllPropertyValues", [name] );
      var ctxt = argsToCtxt(args, ['name']);
      console.log('getAllPropertyValues  invoked with args: %o for object named: %s', arguments, ctxt.name);
    };

    //perhaps a better name would be setPosition?
    facade.setTranslation = function setTranslation(successCb, errorCb, args) {
      //var x=(ax===undefined)?0.0:ax;
      //var y=(ay===undefined)?0.0:ay;
      //var z=(az===undefined)?0.0:az;
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "setTranslation", [name,x,y,z]);

      var fn = function translate(args, scb) {
        var ctxt = argsToCtxt(args, ['name', 'x', 'y', 'z']); //throws in case no scene
        ThreeD.positionObj(getUnwrappedObj(ctxt.name), ctxt);
        scb();
      };

      if (ThreeD.getScene(false) === undefined || vrSession[args[0]] === undefined) {
        deferOperation(fn, args, successCb);
        return;
      }
      fn(args, successCb);

      //An alternate impl of the conditional above
      //var ctxt, obj;
      //try {
      //  ctxt = argsToCtxt(args, ['name', 'x', 'y', 'z']); //throws in case no scene
      //  obj = getUnwrappedObj(ctxt.name); //throws in case obj is not available yet
      //} catch (NO_SUCH_OBJ_ERROR) {
      //  //defer fn call
      //  deferOperation(fn, ctxt, cb);
      //  return;
      //}
      //fn( ctxt, scb );
    };

    facade.setRotation = function setRotation(successCb, errorCb, args) {
      //var x=(ax===undefined)?0.0:ax;
      //var y=(ay===undefined)?0.0:ay;
      //var z=(az===undefined)?0.0:az;
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "setRotation", [name,x,y,z]);
      var fn = function rotate(args, scb) {
        var ctxt = argsToCtxt(args, ['name', 'rx', 'ry', 'rz']);
        if (debug) console.log('setRotation  invoked with args: %o for object named: %s', arguments, ctxt.name);
        var obj = getUnwrappedObj(ctxt.name);
        ThreeD.rotateObj(obj, ctxt);
        scb();
      };

      if (ThreeD.getScene(false) === undefined || vrSession[args[0]] === undefined) {
        deferOperation(fn, args, successCb);
        return;
      }
      fn(args, successCb);
    };

    facade.setScale = function setScale(successCb, errorCb, args) {
      //var x=(ax===undefined)?1.0:ax;
      //var y=(ay===undefined)?1.0:ay;
      //var z=(az===undefined)?1.0:az;
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "setScale", [name,x,y,z]);
      var fn = function scale(args, scb) {
        var ctxt = argsToCtxt(args, ['name', 'sx', 'sy', 'sz']);
        if (debug) console.log('setScale  invoked with args: %o for object named: %s', arguments, ctxt.name);
        var obj = getUnwrappedObj(ctxt.name);
        ThreeD.scaleObj(obj, ctxt);
        scb();
      };

      if (ThreeD.getScene(false) === undefined || vrSession[args[0]] === undefined) {
        deferOperation(fn, args, successCb);
        return;
      }
      fn(args, successCb);
    };

    facade.setupAREventsCommand = function setupAREventsCommand(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "setupAREventsCommand");
      console.log('setupAREventsCommand  invoked with args: %o', arguments);
    };

    facade.transform = function transform(successCb, errorCb, args) {
      //var x=(dx===undefined)?0.0:dx;
      //var y=(dy===undefined)?0.0:dy;
      //var z=(dz===undefined)?0.0:dz;
      //var rx=(drx===undefined)?0.0:drx;
      //var ry=(dry===undefined)?0.0:dry;
      //var rz=(drz===undefined)?0.0:drz;
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "transform", [name,x,y,z,rx,ry,rz]);
      var fn = function transform(args, scb) {
        var ctxt = argsToCtxt(args, ['name', 'x', 'y', 'z', 'rx', 'ry', 'rz']);
        if (debug) console.log('transform  invoked with args: %o for object named: %s', arguments, ctxt.name);
        var obj = getUnwrappedObj(ctxt.name);
        ThreeD.transform(obj, ctxt);
        scb();
      };

      if (ThreeD.getScene(false) === undefined || vrSession[args[0]] === undefined) {
        deferOperation(fn, args, successCb);
        return;
      }
      fn(args, successCb);
    };

    facade.resetAll = function resetAll(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "resetAll");
      console.log('resetAll  invoked with args: %o', arguments);
    };

    facade.reset = function reset(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "reset", [name]);
      var ctxt = argsToCtxt(args, ['name']);
      console.log('reset  invoked with args: %o for object named: %s', arguments, ctxt.name);
    };

    facade.setShader = function setShader(successCb, errorCb, args) {
      //cordovaProxy.exec(successCallback, errorCallback, "Vuforia", "setShader", [name, vertex, fragment]);
      var ctxt = argsToCtxt(args, ['name', 'vertex', 'fragment']);
      addObjToVrSession(undefined, ctxt.name, SHADER, ctxt, undefined);
      console.log('setShader  invoked with args: %o for object named: %s', arguments, ctxt.name);
    };

    return vrFacade;
  } (VrFacade || {}));

  var TestFacade = (function (testFacade, undefined) {
    testFacade.exec = function () {
      var obj = arguments[2];
      var func = arguments[3];
      var successCb = arguments[0];
      var errorCb = arguments[1];
      var args = arguments[4];
      console.log("cordova.exec called with %s.%s(%o)", obj, func, args);
    };

    return testFacade;
  } (TestFacade || {}));

  function resolvePath(names) {
    var split = names.split(" ");
    var result = "";
    var path = location.pathname;
    var lastIndexOfSlash = path.lastIndexOf('/');
    path = path.substr(0, lastIndexOfSlash);
    for (var i = 0; i < split.length; i++) {
      var name = split[i];
      if (lastIndexOfSlash > -1) {
        if (result.length > 0) result += " ";
        result += location.origin + path + '/' + name;
      }
    }

    //console.log("Location: " + JSON.stringify(location) );
    return result;
  }

  /**
   * The good: allows for encapsulated functionality and a top level interface for outside things to interact with
   * The bad: this adds another level of indirection
   * The ugly: see 'The bad'
   *
   * retrospective: could have used augmentation pattern of modules:
   *   cd = cd || delegate;
   */
  var CommandDispatcher = (function (cd, undefined) {
    var AR = 'ar';
    var VR = 'vr';
    var delegate;
    var arVrState;

    //if (cordova.platformId !== 'browser') {
    //    console.log("Commands will be dispatched to cordova");
    //    delegate = cordova;
    //    arVrState = AR;
    //} else {
    if (TESTING) {
      console.log("Commands will be dispatched to TestFacade");
      delegate = TestFacade;
    } else {
      console.log("Commands will be dispatched to VrFacade");
      delegate = VrFacade;
      arVrState = VR;
    }
    //}

    //Why? Because now the value exposed by AR() cannot be modified.
    cd.AR = function () {
      return AR;
    };

    //Why? See cd.AR()
    cd.VR = function () {
      return VR;
    };

    cd.arVrState = function () {
      return arVrState;
    };

    cd.exec = function (successCb, errorCb, objName, funcName, args) {
      delegate.exec(successCb, errorCb, objName, funcName, args);
    };

    /**
     * Changes the target interpreter to that which handles VR mode - currently VRFacade
     */
    cd.switchToVr = function () {
      //vuforia.cleanUpAndPause();
      delegate = VrFacade;
      arVrState = VR;
    };

    /**
     * Changes the target interpreter to that which handles AR mode - currently cordova - which in-turn sends commands to the vuforia plugin
     */
    cd.switchToAr = function () {
      //vuforia.cleanUpAndPause();
      arVrState = AR;
    };

    return cd;

  } (CommandDispatcher || {}));

  var renderingImpl = {
    CommandDispatcher: CommandDispatcher,

    //FIXME: SIG CHANGE: initializeAR in ThreeD.threeDIfc needs to be ported with new args: near, far
    initializeAR: function (license, maxtrackers, extendedtracking, persistmap, near, far, successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "initializeAR", [license, maxtrackers, extendedtracking, persistmap, near, far]);
    },

    showARView: function (successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "showARView");
    },

    cleanUpAndPause: function (successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "cleanUpAndPause");
    },

    pauseAR: function (successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "pauseAR");
    },

    resumeAR: function (successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "resumeAR");
    },

    loadTrackerDef: function (markerSet, successCallback, errorCallback) {
      var ms = (markerSet === undefined) ? "" : markerSet;
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "loadTrackerDef", [ms]);
    },

    addTracker: function (name, successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "addTracker", [name]);
    },

    getTracked: function (trackedObjects, successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "getTracked", [trackedObjects]);
    },

    add3DObject: function (trackerName, name, vertices, normals, texCoords, indexes, color, texture, parent, successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "add3DObject", [trackerName, name, vertices, normals, texCoords, indexes, color, texture, parent]);
    },

    addPVS: function (trackerName, name, url, cull, parent, successCallback, errorCallback) {
      if (url === undefined) {
        console.debug('Aborting addPVS: No resource specified');
        return;
      }
      if (!((url.indexOf("http") > -1) || (url.indexOf("file") > -1) || (url.indexOf("data") > -1))) {
        url = resolvePath(url);
      }
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "addPVS", [trackerName, name, url, cull, parent]);
    },

    //FIXME: NEW needs to be added to ThreeD.threeDIfc
    addLeaderLine: function (trackerName, name, vertices, color, texture, nbScreenCoord, pointSize, lineWidth, parent, successCallback, errorCallback) {
      if (texture === undefined) {
        console.debug('Aborting addLeaderLine: No texture specified');
        return;
      }
      if (!((texture.indexOf("http") > -1) || (texture.indexOf("file") > -1) || (texture.indexOf("data") > -1))) {
        texture = resolvePath(texture);
      }
      var nbsc = (nbScreenCoord === undefined) ? "0" : nbScreenCoord;
      var ps = (pointSize === undefined) ? "40" : pointSize;
      var lw = (lineWidth === undefined) ? "5" : lineWidth;
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "addLeaderLine", [trackerName, name, vertices, color, texture, nbsc, ps, lw, parent]);
    },

    //FIXME: NEW needs to be added to ThreeD.threeDIfc
    append3DObject: function (name, mode, indexes, color, successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "append3DObject", [name, mode, indexes, color]);
    },

    //FIXME: NEW needs to be added to ThreeD.threeDIfc
    addEmitter: function (trackerName, name, particles, radius, velocity, decay, gravity, spread, size, mass, rate, wind, blend, color, texture, parent, successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "addEmitter", [trackerName, name, particles, radius, velocity, decay, gravity, spread, size, mass, rate, wind, blend, color, texture, parent]);
    },

    addGroup: function (trackerName, name, parent, successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "addGroup", [trackerName, name, parent]);
    },

    //NOTE Change in signature consistency is to address
    addMarker: function (trackerName, name, src, size, successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "addMarker", [trackerName, name, src, size]);
    },

    //FIXME: SIG CHANGE: add3DImage in ThreeD.threeDIfc needs to be ported with new args: lx,ly,anchor
    add3DImage: function (trackerName, name, image, parent, lx, ly, anchor, successCallback, errorCallback) {
      if (image === undefined) {
        console.debug('Aborting add3DImage: No image specified.');
        return;
      }
      if (!((image.indexOf("http") > -1) || (image.indexOf("file") > -1) || (image.indexOf("data") > -1))) {
        image = resolvePath(image);
      }
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "add3DImage", [trackerName, name, image, parent, lx, ly, anchor]);
    },

    setTexture: function (name, texture, successCallback, errorCallback) {
      if (texture === undefined) {
        console.debug('Aborting setTexture: No texture specified.');
        return;
      }
      if (!((texture.indexOf("http") > -1) || (texture.indexOf("file") > -1) || (texture.indexOf("data") > -1))) {
        texture = resolvePath(texture);
      }
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "setTexture", [name, texture]);
    },

    setColor: function (name, color, successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "setColor", [name, color]);
    },

    setProperties: function (name, props, successCallback, errorCallback) {
      //transformation of incoming values is handled locally to the function that uses them
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "setProperties", [name, props]);
    },

    getAllPropertyValues: function (name, successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "getAllPropertyValues", [name]);
    },

    setTranslation: function (name, ax, ay, az, successCallback, errorCallback) {
      var x = (ax === undefined) ? 0.0 : ax;
      var y = (ay === undefined) ? 0.0 : ay;
      var z = (az === undefined) ? 0.0 : az;
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "setTranslation", [name, x, y, z]);
    },

    setRotation: function (name, ax, ay, az, successCallback, errorCallback) {
      var x = (ax === undefined) ? 0.0 : ax;
      var y = (ay === undefined) ? 0.0 : ay;
      var z = (az === undefined) ? 0.0 : az;
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "setRotation", [name, x, y, z]);
    },

    setScale: function (name, ax, ay, az, successCallback, errorCallback) {
      var x = (ax === undefined) ? 1.0 : ax;
      var y = (ay === undefined) ? 1.0 : ay;
      var z = (az === undefined) ? 1.0 : az;
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "setScale", [name, x, y, z]);
    },

    setupAREventsCommand: function (successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "setupAREventsCommand");
    },

    setupTrackingEventsCommand: function (successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "setupTrackingEventsCommand");
    },

    transform: function (name, dx, dy, dz, drx, dry, drz, successCallback, errorCallback) {
      var x = (dx === undefined) ? 0.0 : dx;
      var y = (dy === undefined) ? 0.0 : dy;
      var z = (dz === undefined) ? 0.0 : dz;
      var rx = (drx === undefined) ? 0.0 : drx;
      var ry = (dry === undefined) ? 0.0 : dry;
      var rz = (drz === undefined) ? 0.0 : drz;
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "transform", [name, x, y, z, rx, ry, rz]);
    },

    resetAll: function (successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "resetAll");
    },

    reset: function (name, successCallback, errorCallback) {
      CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "reset", [name]);
    },

    setShader: function (name, vertex, fragment, successCallback, errorCallback) {
      //FIXME: Ignoring setShader command
      console.warn('Ignoring setShader command.');
      //CommandDispatcher.exec(successCallback, errorCallback, "Vuforia", "setShader", [name, vertex, fragment]);
    }
  };

  return renderingImpl;
}

})();
