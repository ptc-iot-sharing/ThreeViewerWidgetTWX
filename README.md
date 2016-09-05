# README #

### What is this repository for? ###

 The Three Model Viewer allows to view 3D models in the thingworx Mashups. A wide range of 3d model formats are supported.

 There are two branches on this repo:
 - The *master* branch contains compatibility with the Creo View formats (pvz, pvt, ol). This is not intended for marketplace release.
 - The *marketplace* branch removes that compatibility and is the one intended for marketplace release. 

### How do I get set up? ###

* To build the importable zip extension run the gradle task **packageExtension**. 
* Install the extension archive "zip/ThreeModelViewer_ExtensionPackage.zip" using the Extension import tool from ThingWorx.
* Use the *Three Model Viewer* widget in a mashup
* On the widgets, configure them according to the documentation

### Developing ###

You can easily change what happens when a model is loaded. By default, it is either added to the scene *this.addObjectCommand* or it is a scene so it's just rendered *this.setSceneCommand*. So you can pass a callback to the Loader.loadFile that specifies what is happened after the file is loaded.