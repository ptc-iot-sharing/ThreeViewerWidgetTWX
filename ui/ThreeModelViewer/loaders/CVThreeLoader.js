"use strict";
var CVThreeLoader = (function() {
    var threeShapeVisitor;
    var threeStructureVisitor;
    var m_modelClass;
    var m_session;
    return {
        Init: function(thingload_dir, done_cb)
        {
            ThingLoad.init(thingload_dir, function () {
                m_session = ThingLoad.CreateSession();
                getMyModelClass();
                done_cb();
            });
        },
        LoadModel: function(url, done_cb, fail_cb, loadAsHierarchy)
        {
            var myModel = new m_modelClass(done_cb, fail_cb, loadAsHierarchy);
            m_session.AddModel(myModel);
            myModel.LoadFromURL(url);
        },
        CreateThreeObjects: function(root, doneCB, loadAsHierarchy)
        {
            var vis;
            if (root != null)
            {
                getStructureVisitor();
                var vis = new threeStructureVisitor(m_session, loadAsHierarchy);
                root.Visit(vis, Module.pvk_BaseInstance_VisitType.DEPTH_FIRST);
                vis.group.updateMatrixWorld(true);
            } else
                return;
            doneCB(vis.group);
        },
    } // End of public functions
    function getMyModelClass() {
        if (m_modelClass == undefined) {
            m_modelClass = Module.Model.extend("Model", {
                __construct: function(doneCb, failCb, loadAsHierarchy)
                {
                    this.__parent.__construct.call(this);
                    this.doneCb = doneCb;
                    this.failCb = failCb;
                    this.loadAsHierarchy = loadAsHierarchy;
                },
                OnLoadComplete: function () {
                    var instance = this.GetInstance();
                    CVThreeLoader.CreateThreeObjects(instance, this.doneCb, this.loadAsHierarchy);
                    
                },
                OnLoadError: function () {
                    console.log("MyModelClass::OnLoadError\n");
                    this.failCb();
                },
                OnLocationChanged: function () {
                    UpdateModelLocation();
                },
            });
        }
    }

    function getStructureVisitor()
    {
        if (threeStructureVisitor == undefined)
        {
            threeStructureVisitor = new Module.InstanceVisitor.extend("InstanceVisitor", {
                __construct: function(session, loadAsHierarchy)
                {
                    this.__parent.__construct.call(this)
                    this.depthObjects = {};
                    this.depthObjects["-1"] = new THREE.Object3D();
                    this.group = this.depthObjects["-1"];
                    this.m_session = session;
                    this.m_loadAsHierarchy = loadAsHierarchy;
                },

                Visit_Instance: function(inst, depth)
                {
                    var shapeInstance = this.m_session.GetShapeInstance(inst)
                    var location = new Module.dg_Location;
                    if (this.m_loadAsHierarchy)
                        inst.GetRelativeLocation(location);
                    else
                        inst.GetLocation(location);
                    var fmat = new Module.FMat44;
                    location.GetFXform(fmat);
                    var buf = fmat.GetBuf();
                    var threeMat4 = new THREE.Matrix4()
                    
                    threeMat4.set( Module.getValue(buf+(0*4), 'float'),
                                   Module.getValue(buf+(4*4) + (0*4), 'float'),
                                   Module.getValue(buf+(8*4) + (0*4), 'float'),
                                   Module.getValue(buf+(12*4) + (0*4), 'float'),

                                   Module.getValue(buf+(1*4), 'float'),
                                   Module.getValue(buf+(4*4)+(1*4), 'float'),
                                   Module.getValue(buf+(8*4)+(1*4), 'float'),
                                   Module.getValue(buf+(12*4)+(1*4), 'float'),

                                   Module.getValue(buf+(2*4), 'float'),
                                   Module.getValue(buf+(4*4)+(2*4), 'float'),
                                   Module.getValue(buf+(8*4)+(2*4), 'float'),
                                   Module.getValue(buf+(12*4)+(2*4), 'float'),

                                   Module.getValue(buf+(3*4), 'float'),
                                   Module.getValue(buf+(4*4)+(3*4), 'float'),
                                   Module.getValue(buf+(8*4)+(3*4), 'float'),
                                   Module.getValue(buf+(12*4)+(3*4), 'float'));

                    threeMat4.set( Module.getValue(buf+(0*4), 'float'),
                                   Module.getValue(buf+(4*4) + (0*4), 'float'),
                                   Module.getValue(buf+(8*4) + (0*4), 'float'),
                                   Module.getValue(buf+(12*4) + (0*4), 'float'),

                                   Module.getValue(buf+(1*4), 'float'),
                                   Module.getValue(buf+(4*4)+(1*4), 'float'),
                                   Module.getValue(buf+(8*4)+(1*4), 'float'),
                                   Module.getValue(buf+(12*4)+(1*4), 'float'),

                                   Module.getValue(buf+(2*4), 'float'),
                                   Module.getValue(buf+(4*4)+(2*4), 'float'),
                                   Module.getValue(buf+(8*4)+(2*4), 'float'),
                                   Module.getValue(buf+(12*4)+(2*4), 'float'),

                                   Module.getValue(buf+(3*4), 'float'),
                                   Module.getValue(buf+(4*4)+(3*4), 'float'),
                                   Module.getValue(buf+(8*4)+(3*4), 'float'),
                                   Module.getValue(buf+(12*4)+(3*4), 'float'));
                    var pos = new THREE.Vector3;
                    pos.setFromMatrixPosition(threeMat4);
                    if (shapeInstance == null || !shapeInstance.IsValid())
                    {
                        if (this.m_loadAsHierarchy)
                        {
                            var group = new THREE.Object3D();
                            group.name = inst.GetIDPath();
                            group.applyMatrix(threeMat4);
                            var parent = depth-1;
                            this.depthObjects[parent].add(group);
                            this.depthObjects[depth] = group;
                        }                         
                        return true;
                    }
                    var shape = shapeInstance.GetGeometry();
                    if (shape && !inst.IsHiddenByDefault())
                    {
                        getShapeVisitor();
                        var vis = new threeShapeVisitor;
                        var appearance = inst.GetAppearanceOverride();
                        if (appearance != null)
                        {
                            vis.SetAppearanceOverride(appearance);
                            appearance.delete();
                        }
                        shape.Accept(vis);

                        vis.group.applyMatrix(threeMat4);
                        vis.group.name = inst.GetIDPath();
                        vis.CreateMeshes();
                        if (this.m_loadAsHierarchy)
                        {
                            var parent = depth-1;
                            this.depthObjects[parent].add(vis.group);
                            this.depthObjects[depth] = vis.group;
                        } else
                            this.depthObjects[-1].add(vis.group);
//                        this.group.add(vis.group);
                        shape.delete();
                    } else
                    {
                        if (this.m_loadAsHierarchy)
                        {
                            var group = new THREE.Object3D();
                            group.name = inst.GetIDPath();
                            group.applyMatrix(threeMat4);
                            var parent = depth-1;
                            this.depthObjects[parent].add(group);
                            this.depthObjects[depth] = group;
                        }
                    }
                    return true;
                },
            });
        }
    }
    function getShapeVisitor()
    {
        if (threeShapeVisitor == undefined)
        {
            threeShapeVisitor = Module.visitor.extend("visitor",{
                __construct: function() {
                    this.__parent.__construct.call(this);
                    this.material = new THREE.MeshBasicMaterial( { color: 0x000000 } );
                    this.group = new THREE.Object3D();
                    this.lastAppearanceId = 0;
                    this.reuseAppearance = 0;
                    this.numPolyForm = 0;
                    this.numMesh = 0;
                    this.appearanceOverrideId = 0;
                    this.appearances = {}
                },
                SetAppearanceOverride: function(appearance)
                {
                    if (appearance)
                    {
                        var color = new THREE.Color(appearance.GetDiffuse(0),appearance.GetDiffuse(1),appearance.GetDiffuse(2));
                        var appearanceId = -1;
                        this.appearances[appearanceId] = { triangleCount: 0};
                        
                        this.appearances[appearanceId].mat = new THREE.MeshPhongMaterial( { color: color } );
                        this.appearances[appearanceId].mat.side = THREE.DoubleSide;
                        
                        this.appearances[appearanceId].meshes = [];
                        this.appearanceOverrideId = -1; // Could becomde the id of this override if necessary
                    }
                },
                Visit_Body: function(body)
                {
                    var bodyType = body.GetBodyType();
                    if (bodyType == Module.BodyType.DATUM)
                        return Module.State.SKIP;
                    return Module.State.CONTINUE;
                },
                Visit_PolyForm: function(pf)
                {
                    var vp = pf.GetVertexPool();
                    this.numPolyForm++;
                    if (this.vertexVec != undefined)
                    {
                        this.vertexVec = undefined;
                        this.vertexPool = undefined;
                    }
                    if (vp)
                    {
                        this.vertexVec = vp.GetVertexVec();
                        this.vertexPool = vp;
                        this.meshArray = [];
			            this.meshTriangleCount = 0;
                        this.meshAppearanceId = 0;
                    }
                    return Module.State.CONTINUE;
                },
                Visit_Face: function(face)
                {
                    if (face && face.IsEnabled())
                        return Module.State.CONTINUE;
                    return Module.State.SKIP;
                },
                Visit_Mesh: function(mesh)
                {
                    var totalTriangles = mesh.GetNumTriStripTriangles();
                    totalTriangles += mesh.GetNumTriFanTriangles();
                    totalTriangles += mesh.GetNumTriangleTriangles();
                    if (totalTriangles == 0)
                        return Module.State.CONTINUE;
                    this.numMesh++;
                    var appearance = mesh.GetAppearance();
                    var color;
                    var reuse = false;

                    var appearanceId = this.appearanceOverrideId;
                    if (appearanceId == 0)
                    {
                        if (appearance)
                        {
                            appearanceId = appearance.GetId();
                            color = new THREE.Color(mesh.GetDiffuse(0),mesh.GetDiffuse(1),mesh.GetDiffuse(2));
                        } else
                        {
                            color = new THREE.Color("rgb(177, 189, 201)");
                        }
                        if (!this.appearances.hasOwnProperty(appearanceId))
                        {
                            var appearanceInfo
                            this.appearances[appearanceId] = { triangleCount: 0};
                            
                            this.appearances[appearanceId].mat = new THREE.MeshPhongMaterial( { color: color } );
                            this.appearances[appearanceId].mat.side = THREE.DoubleSide;
                            
                            this.appearances[appearanceId].meshes = [];
                        }
                    }
                    var meshInfo = {}
                    meshInfo.vertexVec = this.vertexVec;
                    meshInfo.vertexPool = this.vertexPool;
                    meshInfo.mesh = Module.castToPVG_Mesh(mesh);
                    this.appearances[appearanceId].meshes.push(meshInfo);
                    this.appearances[appearanceId].triangleCount += totalTriangles;
                    
                    return Module.State.CONTINUE;
                },
                CreateMeshes: function()
                {
                    for(var key in this.appearances) {
                        this.hasNormals = true;
                        var positions = new Float32Array(this.appearances[key].triangleCount *3 *3);
                        var normals = new Float32Array(this.appearances[key].triangleCount *3 *3);
                        var triangleOffset = 0;
                        for (var i = 0;i < this.appearances[key].meshes.length;i++) {
                            var meshInfo = this.appearances[key].meshes[i];
                            triangleOffset = this.CreateThreeMesh(positions, normals, triangleOffset, meshInfo);
                        }
                        var geometry = new THREE.BufferGeometry();
                        geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
                        if (this.hasNormals)
                            geometry.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
                        else
                        {
                            geometry.computeFaceNormals();
                            geometry.computeVertexNormals();                            
                        }
                        var mesh = new THREE.Mesh(geometry, this.appearances[key].mat);
                        mesh.doubleSided = true;
                        mesh.matrixAutoUpdate = false;
                        this.group.add(mesh);
                    }
                },
                CreateThreeMesh: function(positions, normals, triangle, meshInfo)
                {
                    var stride;
                    var offset;
                    var normalOffset;
                    stride = meshInfo.vertexPool.GetStride();
                    offset = meshInfo.vertexPool.GetPointOffset();
                    normalOffset = meshInfo.vertexPool.GetNormalOffset();
                    if (normalOffset >= 0)
                        this.hasNormals = true;
                    else
                        this.hasNormals = false;
                    var mesh = meshInfo.mesh;
                    var numTriStrips = mesh.GetNumTriStrips();
                    
                    if (numTriStrips)
                    {
                        for (var i =0; i< numTriStrips; i++)
                        {
                            var tp = mesh.GetTriStrip(i);
                            var numTriangles = tp.size()-2;
                            for (var j = 0; j< numTriangles; j++, triangle++)
                            {
                                positions[triangle*3*3] = meshInfo.vertexVec.get((tp.get(j)*stride) + offset);
                                positions[(triangle*3*3)+1] = meshInfo.vertexVec.get((tp.get(j)*stride)+1+offset);
                                positions[(triangle*3*3)+2] = meshInfo.vertexVec.get((tp.get(j)*stride)+2+offset);
                                if ((j&1) ==0)
                                {
                                    positions[(triangle*3*3)+3] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+offset);
                                    positions[(triangle*3*3)+4] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+1+offset);
                                    positions[(triangle*3*3)+5] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+2+offset);
                                    
                                    positions[(triangle*3*3)+6] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+offset);
                                    positions[(triangle*3*3)+7] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+1+offset);
                                    positions[(triangle*3*3)+8] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+2+offset);
                                } else
                                {
                                    positions[(triangle*3*3)+6] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+offset);
                                    positions[(triangle*3*3)+7] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+1+offset);
                                    positions[(triangle*3*3)+8] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+2+offset);
                                    
                                    positions[(triangle*3*3)+3] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+offset);
                                    positions[(triangle*3*3)+4] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+1+offset);
                                    positions[(triangle*3*3)+5] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+2+offset);
                                }
                            

                                if (normalOffset >= 0)
                                {
                                    normals[triangle*3*3] = meshInfo.vertexVec.get((tp.get(j)*stride) + normalOffset);
                                    normals[(triangle*3*3)+1] = meshInfo.vertexVec.get((tp.get(j)*stride)+1+normalOffset);
                                    normals[(triangle*3*3)+2] = meshInfo.vertexVec.get((tp.get(j)*stride)+2+normalOffset);
                                    if ((j&1) == 0)
                                    {
                                        normals[(triangle*3*3)+3] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+normalOffset);
                                        normals[(triangle*3*3)+4] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+1+normalOffset);
                                        normals[(triangle*3*3)+5] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+2+normalOffset);
                                        
                                        normals[(triangle*3*3)+6] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+normalOffset);
                                        normals[(triangle*3*3)+7] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+1+normalOffset);
                                        normals[(triangle*3*3)+8] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+2+normalOffset);
                                    } else
                                    {
                                        normals[(triangle*3*3)+6] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+normalOffset);
                                        normals[(triangle*3*3)+7] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+1+normalOffset);
                                        normals[(triangle*3*3)+8] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+2+normalOffset);
                                        
                                        normals[(triangle*3*3)+3] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+normalOffset);
                                        normals[(triangle*3*3)+4] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+1+normalOffset);
                                        normals[(triangle*3*3)+5] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+2+normalOffset);
                                    }
                                }
                            }
                            tp.delete();
                        }
                    }

                    var numTriFans = mesh.GetNumTriFans();
                    //    numTriFans = 0;
                    if (numTriFans)
                    {
                        for (var i =0; i< numTriFans; i++)
                        {
                            var tp = mesh.GetTriFan(i);
                            var numTriangles = tp.size()-2;
                            for (var j = 0; j< numTriangles; j++, triangle++)
                            {
                                positions[triangle*3*3] = meshInfo.vertexVec.get((tp.get(0)*stride)+offset);
                                positions[(triangle*3*3)+1] = meshInfo.vertexVec.get((tp.get(0)*stride)+1+offset);
                                positions[(triangle*3*3)+2] = meshInfo.vertexVec.get((tp.get(0)*stride)+2+offset);

                                positions[(triangle*3*3)+3] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+offset);
                                positions[(triangle*3*3)+4] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+1+offset);
                                positions[(triangle*3*3)+5] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+2+offset);

                                positions[(triangle*3*3)+6] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+offset);
                                positions[(triangle*3*3)+7] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+1+offset);
                                positions[(triangle*3*3)+8] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+2+offset);
                                if (normalOffset >= 0)
                                {
                                    normals[triangle*3*3] = meshInfo.vertexVec.get((tp.get(1)*stride)+normalOffset);
                                    normals[(triangle*3*3)+1] = meshInfo.vertexVec.get((tp.get(1)*stride)+1+normalOffset);
                                    normals[(triangle*3*3)+2] = meshInfo.vertexVec.get((tp.get(1)*stride)+2+normalOffset);
                                    
                                    normals[(triangle*3*3)+3] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+normalOffset);
                                    normals[(triangle*3*3)+4] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+1+normalOffset);
                                    normals[(triangle*3*3)+5] = meshInfo.vertexVec.get((tp.get(j+1)*stride)+2+normalOffset);
                                    
                                    normals[(triangle*3*3)+6] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+normalOffset);
                                    normals[(triangle*3*3)+7] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+1+normalOffset);
                                    normals[(triangle*3*3)+8] = meshInfo.vertexVec.get((tp.get(j+2)*stride)+2+normalOffset);
                                }
                            }
                            tp.delete();
                        }
                    }
                    var numTriangleLists = mesh.GetNumTriangleLists();
                    if (numTriangleLists)
                    {
                        for (var i =0; i< numTriangleLists; i++)
                        {
                            var tp = mesh.GetTriangles(i);
                            var numTriangles = tp.size()/3;
                            for (var j = 0; j< numTriangles; j++, triangle++)
                            {
                                positions[triangle*3*3] = meshInfo.vertexVec.get((tp.get(j*3)*stride)+offset);
                                positions[(triangle*3*3)+1] = meshInfo.vertexVec.get((tp.get(j*3)*stride)+1+offset);
                                positions[(triangle*3*3)+2] = meshInfo.vertexVec.get((tp.get(j*3)*stride)+2+offset);

                                positions[(triangle*3*3)+3] = meshInfo.vertexVec.get((tp.get((j*3)+1)*stride)+offset);
                                positions[(triangle*3*3)+4] = meshInfo.vertexVec.get((tp.get((j*3)+1)*stride)+1+offset);
                                positions[(triangle*3*3)+5] = meshInfo.vertexVec.get((tp.get((j*3)+1)*stride)+2+offset);

                                positions[(triangle*3*3)+6] = meshInfo.vertexVec.get((tp.get((j*3)+2)*stride)+offset);
                                positions[(triangle*3*3)+7] = meshInfo.vertexVec.get((tp.get((j*3)+2)*stride)+1+offset);
                                positions[(triangle*3*3)+8] = meshInfo.vertexVec.get((tp.get((j*3)+2)*stride)+2+offset);
                                if (normalOffset >= 0)
                                {
                                    normals[triangle*3*3] = meshInfo.vertexVec.get((tp.get(j*3)*stride)+normalOffset);
                                    normals[(triangle*3*3)+1] = meshInfo.vertexVec.get((tp.get(j*3)*stride)+1+normalOffset);
                                    normals[(triangle*3*3)+2] = meshInfo.vertexVec.get((tp.get(j*3)*stride)+2+normalOffset);
                                    
                                    normals[(triangle*3*3)+3] = meshInfo.vertexVec.get((tp.get((j*3)+1)*stride)+normalOffset);
                                    normals[(triangle*3*3)+4] = meshInfo.vertexVec.get((tp.get((j*3)+1)*stride)+1+normalOffset);
                                    normals[(triangle*3*3)+5] = meshInfo.vertexVec.get((tp.get((j*3)+1)*stride)+2+normalOffset);
                                    
                                    normals[(triangle*3*3)+6] = meshInfo.vertexVec.get((tp.get((j*3)+2)*stride)+normalOffset);
                                    normals[(triangle*3*3)+7] = meshInfo.vertexVec.get((tp.get((j*3)+2)*stride)+1+normalOffset);
                                    normals[(triangle*3*3)+8] = meshInfo.vertexVec.get((tp.get((j*3)+2)*stride)+2+normalOffset);
                                }
                            }
                            tp.delete();
                        }
                    }
                    return triangle;
                }
            });
        }
    }
    
})();
"use strict";

var Module = {
    'locateFile': function (name) {
        return ThingLoad.modulePath + name;
    },
    '_main': function () {
        console.log("js main");
        if (!(ThingLoad.initCB == undefined)) {
            ThingLoad._completeInit();
            ThingLoad.initCB();
        }
        // initLoader();
    }
}

var ThingLoad = (function () {

    var id = 0;
    var thingload;
    var isUpdated = false;
    var _currentSession = null;
    var s_fileversion = "10.3.999.2112";
    var s_productversion = "0.1.0-ci+65535";
    var s_productname = "ThingView 0.1";

    var returnObj = {
        init: function (path, initCB) {
            ThingLoad.initCB = initCB;
            var head = document.getElementsByTagName('head').item(0);
            var id = document.createElement("SCRIPT");
            var loaderLib;
            if (path) {
                loaderLib = path + "/libthingload.js";
                ThingLoad.modulePath = path + "/";
            }
            else
                loaderLib = "libthingload.js";

            id.src = loaderLib;
            head.appendChild(id);

        },
        GetVersion: function() {
            return s_version;
        },

        _completeInit: function () {
            thingload = Module.ThingLoad.GetThingLoad();
            requestAnimationFrame(_DoRender);
        },

        LoadImage: function (imagename) {
            thingload.LoadImage(imagename);
        },
        CreateSession: function() {
            return _createSession();
        },
        DeleteSession: function(session) {
            _deleteSession(session);
        },
    };
    return returnObj;// End of public functions

    function _DoRender(timeStamp) {
        var doRender = true;
        try
        {
            thingload.DoRender(timeStamp);
        } catch (err)
        {
            console.log("Javascript caught exception "+ err);
            doRender = false;
        }
        if (doRender)
            requestAnimationFrame(_DoRender);
    }

    function _createSession() 
    {
        _currentSession = thingload.CreateSession();
        return _currentSession;
    }


    function _deleteSession(session) {
        if (_currentSession == session) {
            _currentSession = null;
        }
        session.delete();
    }

})();





