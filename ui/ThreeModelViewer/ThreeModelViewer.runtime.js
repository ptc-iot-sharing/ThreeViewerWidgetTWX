TW.Runtime.Widgets.ThreeModelViewer = function() {
    var thisWidget = this;
    var controls;
    var renderer;

    function rgba2hex(rgb) {
        rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)(\s|,)*(([0-9]*[.])?[0-9]+)?/i);
        return (rgb) ? {
            color: "#" +
                ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
                ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
                ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2),
            opacity: rgb[5]
        } : '';
    }
    this.renderHtml = function() {
        return '<div class="widget-content widget-ThreeModelViewer"><canvas></canvas></div>';
    };

    this.afterRender = function() {
        if (!Detector.webgl) Detector.addGetWebGLMessage();

        var cameraTarget;
        var model;

        var canvas = this.jqElement.find("canvas").get(0);

        var scene = new THREE.Scene();
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: canvas,
            alpha: true
        });
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        var camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);

        function onResize(element, callback) {
            var height = element.clientHeight;
            var width = element.clientWidth;

            return setInterval(function() {
                if (element.clientHeight != height || element.clientWidth != width) {
                    height = element.clientHeight;
                    width = element.clientWidth;
                    callback();
                }
            }, 500);
        }
        onResize(canvas, function() {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            renderer.setViewport(0, 0, canvas.clientWidth, canvas.clientHeight);
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        });
        renderer.setViewport(0, 0, canvas.clientWidth, canvas.clientHeight);
        if (thisWidget.getProperty('BackgroundStyle') == undefined) {
            renderer.setClearColor(0xDEE0E1, 0.3); //0xb0b0b0 or 0xFFFFFF   background color
        } else {
            thisWidget.BackgroundStyle = TW.getStyleFromStyleDefinition(thisWidget.getProperty('BackgroundStyle', ''));
            if (thisWidget.BackgroundStyle.backgroundColor) {
                debugger;
                // we have a rgba value, handle it with opacity
                if (thisWidget.BackgroundStyle.backgroundColor.startsWith("rgba")) {
                    var color = rgba2hex(thisWidget.BackgroundStyle.backgroundColor);
                    renderer.setClearColor(color.color, color.opacity);
                } else {
                    renderer.setClearColor(thisWidget.BackgroundStyle.backgroundColor);
                }
            }
        }


        // scene.fog = new THREE.Fog( 0x72645b, 2, 15 );

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.75;
        controls.enableZoom = true;

        var domElementId = this.jqElementId;
        var wt = document.getElementById(domElementId);
        wt.appendChild(renderer.domElement);

        /// Global : group
        group = new THREE.Group();
        scene.add(group);

        // Lights
        var addShadowedLight = function(x, y, z, color, intensity) {
            var directionalLight = new THREE.PointLight(color, intensity);
            directionalLight.position.set(x, y, z);
            scene.add(directionalLight);
            directionalLight.castShadow = true;
            var d = 1;

        };

        /// ambient light
        var ambientLight = new THREE.AmbientLight(0x404040); //, 0.8);
        scene.add(ambientLight);
        //

        /// FROM PREVEW3d
        // _scene.add(new THREE.AmbientLight(0x404040));
        var directionalLight = new THREE.DirectionalLight(0xa6a6a6, 1);
        directionalLight.position.set(0, 1, 0);

        var dl1 = new THREE.DirectionalLight(0xa6a6a6, 0.8);
        var dl2 = dl1.clone();
        var dl3 = dl1.clone();
        var dl4 = dl1.clone();
        // dl1.layers.mask = dl2.layers.mask = dl3.layers.mask = dl4.layers.mask = 0xff;

        dl1.position.set(0, 0, -1);
        dl2.position.set(0, 0, 1);
        dl3.position.set(1, 0, 0);
        dl4.position.set(-1, 0, 0);
        scene.add(directionalLight, dl1, dl2, dl3, dl4);


        /// helpers, backgroup grids, axes
        var helper = new THREE.GridHelper(12, 2.0); // originally 4, 0.5
        var axes = new THREE.AxisHelper(8);
        group.add(helper);


        cameraTarget = new THREE.Vector3();
        camera.position.z = 4;
        camera.position.y = 12;
        camera.position.x = 7;
        var pivot = new THREE.Group();

        function loadFile(file, successCallback, failCallback) {
            try {
                var createhierarchy = true;
                CVThreeLoader.LoadModel(file, function(obj) {
                        successCallback(obj);
                    },
                    function(obj) {
                        if (failCallback) failCallback();
                    },
                    createhierarchy);
            } catch (e) {
                console.error('CVThreeLoader::LoadModel failed. Error: %o', e);
                if (failCallback) failCallback();
            } finally {

            }
        }

        var localSuccessCallBack = function(model) {
            scene.add(model);
            // scale it up, since the original model is really small
            model.scale.set(100, 100, 100);
            var bbox = new THREE.Box3().setFromObject(model);
            bbox.center(model.position); // this re-sets the model position
            model.position.multiplyScalar(-1);
            model.position.y = -bbox.min.y;
            scene.add(pivot);
            pivot.add(model);
            cameraTarget.y = (bbox.max.y - bbox.min.y) / 2;
        };
        // wait a bit because we can get a error Assertion failed: you need to wait for the runtime to be ready (e.g. wait for main() to be called)

        if (window.cvApiInited) {
            setTimeout(function() {
                loadFile("/Thingworx/Common/extensions/ThreeModelViewer_ExtensionPackage/ui/ThreeModelViewer/iotKit.pvz", localSuccessCallBack, function() {
                    alert("Failed to load the PVZ");
                });
            }, 200);
        } else {
            CVThreeLoader.Init('/Thingworx/Common/extensions/ThreeModelViewer_ExtensionPackage/ui/ThreeModelViewer/', function() {
                console.log('CVThreeLoader Ready');
                window.cvApiInited = true;

                setTimeout(function() {
                    loadFile("/Thingworx/Common/extensions/ThreeModelViewer_ExtensionPackage/ui/ThreeModelViewer/iotKit.pvz", localSuccessCallBack, function() {
                        alert("Failed to load the PVZ");
                    });
                }, 200);

            });
        }



        // USING mtl+obj 
        /*var mtlLoader = new THREE.MTLLoader();
        mtlLoader.setPath("/Thingworx/Common/extensions/ThreeModelViewer_ExtensionPackage/ui/ThreeModelViewer/");
        mtlLoader.load('iotKit.mtl', function(materials) {

            materials.preload();

            var objLoader = new THREE.OBJLoader();
            objLoader.setMaterials(materials);
            objLoader.setPath("/Thingworx/Common/extensions/ThreeModelViewer_ExtensionPackage/ui/ThreeModelViewer/");
            objLoader.load('iotKit.obj', function(object) {

                scene.add(object);
                model = object;
                var bbox = new THREE.Box3().setFromObject(object);
                bbox.center(model.position); // this re-sets the model position
                model.position.multiplyScalar(-1);
                model.position.y = -bbox.min.y;
                scene.add(pivot);
                pivot.add(model);
                cameraTarget.y = (bbox.max.y - bbox.min.y) / 2;
            });

        });*/
        /*
        // COLLADA LOADER
        var loader = new THREE.ColladaLoader();
        loader.load( '/Thingworx/Common/extensions/ThreeModelViewer_ExtensionPackage/ui/ThreeModelViewer/iotKit.dae', function ( object ) {
                object = object.scene;
				scene.add(object);
                model = object;
                var bbox = new THREE.Box3().setFromObject(object);
                bbox.center(model.position); // this re-sets the model position
                model.position.multiplyScalar(-1);
                model.position.y = -bbox.min.y;
                debugger;
                scene.add(pivot);
                pivot.add(model);
                cameraTarget.y = (bbox.max.y - bbox.min.y)/2;

			} );*/

        // CTM version
        /* var loader = new THREE.CTMLoader();
        loader.load("/Thingworx/Common/extensions/ThreeModelViewer_ExtensionPackage/ui/ThreeModelViewer/iotKit.ctm", function(geometries, materials) {
            debugger;
            var material = new THREE.MeshPhongMaterial();

            var object = new THREE.Mesh(geometries, material);
            scene.add(object);
            model = object;
            var bbox = new THREE.Box3().setFromObject(object);
            bbox.center(model.position); // this re-sets the model position
            model.position.multiplyScalar(-1);
            model.position.y = 0;
            debugger;
            scene.add(pivot);
            pivot.add(model);
            cameraTarget.y = (bbox.max.y - bbox.min.y) / 2;

        }, {
            useWorker: false
        });
*/
        var render = function() {
            requestAnimationFrame(render);
            controls.target = cameraTarget;
            controls.update();
            if (pivot) {
                var rot = new THREE.Vector3(-thisWidget.getProperty('Roll'), thisWidget.getProperty('Heading') - 180, -thisWidget.getProperty('Pitch'));
                rot.multiplyScalar(Math.PI / 180);
                pivot.rotation.order = "YXZ";
                pivot.rotation.setFromVector3(rot);
            }
            renderer.render(scene, camera);
        };

        render();
    };


    this.updateProperty = function(updatePropertyInfo) {
        thisWidget.setProperty(updatePropertyInfo.TargetProperty, updatePropertyInfo.RawSinglePropertyValue);
        if (updatePropertyInfo.TargetProperty === "BackgroundStyle") {
            thisWidget.BackgroundStyle = TW.getStyleFromStyleDefinition(thisWidget.getProperty('BackgroundStyle', ''));
            if (thisWidget.BackgroundStyle.backgroundColor) {
                renderer.setClearColor(thisWidget.BackgroundStyle.backgroundColor);
            }
        }
    };

};