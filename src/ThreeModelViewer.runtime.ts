/// <reference path="three_renderer/ModelRenderer.ts" />

import { ThingworxRuntimeWidget, TWService, TWProperty } from 'typescriptwebpacksupport'
import { ModelRenderer, RendererOptions, PositionOptions } from './three_renderer/ModelRenderer';

@ThingworxRuntimeWidget
export class ThreeModelViewer extends TWRuntimeWidget {
    updateProperty(info: TWUpdatePropertyInfo): void {
        this.setProperty(info.TargetProperty, info.SinglePropertyValue);
        switch (info.TargetProperty) {
            case "ModelYOffset":
            case "Quaternion":
            case "Rotation X":
            case "Rotation Y":
            case "Rotation Z":
                this.modelRenderer.applyPositionChanges(this.widgetPositionPropertiesToOptions());
                break;
            default:
                break;
        }
    }
    /**
     * Main renderer taking care of displaying the model
     */
    modelRenderer: ModelRenderer;

    renderHtml(): string {
        return '<div class="widget-content widget-ThreeModelViewer"><div class="spinner"></div><div class="inset"></div><div class="stats"></div></div>';
    };

    @TWProperty("ModelUrl")
    set modelUrl(value: string) {
        this.modelRenderer.loadModel(value, this.getProperty("ModelType"), this.getProperty("TexturePath"), true);
    };

    private afterRenderResolve: (() => void);

    /**
     * Promise that resolves one the widget has been fully initialized 
     * and THREE has been exported on window
     */
    afterRendered = new Promise($0 => this.afterRenderResolve = $0);

    async afterRender(): Promise<void> {
        require("./styles/ThreeModelViewer.runtime.css");
        // put THREE on window as it's required for the rest of the js in examples
        let threeLoader = await import('three');
        window["THREE"] = threeLoader;
        let renderer = await import('./three_renderer/ModelRenderer');
        this.modelRenderer = new renderer.ModelRenderer(this.jqElement[0], this.widgetPropertiesToOptions());
        this.modelRenderer.applyPositionChanges(this.widgetPositionPropertiesToOptions());
        this.modelRenderer.render();
        // load the initial model, if set
        if (this.getProperty("ModelUrl")) {
            this.modelUrl = this.getProperty("ModelUrl");
        }
        this.afterRenderResolve();
    }

    widgetPropertiesToOptions(): RendererOptions {
        let backgroundStyle = TW.getStyleFromStyleDefinition(this.getProperty('BackgroundStyle', ''));
        let backgroundColor = backgroundStyle.backgroundColor ? backgroundStyle.backgroundColor : "rgba(255,255,255,0)";

        return {
            controls: {
                cameraAutoRotate: this.getProperty("CameraAutoRotate"),
                cameraControls: this.getProperty("CameraControls"),
                enableSelection: this.getProperty("EnableSelection"),
                transformControls: this.getProperty("TransformControls")
            },
            helpers: {
                drawAxesHelpers: this.getProperty("DrawAxisHelpers"),
                drawGridHelpers: this.getProperty("DrawGridHelpers"),
                showDataLoading: this.getProperty("ShowDataLoading"),
                showStats: this.getProperty("ShowStats")
            },
            style: {
                backgroundColor: backgroundColor,
                lightIntensity: this.getProperty("LightIntensity"),
                selectedMaterial: 'rgb(0,217,255)',
                addLightsToSceneFiles: this.getProperty("AddLightsToSceneFiles")
            },
            callbacks: {
                loadedSucessful: () => {
                    this.jqElement.triggerHandler("LoadDone");
                },
                loadingError: () => {
                    this.jqElement.triggerHandler("LoadError");
                },
                selectedItemChanged: (item, name) => {
                    this.setProperty("SelectedItem", item);
                    this.setProperty("SelectedItemName", name);
                }
            },
            misc: {
                resetSceneOnModelChange: this.getProperty("ResetSceneOnModelChange"),
                tweenInterval: this.getProperty("TweenInterval"),
                enableQuaternionRotation: this.getProperty("EnableQuaternionRotation")
            }
        }
    }

    widgetPositionPropertiesToOptions(): PositionOptions {
        return {
            modelYOffset: parseFloat(this.getProperty("ModelYOffset")),
            rotationX: parseFloat(this.getProperty("Rotation Y")), // this are swapped for historical reasons
            rotationY: parseFloat(this.getProperty("Rotation X")),
            rotationZ: parseFloat(this.getProperty("Rotation Z")),
            quaternion: this.getProperty("Quaternion")
        }
    }

    handleSelectionUpdate?(property: string, selectedRows: any[], selectedRowIndices: number[]): void {
        switch (property) {
            // one handle single selection
            case "SceneTree":
                if (selectedRows.length > 0) {
                    // find the object that has this id
                    //  var selectedObject = scene.getObjectById(selectedRows[0].id);
                    //selectedObject.oldMaterial = selectedObject.material;
                    // selectedObject.material = selMaterial;
                }
                break;

            default:
                break;
        }
    }

    serviceInvoked(name: string): void {
        throw new Error("Method not implemented.");
    }
    beforeDestroy?(): void {
        if (this.modelRenderer) {
            this.modelRenderer.stopRendering();
        }
    }
}