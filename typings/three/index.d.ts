import * as DTTHREE from 'three';

declare module "THREE" {
    class AbstractLoader {

        constructor(manager?: DTTHREE.LoadingManager);

        load(url: string, onLoad: (group: any) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void;
        parse(data: string): DTTHREE.Group;

    }
    export class ThreeMFLoader extends AbstractLoader { }
    export class TDSLoader extends AbstractLoader { }
    export class AMFLoader extends AbstractLoader { }
    export class AssimpJSONLoader extends AbstractLoader { }
    export class AssimpLoader extends AbstractLoader { }
    export class AWDLoader extends AbstractLoader { }
    export class BabylonLoader extends AbstractLoader { }
    export class GCodeLoader extends AbstractLoader { }
    export class ColladaLoader extends AbstractLoader { }
    export class FBXLoader extends AbstractLoader { }
    export class GLTFLoader extends AbstractLoader { }
    export class LegacyGLTFLoader extends AbstractLoader { }
    export class KMZLoader extends AbstractLoader { }
    export class MD2Loader extends AbstractLoader { }
    export class PlayCanvasLoader extends AbstractLoader { }
    export class PLYLoader extends AbstractLoader { }
    export class PRWMLoader extends AbstractLoader { }
    export class VTKLoader extends AbstractLoader { }
    export class VRMLLoader extends AbstractLoader { }

}