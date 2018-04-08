/**
 * @author Petrisor Lacatus / placatus@ptc.com /
 * 
 * Loader for multiple model types and formats
 */

abstract class ModelLoader {
    protected url: string;
    protected texturePath: string;
    
    
    constructor(url: string, texturePath: string) {
        this.url = url;
        this.texturePath = texturePath;
    }

    /**
     * Loads given file and fires callback when done
     */
    public abstract load(): Promise<THREE.Object3D>;
}

export class DefaultLoader extends ModelLoader {
    public load(): Promise<THREE.Object3D> {
        throw new Error("Model not recognized");
    }
}

export class MfLoader extends ModelLoader {
    public async load(): Promise<THREE.Object3D> {
        let loader = await import('../../node_modules/three-full/sources/loaders/3MFLoader');
        return new Promise<THREE.Object3D>((resolve) => {
            new loader.ThreeMFLoader().load(this.url, (model: THREE.Object3D) => {
                resolve(model);
            })
        });
    }
}

export class TdsLoader extends ModelLoader {
    public async load(): Promise<THREE.Object3D> {
        let loader = await import('../../node_modules/three-full/sources/loaders/TDSLoader');
        return new Promise<THREE.Object3D>((resolve) => {
            new loader.TDSLoader().load(this.url, (model: THREE.Object3D) => {
                resolve(model);
            })
        });
    }
}

export class AmfLoader extends ModelLoader {
    public async load(): Promise<THREE.Object3D> {
        let loader = await import('../../node_modules/three-full/sources/loaders/AMFLoader');
        return new Promise<THREE.Object3D>((resolve) => {
            new loader.AMFLoader().load(this.url, (model: THREE.Object3D) => {
                resolve(model);
            })
        });
    }
}

interface ModelLoaderConstructor {
    new(url, texturePath): ModelLoader;
}

export class ModelLoaderFactory {
    private static mapping: { [name: string]: ModelLoaderConstructor } = {
        "3mf": MfLoader,
        "3ds": TdsLoader,
        "tds": TdsLoader,
        "amf": AmfLoader
    }

    static getRenderer(modelType): ModelLoaderConstructor {
        if (this.mapping[modelType]) {
            return this.mapping[modelType];
        } else {
            return this.mapping["default"];
        }
    }
}
