TW.IDE.Widgets.ThreeModelViewer = function() {

    this.widgetIconUrl = function() {
        return "../Common/extensions/ThreeModelViewer_ExtensionPackage/ui/ThreeModelViewer/ThreeModelViewer.png";
    };
    this.widgetProperties = function() {
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
                /*
                                'Pitch': {
                                    'description': 'Pitch of the Model',
                                    'baseType': 'NUMBER',
                                    'isVisible': true,
                                    'defaultValue': 0.0,
                                    'isBindingTarget': true
                                },
                                'Roll': {
                                    'description': 'Roll of the Model',
                                    'baseType': 'NUMBER',
                                    'isVisible': true,
                                    'defaultValue': 0.0,
                                    'isBindingTarget': true
                                },
                                'Heading': {
                                    'description': 'Heading of the Model',
                                    'baseType': 'NUMBER',
                                    'isVisible': true,
                                    'defaultValue': 0.0,
                                    'isBindingTarget': true
                                },*/
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
                'SelectedItem': {
                    'description': 'The id currently selected item in the scene',
                    'baseType': 'INTEGER',
                    'isVisible': true,
                    'defaultValue': false,
                    'isBindingSource': true
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
                'BackgroundStyle': {
                    'baseType': 'STYLEDEFINITION',
                    'defaultValue': '',
                    'description': 'The background of the widget. Opacity is supported'
                }
                // add any additional properties here
            }
        };
    };

    this.renderHtml = function() {
        return '<div class="widget-content widget-model-viewer"></div>';
    };
};