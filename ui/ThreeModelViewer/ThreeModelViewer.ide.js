TW.IDE.Widgets.ThreeModelViewer = function () {

    this.widgetIconUrl = function () {
        return "../Common/extensions/ThreeModelViewer_ExtensionPackage/ui/ThreeModelViewer/ThreeModelViewer.png";
    };
    this.widgetProperties = function () {
        return {
            'name': 'Three Model Viewer',
            'description': 'Three Js based 3d Model viewr',
            'category': ['Common'],
            'iconImage': 'ThreeModelViewer.png',
            'isExtension': true,
            'supportsAutoResize': true,
            'isResizable': true,
            'properties': {
                'Width': {
                    'description': 'Total width of the widget',
                    'baseType': 'NUMBER',
                    'isVisible': true,
                    'defaultValue': 640,
                    'isBindingTarget': false
                },
                'Height': {
                    'description': 'Total height of the widget',
                    'baseType': 'NUMBER',
                    'isVisible': true,
                    'defaultValue': 800,
                    'isBindingTarget': false
                },
                'ModelUrl': {
                    'description': 'URL to the model',
                    'baseType': 'STRING',
                    'isVisible': true,
                    'defaultValue': 0.0,
                    'isBindingTarget': true
                },
                'ModelType': {
                    'description': 'Type of the model. If Auto-detect use the file extension',
                    'baseType': 'STRING',
                    'isVisible': true,
                    'defaultValue': 'Auto-Detect',
                    'isBindingTarget': true,
                    'selectOptions': [{
                        value: 'Auto-Detect',
                        text: 'Auto-Detect'
                    }, {
                        value: 'dae',
                        text: 'Collada'
                    }, {
                        value: '3mf',
                        text: '3mf'
                    }, {
                        value: 'amf',
                        text: 'amf'
                    }, {
                        value: 'awd',
                        text: 'awd'
                    }, {
                        value: 'babylon',
                        text: 'babylon'
                    }, {
                        value: 'ctm',
                        text: 'ctm'
                    }, {
                        value: 'fbx',
                        text: 'fbx'
                    }, {
                        value: 'gltf',
                        text: 'gltf'
                    }, {
                        value: 'json',
                        text: 'json'
                    }, {
                        value: 'md2',
                        text: 'md2'
                    }, {
                        value: 'obj',
                        text: 'obj'
                    }, {
                        value: 'ply',
                        text: 'ply'
                    }, {
                        value: 'stl',
                        text: 'stl'
                    }, {
                        value: 'gltf',
                        text: 'gltf'
                    }, {
                        value: 'vtk',
                        text: 'vtk'
                    }, {
                        value: 'wrl',
                        text: 'wrl'
                    }, {
                        value: 'gltf',
                        text: 'gltf'
                    }, {
                        value: 'assimpjson',
                        text: 'assimpjson'
                    }, {
                        value: 'sea',
                        text: 'sea'
                    },{
                        value: 'x',
                        text: 'x'
                    }, {
                        value: 'pvz',
                        text: 'pvz'
                    }, {
                        value: 'ol',
                        text: 'ol'
                    }, {
                        value: 'pvt',
                        text: 'ol'
                    }]
                },
                'DrawAxisHelpers': {
                    'description': 'Draw Axis Helpers to visualize the the 3 axes in a simple way. The X axis is red. The Y axis is green. The Z axis is blue ',
                    'baseType': 'BOOLEAN',
                    'isVisible': true,
                    'defaultValue': true,
                    'isBindingTarget': true
                },
                'DrawGridHelpers': {
                    'description': 'Draw Grid Helpers on the ground',
                    'baseType': 'BOOLEAN',
                    'isVisible': true,
                    'defaultValue': true,
                    'isBindingTarget': true
                },
                'ResetSceneOnModelChange': {
                    'description': 'Reset the scene whenever the model changes',
                    'baseType': 'BOOLEAN',
                    'isVisible': true,
                    'defaultValue': true,
                    'isBindingTarget': true
                },
                'AddLightsToSceneFiles': {
                    'description': 'When loading scene files, add the default lights',
                    'baseType': 'BOOLEAN',
                    'isVisible': true,
                    'defaultValue': true,
                    'isBindingTarget': true
                },
                'CameraControls': {
                    'description': 'Enable controlling the camera',
                    'baseType': 'BOOLEAN',
                    'isVisible': true,
                    'defaultValue': true,
                    'isBindingTarget': true
                },
                'CameraAutoRotate': {
                    'description': 'Set to true to automatically rotate around the target',
                    'baseType': 'BOOLEAN',
                    'isVisible': true,
                    'defaultValue': false,
                    'isBindingTarget': true
                },
                'EnableSelection': {
                    'description': 'Enable selection of child elements in the scene',
                    'baseType': 'BOOLEAN',
                    'isVisible': true,
                    'defaultValue': false,
                    'isBindingTarget': true
                },
                'ShowStats': {
                    'description': 'Show render statistics (FPS, memory, CPU)',
                    'baseType': 'BOOLEAN',
                    'isVisible': true,
                    'defaultValue': false,
                    'isBindingTarget': true
                },
                'LightIntensity': {
                    'description': 'The intensity of the light. Use a value between 0 and 1',
                    'baseType': 'NUMBER',
                    'isVisible': true,
                    'defaultValue': 0.8,
                    'isBindingTarget': true
                },
                'SceneTree': {
                    'description': 'A tree of all the elements in the scene',
                    'baseType': 'INFOTABLE',
                    'isVisible': true,
                    'isBindingSource': true
                },
                'SelectedItem': {
                    'description': 'The id currently selected item in the scene',
                    'baseType': 'STRING',
                    'isVisible': true,
                    'defaultValue': false,
                    'isBindingSource': true,
                    'isBindingTarget': true
                },
                'SelectedItemName': {
                    'description': 'The name currently selected item in the scene',
                    'baseType': 'STRING',
                    'isVisible': true,
                    'defaultValue': false,
                    'isBindingSource': true
                },
                'TexturePath': {
                    'description': 'If textures are requested, what is the path to get them. If null, defaults to the folder where the scene is stored.',
                    'baseType': 'STRING',
                    'isVisible': true,
                    'defaultValue': false,
                    'isBindingTarget': true
                },
                'Rotation Z': {
                    'description': 'Rotation along the X axis of the Model',
                    'baseType': 'NUMBER',
                    'isVisible': true,
                    'defaultValue': 0.0,
                    'isBindingTarget': true
                },
                'Rotation Y': {
                    'description': 'Rotation along the Y axis of the Model',
                    'baseType': 'NUMBER',
                    'isVisible': true,
                    'defaultValue': 0.0,
                    'isBindingTarget': true
                },
                'Rotation X': {
                    'description': 'Rotation along the Z axis of the Model',
                    'baseType': 'NUMBER',
                    'isVisible': true,
                    'defaultValue': 0.0,
                    'isBindingTarget': true
                },
                'TweenInterval': {
                    'description': 'In miliseconds, how long should the rotation animation last',
                    'baseType': 'NUMBER',
                    'isVisible': true,
                    'defaultValue': 500.0,
                    'isBindingTarget': true
                },
                'Quaternion': {
                    'description': 'Rotation Quaternion for the model. Represented as comma sepparated X,Y,Z,W',
                    'baseType': 'STRING',
                    'isVisible': true,
                    'defaultValue': 0.0,
                    'isBindingTarget': true
                },
                'ModelYOffset': {
                    'description': 'Positions the model on a Y offset vs the grid',
                    'baseType': 'NUMBER',
                    'isVisible': true,
                    'defaultValue': 0.0,
                    'isBindingTarget': true
                },
                'EnableQuaternionRotation': {
                    'description': 'Use Quaternions for rotation rather than eulers',
                    'baseType': 'BOOLEAN',
                    'isVisible': true,
                    'defaultValue': false,
                    'isBindingTarget': true
                },
                'BackgroundStyle': {
                    'baseType': 'STYLEDEFINITION',
                    'defaultValue': '',
                    'description': 'The background of the widget. Opacity is supported'
                }
                // add any additional properties here
            }
        };
    };

    this.renderHtml = function () {
        return '<div class="widget-content widget-model-viewer"></div>';
    };

    this.widgetEvents = function () {
        return {
            'LoadDone': {
                'warnIfNotBound': false
            },
            'LoadError': {
                'warnIfNotBound': false
            }
        };
    };

    this.getSourceDatashapeName = function (propertyName) {
        switch (propertyName) {
            case "SceneTree":
                return {
                    "name": {
                        "name": "name",
                        "baseType": "STRING"
                    },
                    "id": {
                        "name": "id",
                        "baseType": "STRING"
                    },
                    "parentId": {
                        "name": "parentId",
                        "baseType": "STRING"
                    }
                };
            default:
                break;
        }
    };
};