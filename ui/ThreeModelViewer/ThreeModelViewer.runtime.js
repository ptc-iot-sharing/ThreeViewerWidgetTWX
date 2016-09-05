TW.Runtime.Widgets.ThreeModelViewer = function() {
    var thisWidget = this;
    // controls of the OrbitControls
    var controls;
    var renderer;
    // the current scene
    var scene;
    // since we can rotate the mode, expose the pivot and camera target to the function
    var pivot;
    // where we are curretly looking at
    var cameraTarget;
    // the PerspectiveCamera
    var camera;
    var loader = new Loader(thisWidget);
    // are we viewing a single model or a complex scene
    var defaultScene = false;
    // needed for the inset Rendering
    var insetRenderer, insetCamera, insetScene;

    var renderRequest;
    /**
     * Initialize the default scene for viweing single models
     */
    this.initializeScene = function() {
        scene = new THREE.Scene();

        /// Global : group
        group = new THREE.Group();
        scene.add(group);

        // Lights
        thisWidget.addLights();

        if (thisWidget.getProperty("DrawGridHelpers")) {
            group.add(new THREE.GridHelper(20, 10));
        }

        cameraTarget = new THREE.Vector3();
        camera.position.z = 4;
        camera.position.y = 12;
        camera.position.x = 7;
        pivot = new THREE.Group();
        scene.add(pivot);
        defaultScene = true;
    };

    /**
     * Adds lights to the scene. This includes abient lights and directional lights in each corner
     */
    this.addLights = function() {
        /// ambient light
        var ambientLight = new THREE.AmbientLight(0x404040); //, 0.8);
        scene.add(ambientLight);
        //

        /// light in every corner
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
    };

    /**
     * Adds a new object to the scene. It first attempts to place it in the origin, then positions the camera in its best position to view it
     */
    this.addObjectCommand = function(model) {
        if (!defaultScene || thisWidget.getProperty("ResetSceneOnModelChange")) {
            thisWidget.initializeScene();
        }
        var bbox = new THREE.Box3().setFromObject(model);
        // if the model is a bit too big or too small, we'll try to scale it a bit.
        // this means scaling a model of a bbox of 600 down by 0.05
        var scaleVector = new THREE.Vector3(1, 1, 1);
        scaleVector.setLength(30 / bbox.max.length());
        model.scale.copy(scaleVector);
        // recompute the bbox after scaling
        bbox = new THREE.Box3().setFromObject(model);

        // make sure that the bbox is not infinity
        if (isFinite(bbox.max.length())) {
            bbox.center(model.position); // this re-sets the model position
            model.position.multiplyScalar(-1);
            model.position.y = -bbox.min.y;
            pivot.add(model);
            cameraTarget.y = (bbox.max.y - bbox.min.y) / 2;
            var cameraPos = bbox.min.clone();
            // this is a bit of a hack. But it moves the camera 2.5 times the vector away to the max bbox
            cameraPos.x = Math.abs(cameraPos.x);
            cameraPos.y = Math.abs(cameraPos.y);
            cameraPos.z = Math.abs(cameraPos.z);

            cameraPos.setLength(cameraPos.length() * 2.5);
            camera.position.copy(cameraPos);
        } else {
            console.error("Failed to set camera position. Bounding box was infinity");
        }
        scene.add(model);

        console.log("Changed model");
    };

    /**
     * Sets a new scene 
     */
    this.setSceneCommand = function(sceneObject, addLights) {
        scene = sceneObject;
        if (addLights && thisWidget.getProperty("AddLightsToSceneFiles")) {
            thisWidget.addLights();
        }
        // search the scene if we have a camera. If so, clone it
        for (var index = 0; index < sceneObject.children.length; index++) {
            var element = sceneObject.children[index];
            if (element instanceof THREE.PerspectiveCamera) {
                thisWidget.setCameraCommand(element);
            }
        }
        defaultScene = false;
        console.log("Changed Scene");
    };

    /**
     * Set the camera position 
     */
    this.setCameraCommand = function(newCamera) {
        camera.position.copy(newCamera.position);
        camera.rotation.copy(newCamera.rotation);
    };

    // the html is really simple. Just a ccanvas
    this.renderHtml = function() {
        return '<div class="widget-content widget-ThreeModelViewer"><canvas></canvas><div class="inset"></div></div>';
    };

    this.afterRender = function() {
        if (!Detector.webgl) Detector.addGetWebGLMessage();

        var canvas = this.jqElement.find("canvas").get(0);

        renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: canvas,
            alpha: true
        });
        // renderer.setPixelRatio (window.devicePixelRatio);
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 10000);

        if (thisWidget.getProperty("DrawAxisHelpers")) {
            setupInset();
        }

        // whenever the canvas resizes, we must be responsive.
        // so watch for canvas resizes via an interval
        function onResize(element, callback) {
            var height = element.clientHeight * window.devicePixelRatio;
            var width = element.clientWidth * window.devicePixelRatio;

            return setInterval(function() {
                if (element.clientHeight != height || element.clientWidth != width) {
                    height = element.clientHeight * window.devicePixelRatio;
                    width = element.clientWidth * window.devicePixelRatio;
                    callback();
                }
            }, 500);
        }
        onResize(canvas, function() {
            canvas.width = canvas.clientWidth * window.devicePixelRatio;
            canvas.height = canvas.clientHeight * window.devicePixelRatio;
            renderer.setViewport(0, 0, canvas.clientWidth * window.devicePixelRatio, canvas.clientHeight * window.devicePixelRatio);
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        });
        renderer.setViewport(0, 0, canvas.clientWidth * window.devicePixelRatio, canvas.clientHeight * window.devicePixelRatio);

        // set the initial background color
        if (thisWidget.getProperty('BackgroundStyle') === undefined) {
            renderer.setClearColor(0xDEE0E1, 0.3); //0xb0b0b0 or 0xFFFFFF   background color
        } else {
            handleBackgroundColor();
        }
        // create the scene, add lights and pivot
        thisWidget.initializeScene();
        // add the orbit controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        if (!thisWidget.getProperty("CameraControls")) {
            controls.enableZoom = false;
            controls.enableKeys = false;
            controls.enableRotate = false;
            controls.enablePan = false;
        }
        if (thisWidget.getProperty("CameraAutoRotate")) {
            controls.autoRotate = true;
        }
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;

        var domElementId = this.jqElementId;
        var wt = document.getElementById(domElementId);
        wt.appendChild(renderer.domElement);

        var render = function() {
            renderRequest = requestAnimationFrame(render);
            controls.target = cameraTarget;
            controls.update();
            if (pivot) {
                /* var rot = new THREE.Vector3(-thisWidget.getProperty('Roll'), thisWidget.getProperty('Heading') - 180, -thisWidget.getProperty('Pitch'));
                 rot.multiplyScalar(Math.PI / 180);
                 pivot.rotation.order = "YXZ";
                 pivot.rotation.setFromVector3(rot);*/
            }
            renderer.render(scene, camera);
            // also render the insets if they were initialzed 
            if (insetCamera && insetRenderer) {
                renderInsets();
            }
        };
        // if we had a model set, then attempt to load it
        if (thisWidget.getProperty("ModelUrl")) {
            loader.loadFile(thisWidget.getProperty("ModelType"), thisWidget.getProperty("ModelUrl"));
        }

        render();
    };


    this.updateProperty = function(updatePropertyInfo) {
        thisWidget.setProperty(updatePropertyInfo.TargetProperty, updatePropertyInfo.RawSinglePropertyValue);
        if (updatePropertyInfo.TargetProperty === "BackgroundStyle") {
            handleBackgroundColor();
        }
        if (updatePropertyInfo.TargetProperty === "ModelUrl") {
            loader.loadFile(thisWidget.getProperty("ModelType"), updatePropertyInfo.RawSinglePropertyValue);
        }
    };

    this.clearScene = function() {
        for (var i = scene.children.length - 1; i >= 0; i--) {
            obj = scene.children[i];
            scene.remove(obj);
        }
    };

    function handleBackgroundColor() {
        thisWidget.BackgroundStyle = TW.getStyleFromStyleDefinition(thisWidget.getProperty('BackgroundStyle', ''));
        if (thisWidget.BackgroundStyle.backgroundColor) {
            // we have a rgba value, handle it with opacity
            if (thisWidget.BackgroundStyle.backgroundColor.startsWith("rgba")) {
                var color = rgba2hex(thisWidget.BackgroundStyle.backgroundColor);
                renderer.setClearColor(color.color, color.opacity);
            } else {
                renderer.setClearColor(thisWidget.BackgroundStyle.backgroundColor);
            }
        }
    }

    /**
     * Extract the color and opacity form a rgba color
     */
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

    function setupInset() {
        var insetWidth = 150,
            insetHeight = 150;
        var insetContainer = thisWidget.jqElement.find(".inset").get(0);
        insetContainer.width = insetWidth;
        insetContainer.height = insetHeight;

        // renderer
        insetRenderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        // make sure this is transparent
        insetRenderer.setClearColor(0x000000, 0);
        insetRenderer.setSize(insetWidth, insetHeight);
        insetContainer.appendChild(insetRenderer.domElement);

        // scene
        insetScene = new THREE.Scene();

        // camera
        insetCamera = new THREE.PerspectiveCamera(50, insetWidth / insetHeight, 1, 1000);
        insetCamera.up = camera.up; // important!

        // axes
        insetScene.add(new THREE.AxisHelper(100));
    }

    function renderInsets() {
        //copy position of the camera into inset
        insetCamera.position.copy(camera.position);
        insetCamera.position.sub(controls.target);
        insetCamera.position.setLength(300);
        insetCamera.lookAt(insetScene.position);

        insetRenderer.render(insetScene, insetCamera);
    }
    this.beforeDestroy = function() {
        window.cancelAnimationFrame(renderRequest);
    };

};