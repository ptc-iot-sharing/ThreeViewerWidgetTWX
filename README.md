# Three Model Viewer

## Usage

The ThreeModelViewer widget is based on [three.js](http://threejs.org/) and is capable of displaying 3D models in various formats inside a Thingworx mashup. For a list of all the supported formats, please look at _CompatibleModels.ods_ file.

### How to get set up

* To build the importable zip extension run the `npm install`. Then you are able to use commands like `npm run build`, or `npm run upload` to build or upload the widget. For more details about he build process see [demoWebpackWidget](http://roicentersvn/placatus/DemoWebpackWidget).
* Use the *Three Model Viewer* widget in a mashup
* On the widgets, configure them according to the documentation

### Developing

You can easily change what happens when a model is loaded. By default, it is either added to the scene *this.addObjectCommand* or it is a scene so it's just rendered *this.setSceneCommand*. So you can pass a callback to the Loader.loadFile that specifies what is happened after the file is loaded.

#This Extension is provided as-is and without warranty or support. It is not part of the PTC product suite. This project is licensed under the terms of the MIT license
