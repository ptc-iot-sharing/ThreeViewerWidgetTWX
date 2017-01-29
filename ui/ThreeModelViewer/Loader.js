/**
 * @author mrdoob / http://mrdoob.com/
 * Modified by Petrisor Lacatus to adapt to other types of loading
 */
var Loader = function (widget) {

	var scope = this;

	this.texturePath = '';

	// animation mixer used for all the models
	var mixer;

	this.loadFile = function (modelType, url, texturePath, callback) {

		var extension = modelType == "Auto-Detect" ? url.split('.').pop().split(/\#|\?/)[0].toLowerCase() : modelType;
		// handle the texture path. If it's set, then use it. If not, get it from the URL
		texturePath = texturePath ? texturePath : url.substring(0, url.lastIndexOf("/") + 1);
		switch (extension) {
			case '3mf':
				new THREE.ThreeMFLoader().load(url, function (model) {
					callback ? callback() : widget.addObjectCommand(model);
				});
				break;
			case 'amf':
				new THREE.AMFLoader().load(url, function (model) {
					callback ? callback() : widget.addObjectCommand(model);
				});
				break;
			case 'assimpjson':
				new THREE.AssimpJSONLoader().load(url, function (model) {
					callback ? callback() : widget.addObjectCommand(model);
				});
				break;
			case 'assimp':
				new THREE.AssimpLoader().load(url, function (error, model) {
					var clock = new THREE.Clock();
					callback ? callback() : widget.addObjectCommand(model.object, function () {
						model.animation.setTime(clock.getElapsedTime());
					});
				});
				break;
			case 'awd':
				new THREE.AWDLoader().load(url, function (scene) {
					callback ? callback() : widget.setSceneCommand(scene);
				});
				break;

			case 'babylon':
				new THREE.BabylonLoader().load(url, function (scene) {
					callback ? callback() : widget.setSceneCommand(scene);
				});

				break;

			case 'babylonmeshdata':
				new THREE.FileLoader().load(url, function name(text) {
					var json = JSON.parse(text);

					var loader = new THREE.BabylonLoader();

					var geometry = loader.parseGeometry(json);
					var material = new THREE.MeshStandardMaterial();

					var mesh = new THREE.Mesh(geometry, material);
					mesh.name = modelType;

					callback ? callback() : widget.addObjectCommand(mesh);
				});

				break;

			case 'ctm':
				new THREE.CTMLoader().load(url, function (geometry) {
					geometry.sourceType = "ctm";

					var material = new THREE.MeshStandardMaterial();

					var mesh = new THREE.Mesh(geometry, material);
					mesh.name = modelType;

					callback ? callback() : widget.addObjectCommand(mesh);
				});

				break;

			case 'dae':
				var colladaLoader = new THREE.ColladaLoader();
				colladaLoader.options.convertUpAxis = true;
				colladaLoader.load(url, function (collada) {
					callback ? callback() : widget.addObjectCommand(collada.scene);
				});

				break;

			case 'fbx':
				var fbxLoader = new THREE.FBXLoader();
				// TODO: setting the texture path is no longer supported in FBXLoader2
				// if we already have a mixer set, then reuse it
				if (mixer) {
					mixer.stopAllAction();
				}
				var clock = new THREE.Clock();
				fbxLoader.load(url, function (object) {
					var animations = object.animations;
					if (animations && animations.length) {
						mixer = new THREE.AnimationMixer(object);
						for (var i = 0; i < animations.length; i++) {
							mixer.clipAction(animations[i]).play();
						}
					}
					callback ? callback() : widget.addObjectCommand(object, function () {
						if (mixer) {
							mixer.update(clock.getDelta());
						}
					})
				});

				break;

			case 'glb':
			case 'gltf':
				new THREE.GLTFLoader().load(url, function (gltf) {
					// if we already have a mixer set, then reuse it
					if (mixer) {
						mixer.stopAllAction();
					}
					var object = gltf.scene !== undefined ? gltf.scene : gltf.scenes[0];
					var animations = gltf.animations;
					if (animations && animations.length) {
						mixer = new THREE.AnimationMixer(object);
						for (var i = 0; i < animations.length; i++) {
							mixer.clipAction(animations[i]).play();
						}
					}
					var clock = new THREE.Clock();
					callback ? callback() : widget.addObjectCommand(object, function (scene, camera) {
						if (mixer) {
							mixer.update(clock.getDelta());
						}
						THREE.GLTFLoader.Shaders.update(scene, camera);
					});
				});

				break;

			case 'js':
			case 'json':

			case '3geo':
			case '3mat':
			case '3obj':
			case '3scn':

				new THREE.FileLoader().load(url, function name(contents) {

					// 2.0

					if (contents.indexOf('postMessage') !== -1) {

						var blob = new Blob([contents], {
							type: 'text/javascript'
						});
						var url = URL.createObjectURL(blob);

						var worker = new Worker(url);

						worker.onmessage = function (event) {

							event.data.metadata = {
								version: 2
							};
							handleJSON(event.data, file, texturePath);

						};

						worker.postMessage(Date.now());

						return;

					}

					// >= 3.0

					var data;

					try {

						data = JSON.parse(contents);

					} catch (error) {

						alert(error);
						return;

					}

					handleJSON(data, modelType, texturePath);

				});

				break;


			case 'kmz':
				new THREE.KMZLoader().load(url, function (collada) {
					callback ? callback() : widget.addObjectCommand(collada.scene);
				});

				break;

			case 'md2':
				new THREE.MD2Loader().load(url, function (geometry) {
					var material = new THREE.MeshStandardMaterial({
						morphTargets: true,
						morphNormals: true
					});

					var mesh = new THREE.Mesh(geometry, material);
					mesh.mixer = new THREE.AnimationMixer(mesh);
					mesh.name = modelType;

					callback ? callback() : widget.addObjectCommand(mesh);
				});

				break;

			case 'obj':
				// try to load a mtl in the same folder as the obj
				// find the path to the mtl

				var objLoader = new THREE.OBJLoader();
				var loadObjFunction = function () {
					objLoader.load(url, function (object) {
						callback ? callback() : widget.addObjectCommand(object);
					});
				};
				var mtlPath;
				if (/.*\/(.*)\..*/.exec(url).length > 0) {
					mtlPath = /.*\/(.*)\..*/.exec(url)[1] + ".mtl";
				}
				var mtlLoader = new THREE.MTLLoader();
				mtlLoader.setPath(texturePath);
				mtlLoader.load(mtlPath, function (materials) {
					materials.preload();
					objLoader.setMaterials(materials);
					loadObjFunction();
				}, undefined, loadObjFunction);

				break;

			case 'playcanvas':
				new THREE.PlayCanvasLoader().load(url, function (object) {
					callback ? callback() : widget.addObjectCommand(object);
				});
				break;

			case 'ply':
				new THREE.PLYLoader().load(url, function (geometry) {
					geometry.sourceType = "ply";
					geometry.sourceFile = modelType;

					var material = new THREE.MeshStandardMaterial();

					var mesh = new THREE.Mesh(geometry, material);
					mesh.name = modelType;

					callback ? callback() : widget.addObjectCommand(mesh);
				});

				break;

			case 'ol':
			case 'pvt':
			case 'pvz':
				var loadingManager = THREE.DefaultLoadingManager;
				loadingManager.itemStart(url);

				function loadPvzFile(file, successCallback, failCallback) {
					try {
						var createhierarchy = true;
						CVThreeLoader.LoadModel(file, function (obj) {
								loadingManager.itemEnd(url);
								successCallback(obj);
							},
							function (obj) {
								loadingManager.itemError(url);
								if (failCallback) failCallback();
							},
							createhierarchy);
					} catch (e) {
						console.error('CVThreeLoader::LoadModel failed. Error: %o', e);
						loadingManager.itemError(url);
						if (failCallback) failCallback();
					} finally {

					}
				}

				// wait a bit because we can get a error Assertion failed: you need to wait for the runtime to be ready (e.g. wait for main() to be called)
				if (window.cvApiInited) {
					setTimeout(function () {
						loadPvzFile(url, callback ? callback() : widget.addObjectCommand, function () {
							//alert("Failed to load the PVZ");
						});
					}, 200);
				} else {
					CVThreeLoader.Init('/Thingworx/Common/extensions/ThreeModelViewer_ExtensionPackage/ui/ThreeModelViewer/loaders/libthingload', function () {
						console.log('CVThreeLoader Ready');
						window.cvApiInited = true;

						setTimeout(function () {
							loadPvzFile(url, callback ? callback() : widget.addObjectCommand, function () {
								//alert("Failed to load the PVZ");
							});
						}, 200);

					});
				}
				break;
			case 'sea':
				// the sea loader is a bit wierd, because it adds stuff to the scene by itself
				// so create a new scene
				var scene = new THREE.Scene();
				var loader = new THREE.SEA3D({
					autoPlay: true, // Auto play animations
					container: scene // Container to add models
				});
				loader.load(url);
				loader.onComplete = function (e) {
					if (loader.cameras[0]) {
						// set the camera if we have one in the scene
						widget.setCameraCommand(loader.cameras[0]);
					}
					callback ? callback() : widget.setSceneCommand(scene);
					animate();
				};

				var clock = new THREE.Clock();

				function animate() {
					var delta = clock.getDelta();
					requestAnimationFrame(animate);
					// Update SEA3D Animations
					THREE.SEA3D.AnimationHandler.update(delta);
				}
				break;

			case 'stl':
				new THREE.STLLoader().load(url, function (geometry) {
					geometry.sourceType = "stl";
					geometry.sourceFile = modelType;
					var material;
					if (geometry.hasColors) {
						material = new THREE.MeshPhongMaterial({
							opacity: geometry.alpha,
							vertexColors: THREE.VertexColors
						});
					} else {
						material = new THREE.MeshStandardMaterial();
					}


					var mesh = new THREE.Mesh(geometry, material);
					mesh.name = modelType;

					callback ? callback() : widget.addObjectCommand(mesh);
				});

				break;

				/*
				case 'utf8':

					reader.addEventListener( 'load', function ( event ) {

						var contents = event.target.result;

						var geometry = new THREE.UTF8Loader().parse( contents );
						var material = new THREE.MeshLambertMaterial();

						var mesh = new THREE.Mesh( geometry, material );

						widget.execute( new AddObjectCommand( mesh ) );

					}, false );
					reader.readAsBinaryString( file );

					break;
				*/

			case 'vtk':
				new THREE.VTKLoader().load(url, function (geometry) {
					geometry.sourceType = "vtk";
					geometry.sourceFile = modelType;

					var material = new THREE.MeshStandardMaterial();

					var mesh = new THREE.Mesh(geometry, material);
					mesh.name = modelType;

					callback ? callback() : widget.addObjectCommand(mesh);
				});
				break;

			case 'wrl':
				new THREE.VRMLLoader().load(url, function (scene) {
					callback ? callback() : widget.setSceneCommand(scene);
				});

				break;

			default:

				alert('Unsupported file format (' + extension + ').');

				break;

		}
	};

	function handleJSON(data, filename, texturePath) {

		if (data.metadata === undefined) { // 2.0

			data.metadata = {
				type: 'Geometry'
			};

		}

		if (data.metadata.type === undefined) { // 3.0

			data.metadata.type = 'Geometry';

		}

		if (data.metadata.formatVersion !== undefined) {

			data.metadata.version = data.metadata.formatVersion;

		}

		switch (data.metadata.type.toLowerCase()) {

			case 'buffergeometry':

				var loader = new THREE.BufferGeometryLoader();
				var result = loader.parse(data);

				var mesh = new THREE.Mesh(result);

				widget.addObjectCommand(mesh);

				break;

			case 'geometry':

				var loader = new THREE.JSONLoader();

				var result = loader.parse(data);

				var geometry = result.geometry;
				var material;

				if (result.materials !== undefined) {

					if (result.materials.length > 1) {

						material = new THREE.MultiMaterial(result.materials);

					} else {

						material = result.materials[0];

					}

				} else {

					material = new THREE.MeshStandardMaterial();

				}

				geometry.sourceType = "ascii";
				geometry.sourceFile = filename;

				var mesh;

				if (geometry.animation && geometry.animation.hierarchy) {

					mesh = new THREE.SkinnedMesh(geometry, material);

				} else {

					mesh = new THREE.Mesh(geometry, material);

				}

				mesh.name = filename;

				widget.addObjectCommand(mesh);

				break;

			case 'object':

				var loader = new THREE.ObjectLoader();
				loader.texturePath = texturePath;

				var result = loader.parse(data);

				if (result instanceof THREE.Scene) {

					widget.setSceneCommand(result);
				} else {
					widget.addObjectCommand(result);
				}

				break;

			case 'scene':

				// DEPRECATED

				var loader = new THREE.SceneLoader();
				loader.parse(data, function (result) {

					widget.setSceneCommand(result.scene);

				}, texturePath);

				break;
		}
	}
};