/**
 * @author mrdoob / http://mrdoob.com/
 * Modified by Petrisor Lacatus to adapt to other types of loading
 */
var Loader = function(widget) {

	var scope = this;

	this.texturePath = '';

	this.loadFile = function(filename, url, callback) {

		var extension = url.split('.').pop().split(/\#|\?/)[0].toLowerCase();
		switch (extension) {
			case 'amf':
				new THREE.AMFLoader().load(url, function(model) {
					callback ? callback() : widget.addObjectCommand(model);
				});
				break;

			case 'awd':
				new THREE.AWDLoader().load(url, function(scene) {
					callback ? callback() : widget.setSceneCommand(scene, true);
				});
				break;

			case 'babylon':
				new THREE.BabylonLoader().load(url, function(scene) {
					callback ? callback() : widget.setSceneCommand(scene, true);
				});

				break;

			case 'babylonmeshdata':
				new THREE.XHRLoader().load(url, function name(text) {
					var json = JSON.parse(text);

					var loader = new THREE.BabylonLoader();

					var geometry = loader.parseGeometry(json);
					var material = new THREE.MeshStandardMaterial();

					var mesh = new THREE.Mesh(geometry, material);
					mesh.name = filename;

					callback ? callback() : widget.addObjectCommand(mesh);
				});

				break;

			case 'ctm':
				new THREE.CTMLoader().load(url, function(geometry) {
					geometry.sourceType = "ctm";

					var material = new THREE.MeshStandardMaterial();

					var mesh = new THREE.Mesh(geometry, material);
					mesh.name = filename;

					callback ? callback() : widget.addObjectCommand(mesh);
				});

				break;

			case 'dae':
				new THREE.ColladaLoader().load(url, function(collada) {
					callback ? callback() : widget.addObjectCommand(collada.scene);
				});

				break;

			case 'fbx':
				new THREE.FBXLoader().load(url, function(model) {
					callback ? callback() : widget.addObjectCommand(model);
				});

				break;

			case 'gltf':
				new THREE.glTFLoader().load(url, function(collada) {
					callback ? callback() : widget.addObjectCommand(collada.scene);
				});

				break;

			case 'js':
			case 'json':

			case '3geo':
			case '3mat':
			case '3obj':
			case '3scn':

				new THREE.XHRLoader().load(url, function name(contents) {

					// 2.0

					if (contents.indexOf('postMessage') !== -1) {

						var blob = new Blob([contents], {
							type: 'text/javascript'
						});
						var url = URL.createObjectURL(blob);

						var worker = new Worker(url);

						worker.onmessage = function(event) {

							event.data.metadata = {
								version: 2
							};
							handleJSON(event.data, file, filename);

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

					handleJSON(data, filename);

				});

				break;


			case 'kmz':
				new THREE.KMZLoader().load(url, function(collada) {
					callback ? callback() : widget.addObjectCommand(collada.scene);
				});

				break;

			case 'md2':
				new THREE.MD2Loader().load(url, function(geometry) {
					var material = new THREE.MeshStandardMaterial({
						morphTargets: true,
						morphNormals: true
					});

					var mesh = new THREE.Mesh(geometry, material);
					mesh.mixer = new THREE.AnimationMixer(mesh);
					mesh.name = filename;

					callback ? callback() : widget.addObjectCommand(mesh);
				});

				break;

			case 'obj':
				new THREE.OBJLoader().load(url, function(object) {
					callback ? callback() : widget.addObjectCommand(object);
				});


				break;

			case 'playcanvas':
				new THREE.PlayCanvasLoader().load(url, function(object) {
					callback ? callback() : widget.addObjectCommand(object);
				});
				break;

			case 'ply':
				new THREE.PLYLoader().load(url, function(geometry) {
					geometry.sourceType = "ply";
					geometry.sourceFile = filename;

					var material = new THREE.MeshStandardMaterial();

					var mesh = new THREE.Mesh(geometry, material);
					mesh.name = filename;

					callback ? callback() : widget.addObjectCommand(mesh);
				});

				break;
			case 'pvz':
				function loadPvzFile(file, successCallback, failCallback) {
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


				// wait a bit because we can get a error Assertion failed: you need to wait for the runtime to be ready (e.g. wait for main() to be called)

				if (window.cvApiInited) {
					setTimeout(function() {
						loadPvzFile(url, callback ? callback() : widget.addObjectCommand, function() {
							alert("Failed to load the PVZ");
						});
					}, 200);
				} else {
					CVThreeLoader.Init('/Thingworx/Common/extensions/ThreeModelViewer_ExtensionPackage/ui/ThreeModelViewer/loaders/libthingload', function() {
						console.log('CVThreeLoader Ready');
						window.cvApiInited = true;

						setTimeout(function() {
							loadPvzFile(url, callback ? callback() : widget.addObjectCommand, function() {
								alert("Failed to load the PVZ");
							});
						}, 200);

					});
				}
				break;
			case 'stl':
				new THREE.STLLoader().load(url, function(geometry) {
					geometry.sourceType = "stl";
					geometry.sourceFile = filename;
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
					mesh.name = filename;

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
				new THREE.VTKLoader().load(url, function(geometry) {
					geometry.sourceType = "vtk";
					geometry.sourceFile = filename;

					var material = new THREE.MeshStandardMaterial();

					var mesh = new THREE.Mesh(geometry, material);
					mesh.name = filename;

					callback ? callback() : widget.addObjectCommand(mesh);
				});
				break;

			case 'wrl':
				new THREE.VRMLLoader().load(url, function(scene) {
					callback ? callback() : widget.setSceneCommand(scene, true);
				});

				break;

			default:

				alert('Unsupported file format (' + extension + ').');

				break;

		}
	};

	function handleJSON(data, filename) {

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
				loader.parse(data, function(result) {

					widget.setSceneCommand(result.scene);

				}, '');

				break;
		}
	}
};