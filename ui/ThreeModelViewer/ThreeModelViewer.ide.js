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
                },
                'ModelUrl': {
                    'description': 'URL to the model',
                    'baseType': 'STRING',
                    'isVisible': true,
                    'defaultValue': 0.0,
                    'isBindingTarget': true
                },
                'ModelType': {
                    'description': 'Type of the model (filename)',
                    'baseType': 'STRING',
                    'isVisible': true,
                    'defaultValue': 0.0,
                    'isBindingTarget': true
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
                'BackgroundStyle': {
                    'baseType': 'STYLEDEFINITION',
                    'defaultValue': '',
                    'description': 'The background, foreground and text size of the widget'
                }
                // add any additional properties here
            }
        };
    };

    this.renderHtml = function() {
        return '<div class="widget-content widget-model-viewer"></div>';
    };
};